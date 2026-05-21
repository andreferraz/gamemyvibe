import { Box, Flex, Text } from "@radix-ui/themes";
import Image from "next/image";
import styles from "../app/page.module.css";
import type { RankedGame } from "./RecommendationPanel";

interface DescribeResultsListProps {
  games: RankedGame[];
  isLoading: boolean;
}

export function DescribeResultsList({
  games,
  isLoading,
}: DescribeResultsListProps) {
  if (isLoading) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <div className={styles.resultsSpinner} aria-hidden="true" />
        <Text color="gray">
          Buscando jogos que melhor combinam com a descricao...
        </Text>
      </Flex>
    );
  }

  if (games.length === 0) {
    return (
      <Text color="gray">
        Digite uma descricao para encontrar jogos parecidos.
      </Text>
    );
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
