"use client";

import { Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormattedGameObject } from "@/app/api/json/types";
import {
  getCandidateEmbedding,
  preVectorizeCandidateGames,
} from "@/utils/candidateEmbeddings";
import { rankByCosineSimilarity } from "@/utils/profileInference";
import {
  embedText,
  loadUniversalSentenceEncoder,
} from "@/utils/universalSentenceEncoder";
import styles from "../app/page.module.css";
import { DescribeResultsList } from "./DescribeResultsList";
import type { RankedGame } from "./RecommendationPanel";

interface DescribeExperienceProps {
  candidateGames: FormattedGameObject[];
}

export function DescribeExperience({
  candidateGames,
}: DescribeExperienceProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedGame[]>([]);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCandidatesReady, setIsCandidatesReady] = useState(false);
  const [isSearching, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    loadUniversalSentenceEncoder()
      .then((model) => {
        if (!isMounted) {
          return;
        }

        setIsModelReady(true);
        return preVectorizeCandidateGames(model, candidateGames);
      })
      .then(() => {
        if (isMounted) {
          setIsCandidatesReady(true);
        }
      })
      .catch((error) => {
        console.error("Error preparing describe experience:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [candidateGames]);

  const isReady = isModelReady && isCandidatesReady;

  const placeholder = useMemo(
    () =>
      isReady
        ? "Ex: metroidvania com tematica medieval e pixel art"
        : "Carregando modelo...",
    [isReady],
  );

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || !isReady) {
      return;
    }

    const model = await loadUniversalSentenceEncoder();

    startTransition(async () => {
      try {
        const queryEmbedding = await embedText(model, trimmedQuery);
        const rankedCandidates = candidateGames
          .map((game) => {
            const embedding = getCandidateEmbedding(game.id);
            return embedding ? { item: game, embedding } : null;
          })
          .filter(
            (
              candidate,
            ): candidate is {
              item: FormattedGameObject;
              embedding: number[];
            } => Boolean(candidate),
          );

        const rankedResults = rankByCosineSimilarity(
          queryEmbedding,
          rankedCandidates,
          5,
        );

        setResults(
          rankedResults.map((result) => ({
            ...result.item,
            similarity: result.similarity,
          })),
        );
      } catch (error) {
        console.error("Error searching described games:", error);
        setResults([]);
      }
    });
  }

  return (
    <Flex direction="column" gap="4" className={styles.panelCard}>
      <div>
        <Text className={styles.panelEyebrow}>Busca por descricao</Text>
        <Heading size="4" mt="1">
          Descreva o jogo ideal
        </Heading>
      </div>

      <form onSubmit={handleSearch}>
        <Flex direction="column" gap="3">
          <TextField.Root
            size="3"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            disabled={!isReady || isSearching}
          />
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" color="gray">
              {isReady
                ? "Use uma frase livre para guiar a busca."
                : "Carregando Universal Sentence Encoder e catalogo de candidatos..."}
            </Text>
            <Button
              type="submit"
              disabled={!isReady || isSearching || !query.trim()}
            >
              Buscar jogos
            </Button>
          </Flex>
        </Flex>
      </form>

      <DescribeResultsList
        games={results}
        isLoading={!isReady || isSearching}
      />
    </Flex>
  );
}
