import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import type { GameResponse } from "../app/api/igdb/types";
import styles from "../app/page.module.css";

export interface RankedGame extends GameResponse {
  similarity: number;
}

export interface RecommendationGroups {
  likedGenreRecommendations: RankedGame[];
  unseenGenreRecommendations: RankedGame[];
  likedVotedGames: GameResponse[];
  noInterestVotedGames: GameResponse[];
}

interface RecommendationPanelProps {
  groups: RecommendationGroups;
  isDiscoveryComplete: boolean;
  isComputingResults: boolean;
  pendingVotes: number;
}

interface RankedRowsProps {
  games: RankedGame[];
}

function RankedRows({ games }: RankedRowsProps) {
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const previousRowOffsets = useRef(new Map<number, number>());

  useLayoutEffect(() => {
    const nextRowOffsets = new Map<number, number>();

    games.forEach((game) => {
      const rowElement = rowRefs.current.get(game.id);

      if (!rowElement) {
        return;
      }

      const nextOffset = rowElement.getBoundingClientRect().top;
      nextRowOffsets.set(game.id, nextOffset);

      const previousOffset = previousRowOffsets.current.get(game.id);

      if (typeof previousOffset !== "number") {
        rowElement.animate(
          [
            { opacity: 0, transform: "translateY(10px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          {
            duration: 280,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );

        return;
      }

      const delta = previousOffset - nextOffset;

      if (Math.abs(delta) < 1) {
        return;
      }

      rowElement.animate(
        [
          { transform: `translateY(${delta}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: 340,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    });

    previousRowOffsets.current = nextRowOffsets;
  }, [games]);

  if (games.length === 0) {
    return <Text color="gray">Nenhum jogo encontrado para este grupo.</Text>;
  }

  return (
    <Flex direction="column" gap="2">
      {games.map((game, index) => (
        <Flex
          key={game.id}
          justify="between"
          align="center"
          gap="3"
          className={styles.recRow}
          ref={(element) => {
            if (element) {
              rowRefs.current.set(game.id, element);
              return;
            }

            rowRefs.current.delete(game.id);
          }}
        >
          <Flex align="center" gap="3">
            <Text className={styles.rank}>{index + 1}</Text>
            {game.thumbnailUrl || game.coverUrl ? (
              <Box className={styles.recThumbWrap}>
                <Image
                  src={game.thumbnailUrl || game.coverUrl || ""}
                  alt={game.name}
                  fill
                  sizes="52px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            ) : null}
            <div>
              <Text size="3" weight="medium">
                {game.name}
              </Text>
              <Text size="1" color="gray">
                {game.genres.slice(0, 2).join(" • ") || "Sem genero"}
              </Text>
            </div>
          </Flex>
          <Text className={styles.similarity}>{game.similarity}%</Text>
        </Flex>
      ))}
    </Flex>
  );
}

interface VotedRowsProps {
  games: GameResponse[];
}

function VotedRows({ games }: VotedRowsProps) {
  if (games.length === 0) {
    return <Text color="gray">Nenhum voto registrado neste grupo.</Text>;
  }

  return (
    <Flex direction="column" gap="2">
      {games.map((game) => (
        <Flex key={game.id} align="center" gap="3" className={styles.recRow}>
          {game.thumbnailUrl || game.coverUrl ? (
            <Box className={styles.recThumbWrap}>
              <Image
                src={game.thumbnailUrl || game.coverUrl || ""}
                alt={game.name}
                fill
                sizes="52px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ) : null}
          <div>
            <Text size="3" weight="medium">
              {game.name}
            </Text>
            <Text size="1" color="gray">
              {game.genres.slice(0, 2).join(" • ") || "Sem genero"}
            </Text>
          </div>
        </Flex>
      ))}
    </Flex>
  );
}

export function RecommendationPanel({
  groups,
  isDiscoveryComplete,
  isComputingResults,
  pendingVotes,
}: RecommendationPanelProps) {
  return (
    <Box className={styles.panelCard}>
      <Flex direction="column" gap="3">
        <div>
          <Text className={styles.panelEyebrow}>Resultados Pos-Descoberta</Text>
          <Heading size="4" mt="1">
            Recomendacoes
          </Heading>
        </div>

        {!isDiscoveryComplete ? (
          <Text color="gray">
            Continue a descoberta. As recomendacoes finais aparecem ao concluir
            todas as cartas ({Math.max(pendingVotes, 0)} restantes).
          </Text>
        ) : isComputingResults ? (
          <Flex direction="column" align="center" gap="3" py="4">
            <div className={styles.resultsSpinner} aria-hidden="true" />
            <Text color="gray">Calculando recomendacoes...</Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            <section className={styles.resultsSection}>
              <Heading size="3" mb="2">
                Recomendacoes por generos curtidos
              </Heading>
              <RankedRows games={groups.likedGenreRecommendations} />
            </section>

            <section className={styles.resultsSection}>
              <Heading size="3" mb="2">
                Recomendacoes por generos ainda nao avaliados
              </Heading>
              <RankedRows games={groups.unseenGenreRecommendations} />
            </section>

            <section className={styles.resultsSection}>
              <Heading size="3" mb="2">
                Jogos votados como Gosto ou Amo
              </Heading>
              <VotedRows games={groups.likedVotedGames} />
            </section>

            <section className={styles.resultsSection}>
              <Heading size="3" mb="2">
                Jogos votados como Nao tenho interesse
              </Heading>
              <VotedRows games={groups.noInterestVotedGames} />
            </section>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
