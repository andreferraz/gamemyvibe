"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameResponse } from "../app/api/igdb/types";
import styles from "../app/page.module.css";
import {
  getCandidateEmbeddingCount,
  preVectorizeCandidateGames,
} from "../utils/candidateEmbeddings";
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
  const [currentDiscoveryIndex, setCurrentDiscoveryIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCandidatesReady, setIsCandidatesReady] = useState(false);

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

  const recommendations: RecommendedGame[] = useMemo(
    () =>
      candidateGames.slice(0, 8).map((game, index) => ({
        ...game,
        similarity: Math.max(58, 94 - index * 5),
      })),
    [candidateGames],
  );

  function registerPreference(weight: number) {
    if (!activeDiscoveryGame) {
      return;
    }

    setUserPreferences((currentPreferences) => [
      ...currentPreferences,
      {
        gameId: activeDiscoveryGame.id,
        descriptionEmbedding: null,
        weight,
      },
    ]);

    setCurrentDiscoveryIndex((currentIndex) => {
      if (currentIndex >= discoveryGames.length) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  }

  return (
    <section className={styles.splitGrid}>
      <DiscoveryPanel
        game={activeDiscoveryGame}
        interactionsCount={userPreferences.length}
        isModelReady={isModelReady}
        isCandidatesReady={isCandidatesReady}
        onNoInterest={() => registerPreference(WEIGHTS.noInterest)}
        onLike={() => registerPreference(WEIGHTS.like)}
        onLove={() => registerPreference(WEIGHTS.love)}
      />
      <RecommendationPanel games={recommendations} />
    </section>
  );
}
