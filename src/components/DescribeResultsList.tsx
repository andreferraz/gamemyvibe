import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import Image from "next/image";
import styles from "../app/page.module.css";
import type { RankedGame } from "./recommendationTypes";

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
          Buscando jogos que melhor combinam com a descrição...
        </Text>
      </Flex>
    );
  }

  if (games.length === 0) {
    return null;
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
              <Flex gap="1" wrap="wrap" mt="1">
                {game.genres.length > 0 ? (
                  game.genres.map((genre, genreIndex) => (
                    <Badge
                      key={`${game.id}-${genre}-${genreIndex}`}
                      size="1"
                      variant="soft"
                      color="gray"
                    >
                      {genre}
                    </Badge>
                  ))
                ) : (
                  <Badge size="1" variant="soft" color="gray">
                    Sem gênero
                  </Badge>
                )}
              </Flex>
            </div>
          </Flex>
          <Text color="gray" size="2" weight="bold" style={{ opacity: 0.65 }}>
            {game.similarity}%
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}
