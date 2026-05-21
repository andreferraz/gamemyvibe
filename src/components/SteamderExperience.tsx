"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormattedGameObject } from "@/app/api/json/types";
import styles from "../app/page.module.css";
import {
  getCandidateEmbedding,
  getCandidateEmbeddingCount,
  preVectorizeCandidateGames,
} from "../utils/candidateEmbeddings";
import {
  applyWeightedPreference,
  rankByCosineSimilarity,
} from "../utils/profileInference";
import { loadUniversalSentenceEncoder } from "../utils/universalSentenceEncoder";
import { DiscoveryPanel } from "./DiscoveryPanel";
import {
  type RankedGame,
  type RecommendationGroups,
  RecommendationPanel,
} from "./RecommendationPanel";

export interface UserPreference {
  gameId: number;
  descriptionEmbedding: number[] | null;
  weight: number;
}

interface SteamderExperienceProps {
  discoveryGames: FormattedGameObject[];
  candidateGames: FormattedGameObject[];
}

const WEIGHTS = {
  noInterest: -0.5,
  like: 1.0,
  love: 2.0,
} as const;

let model: Awaited<ReturnType<typeof loadUniversalSentenceEncoder>> | null =
  null;

export function SteamderExperience({
  discoveryGames,
  candidateGames,
}: SteamderExperienceProps) {
  const discoveryEmbeddingCache = useRef(new Map<number, number[]>());
  const isComputingProfileRef = useRef(false);
  const votedGameIdsRef = useRef(new Set<number>());
  const pendingPreferenceGameIdsRef = useRef(new Set<number>());
  const [currentDiscoveryIndex, setCurrentDiscoveryIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [votedGameIds, setVotedGameIds] = useState<Set<number>>(new Set());
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCandidatesReady, setIsCandidatesReady] = useState(false);
  const [profileVector, setProfileVector] = useState<number[] | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [isComputingProfile, setIsComputingProfile] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function initializeModel() {
      try {
        model = await loadUniversalSentenceEncoder();

        if (isActive) {
          setIsModelReady(true);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize Universal Sentence Encoder";
        console.error("USE model initialization failed:", message, error);
      }
    }

    void initializeModel();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isModelReady || candidateGames.length === 0 || !model) {
      return;
    }

    const loadedModel = model;

    let isActive = true;

    async function preVectorizeCandidates() {
      try {
        setIsCandidatesReady(false);
        await preVectorizeCandidateGames(loadedModel, candidateGames);

        if (isActive) {
          setIsCandidatesReady(true);
          console.info("Candidate pre-vectorization complete", {
            count: getCandidateEmbeddingCount(),
          });
        }
      } catch (error) {
        console.error("Candidate pre-vectorization failed:", error);

        if (isActive) {
          setIsCandidatesReady(false);
        }
      }
    }

    void preVectorizeCandidates();

    return () => {
      isActive = false;
    };
  }, [candidateGames, isModelReady]);

  const activeDiscoveryGame = discoveryGames[currentDiscoveryIndex];
  const isDiscoveryComplete = currentDiscoveryIndex >= discoveryGames.length;

  const discoveryGamesById = useMemo(
    () => new Map(discoveryGames.map((game) => [game.id, game])),
    [discoveryGames],
  );

  const likedVotedGameIds = useMemo(
    () =>
      userPreferences
        .filter((preference) => preference.weight > 0)
        .map((preference) => preference.gameId),
    [userPreferences],
  );

  const noInterestVotedGameIds = useMemo(
    () =>
      userPreferences
        .filter((preference) => preference.weight < 0)
        .map((preference) => preference.gameId),
    [userPreferences],
  );

  const likedGenreSignals = useMemo(() => {
    const nextGenres = new Set<string>();

    likedVotedGameIds.forEach((gameId) => {
      const votedGame = discoveryGamesById.get(gameId);

      votedGame?.genres.forEach((genre) => {
        nextGenres.add(genre);
      });
    });

    return nextGenres;
  }, [discoveryGamesById, likedVotedGameIds]);

  const explicitGenreSignals = useMemo(() => {
    const nextGenres = new Set<string>();

    userPreferences.forEach((preference) => {
      const votedGame = discoveryGamesById.get(preference.gameId);

      votedGame?.genres.forEach((genre) => {
        nextGenres.add(genre);
      });
    });

    return nextGenres;
  }, [discoveryGamesById, userPreferences]);

  const rankCandidateGroup = useMemo(
    () =>
      (games: FormattedGameObject[], limit = 8): RankedGame[] => {
        if (
          !isCandidatesReady ||
          !profileVector ||
          profileVector.length === 0
        ) {
          return games.slice(0, limit).map((game) => ({
            ...game,
            similarity: 0,
          }));
        }

        const rankedCandidates = rankByCosineSimilarity(
          profileVector,
          games
            .map((candidateGame) => {
              const embedding = getCandidateEmbedding(candidateGame.id);

              if (!embedding) {
                return null;
              }

              return {
                item: candidateGame,
                embedding,
              };
            })
            .filter((candidate) => candidate !== null),
          limit,
        );

        if (rankedCandidates.length === 0) {
          return games.slice(0, limit).map((game) => ({
            ...game,
            similarity: 0,
          }));
        }

        return rankedCandidates.map((result) => ({
          ...result.item,
          similarity: result.similarity,
        }));
      },
    [isCandidatesReady, profileVector],
  );

  const recommendationGroups = useMemo<RecommendationGroups>(() => {
    if (!isDiscoveryComplete)
      return {
        likedGenreRecommendations: [],
        unseenGenreRecommendations: [],
        likedVotedGames: [],
        noInterestVotedGames: [],
      };

    const votedGameIds = new Set(
      userPreferences.map((preference) => preference.gameId),
    );
    const nonVotedCandidates = candidateGames.filter(
      (candidateGame) => !votedGameIds.has(candidateGame.id),
    );

    const likedGenreCandidates = nonVotedCandidates.filter((candidateGame) =>
      candidateGame.genres.some((genre) => likedGenreSignals.has(genre)),
    );

    const unseenGenreCandidates = nonVotedCandidates.filter((candidateGame) =>
      candidateGame.genres.some(
        (genre) =>
          explicitGenreSignals.has(genre) && !likedGenreSignals.has(genre),
      ),
    );

    return {
      likedGenreRecommendations: rankCandidateGroup(likedGenreCandidates),
      unseenGenreRecommendations: rankCandidateGroup(unseenGenreCandidates),
      likedVotedGames: likedVotedGameIds
        .map((gameId) => discoveryGamesById.get(gameId))
        .filter((game): game is FormattedGameObject => Boolean(game)),
      noInterestVotedGames: noInterestVotedGameIds
        .map((gameId) => discoveryGamesById.get(gameId))
        .filter((game): game is FormattedGameObject => Boolean(game)),
    };
  }, [
    candidateGames,
    discoveryGamesById,
    likedVotedGameIds,
    noInterestVotedGameIds,
    rankCandidateGroup,
    likedGenreSignals,
    explicitGenreSignals,
    userPreferences,
    isDiscoveryComplete,
  ]);

  const getGameEmbedding = useCallback(async (game: FormattedGameObject) => {
    const cachedCandidateEmbedding = getCandidateEmbedding(game.id);
    if (cachedCandidateEmbedding) return cachedCandidateEmbedding;
    const cachedDiscoveryEmbedding = discoveryEmbeddingCache.current.get(
      game.id,
    );
    if (cachedDiscoveryEmbedding) return cachedDiscoveryEmbedding;
    if (!model) throw new Error("Model not initialized");
    const embeddingTensor = await model.embed([
      game.summary?.trim() || game.name,
    ]);
    try {
      const vectors = (await embeddingTensor.array()) as number[][];
      const vector = vectors[0];
      discoveryEmbeddingCache.current.set(game.id, vector);
      return vector;
    } finally {
      embeddingTensor.dispose();
    }
  }, []);

  async function registerPreference(weight: number) {
    if (!activeDiscoveryGame || !isModelReady) return;
    if (votedGameIdsRef.current.has(activeDiscoveryGame.id)) return;
    if (pendingPreferenceGameIdsRef.current.has(activeDiscoveryGame.id)) return;
    pendingPreferenceGameIdsRef.current.add(activeDiscoveryGame.id);
    try {
      setUserPreferences((currentPreferences) => [
        ...currentPreferences,
        {
          gameId: activeDiscoveryGame.id,
          descriptionEmbedding: null, // will be filled in batch after discovery
          weight,
        },
      ]);
      votedGameIdsRef.current.add(activeDiscoveryGame.id);
      setVotedGameIds(new Set(votedGameIdsRef.current));
    } finally {
      pendingPreferenceGameIdsRef.current.delete(activeDiscoveryGame.id);
    }
    requestAnimationFrame(() => {
      setCurrentDiscoveryIndex((currentIndex) => {
        if (currentIndex >= discoveryGames.length) {
          return currentIndex;
        }
        return currentIndex + 1;
      });
    });
  }

  // After discovery, compute all embeddings and profile in one batch
  useEffect(() => {
    if (
      !isDiscoveryComplete ||
      profileReady ||
      !isModelReady ||
      isComputingProfileRef.current
    ) {
      return;
    }

    isComputingProfileRef.current = true;
    setIsComputingProfile(true);

    (async () => {
      try {
        const voted = userPreferences;
        const embeddings: (number[] | null)[] = await Promise.all(
          voted.map(async (pref) => {
            const game = discoveryGamesById.get(pref.gameId);
            if (!game) return null;
            return await getGameEmbedding(game);
          }),
        );

        let sumVector: number[] | null = null;
        let weightMagnitude = 0;
        let profile: number[] | null = null;

        for (let i = 0; i < voted.length; ++i) {
          const embedding = embeddings[i];
          if (!embedding) continue;
          const result = applyWeightedPreference(
            sumVector,
            weightMagnitude,
            embedding,
            voted[i].weight,
          );
          sumVector = result.sumVector;
          weightMagnitude = result.weightMagnitude;
          profile = result.profileVector;
        }

        setUserPreferences((prefs) =>
          prefs.map((pref, i) => ({
            ...pref,
            descriptionEmbedding: embeddings[i],
          })),
        );
        setProfileVector(profile || null);
        setProfileReady(true);
      } catch (error) {
        console.error("Post-discovery batch inference failed:", error);
      } finally {
        isComputingProfileRef.current = false;
        setIsComputingProfile(false);
      }
    })();
  }, [
    isDiscoveryComplete,
    profileReady,
    isModelReady,
    userPreferences,
    discoveryGamesById,
    getGameEmbedding,
  ]);

  const isComputingRecommendations =
    isDiscoveryComplete &&
    (isComputingProfile || !profileReady || !isCandidatesReady);

  return (
    <section className={styles.splitGrid}>
      <DiscoveryPanel
        game={activeDiscoveryGame}
        interactionsCount={userPreferences.length}
        votedGamesCount={votedGameIds.size}
        isModelReady={isModelReady}
        isCandidatesReady={isCandidatesReady}
        profileVectorDimensions={profileVector?.length}
        isDiscoveryComplete={isDiscoveryComplete}
        onNoInterest={() => registerPreference(WEIGHTS.noInterest)}
        onLike={() => registerPreference(WEIGHTS.like)}
        onLove={() => registerPreference(WEIGHTS.love)}
      />
      <RecommendationPanel
        groups={recommendationGroups}
        isDiscoveryComplete={isDiscoveryComplete}
        isComputingResults={isComputingRecommendations}
        pendingVotes={discoveryGames.length - userPreferences.length}
      />
    </section>
  );
}
