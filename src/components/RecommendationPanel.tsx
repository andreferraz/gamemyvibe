import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import Image from "next/image";
import type { GameResponse } from "../app/api/igdb/types";
import styles from "../app/page.module.css";

export interface RecommendedGame extends GameResponse {
  similarity: number;
}

interface RecommendationPanelProps {
  games: RecommendedGame[];
}

export function RecommendationPanel({ games }: RecommendationPanelProps) {
  return (
    <Box className={styles.panelCard}>
      <Flex direction="column" gap="3">
        <div>
          <Text className={styles.panelEyebrow}>Painel em Tempo Real</Text>
          <Heading size="4" mt="1">
            Recomendacoes
          </Heading>
        </div>

        {games.length > 0 ? (
          <Flex direction="column" gap="2">
            {games.map((game, index) => (
              <Flex
                key={game.id}
                justify="between"
                align="center"
                gap="3"
                className={styles.recRow}
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
        ) : (
          <Text color="gray">
            Ainda nao ha dados suficientes para recomendacoes.
          </Text>
        )}
      </Flex>
    </Box>
  );
}
