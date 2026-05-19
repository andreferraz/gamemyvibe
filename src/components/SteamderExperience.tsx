"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameResponse } from "../app/api/igdb/types";
import styles from "../app/page.module.css";
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

export function SteamderExperience({
  discoveryGames,
  candidateGames,
}: SteamderExperienceProps) {
  const [currentDiscoveryIndex, setCurrentDiscoveryIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);

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
        onNoInterest={() => registerPreference(WEIGHTS.noInterest)}
        onLike={() => registerPreference(WEIGHTS.like)}
        onLove={() => registerPreference(WEIGHTS.love)}
      />
      <RecommendationPanel games={recommendations} />
    </section>
  );
}
