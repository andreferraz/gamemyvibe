"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResponse } from "../app/api/igdb/types";
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
  RecommendationPanel,
  type RecommendedGame,
} from "./RecommendationPanel";

export interface UserPreference {
  gameId: number;
  descriptionEmbedding: number[] | null;
  weight: number;
}

interface SteamderExperienceProps {
  discoveryGames: GameResponse[];
  candidateGames: GameResponse[];
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
  const votedGameIdsRef = useRef(new Set<number>());
  const pendingPreferenceGameIdsRef = useRef(new Set<number>());
  const [currentDiscoveryIndex, setCurrentDiscoveryIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [votedGameIds, setVotedGameIds] = useState<Set<number>>(new Set());
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCandidatesReady, setIsCandidatesReady] = useState(false);
  const [profileVector, setProfileVector] = useState<number[] | null>(null);
  const profileSumVectorRef = useRef<number[] | null>(null);
  const profileWeightMagnitudeRef = useRef(0);
  const [recommendations, setRecommendations] = useState<RecommendedGame[]>([]);

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

  useEffect(() => {
    if (recommendations.length > 0) {
      return;
    }

    setRecommendations(
      candidateGames.slice(0, 8).map((game) => ({
        ...game,
        similarity: 0,
      })),
    );
  }, [candidateGames, recommendations.length]);

  const refreshRecommendations = useMemo(
    () => (nextProfileVector: number[]) => {
      if (!isCandidatesReady || nextProfileVector.length === 0) {
        return;
      }

      const rankedCandidates = rankByCosineSimilarity(
        nextProfileVector,
        candidateGames
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
        8,
      );

      setRecommendations(
        rankedCandidates.map((result) => ({
          ...result.item,
          similarity: result.similarity,
        })),
      );
    },
    [candidateGames, isCandidatesReady],
  );

  async function getGameEmbedding(game: GameResponse) {
    const cachedCandidateEmbedding = getCandidateEmbedding(game.id);

    if (cachedCandidateEmbedding) {
      return cachedCandidateEmbedding;
    }

    const cachedDiscoveryEmbedding = discoveryEmbeddingCache.current.get(
      game.id,
    );

    if (cachedDiscoveryEmbedding) {
      return cachedDiscoveryEmbedding;
    }

    if (!model) {
      throw new Error("Model not initialized");
    }

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
  }

  async function registerPreference(weight: number) {
    if (!activeDiscoveryGame || !isModelReady) {
      return;
    }

    if (votedGameIdsRef.current.has(activeDiscoveryGame.id)) {
      return;
    }

    if (pendingPreferenceGameIdsRef.current.has(activeDiscoveryGame.id)) {
      return;
    }

    pendingPreferenceGameIdsRef.current.add(activeDiscoveryGame.id);

    try {
      const embedding = await getGameEmbedding(activeDiscoveryGame);
      const nextProfile = applyWeightedPreference(
        profileSumVectorRef.current,
        profileWeightMagnitudeRef.current,
        embedding,
        weight,
      );

      profileSumVectorRef.current = nextProfile.sumVector;
      profileWeightMagnitudeRef.current = nextProfile.weightMagnitude;
      setProfileVector(nextProfile.profileVector);
      refreshRecommendations(nextProfile.profileVector);

      setUserPreferences((currentPreferences) => [
        ...currentPreferences,
        {
          gameId: activeDiscoveryGame.id,
          descriptionEmbedding: embedding,
          weight,
        },
      ]);

      votedGameIdsRef.current.add(activeDiscoveryGame.id);
      setVotedGameIds(new Set(votedGameIdsRef.current));
    } catch (error) {
      console.error("On-click inference failed:", error);
      return;
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

  return (
    <section className={styles.splitGrid}>
      <DiscoveryPanel
        game={activeDiscoveryGame}
        interactionsCount={userPreferences.length}
        votedGamesCount={votedGameIds.size}
        isModelReady={isModelReady}
        isCandidatesReady={isCandidatesReady}
        profileVectorDimensions={profileVector?.length}
        onNoInterest={() => registerPreference(WEIGHTS.noInterest)}
        onLike={() => registerPreference(WEIGHTS.like)}
        onLove={() => registerPreference(WEIGHTS.love)}
      />
      <RecommendationPanel games={recommendations} />
    </section>
  );
}
