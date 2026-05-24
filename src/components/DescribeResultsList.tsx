import { Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { GameDetailsDialog } from "@/components/GameDetailsDialog";
import styles from "../app/page.module.css";
import type { RankedGame } from "./recommendationTypes";

interface DescribeResultsListProps {
  games: RankedGame[];
  isLoading: boolean;
  datasetCount: number;
}

export function DescribeResultsList({
  games,
  isLoading,
  datasetCount,
}: DescribeResultsListProps) {
  const t = useTranslations("DescribeResultsList");

  if (isLoading) {
    return (
      <Flex direction="column" align="center" gap="3" py="6">
        <div className={styles.resultsSpinner} aria-hidden="true" />
        <Text color="gray">{t("loading")}</Text>
      </Flex>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <>
      <Box className={styles.resultsHorizontalList} mt="6" py="1">
        {games.map((game, index) => (
          <GameDetailsDialog key={game.id} game={game} rank={index + 1}>
            <button
              type="button"
              className={styles.gameCardButton}
              aria-label={t("detailsAria", { name: game.name })}
            >
              <Card className={styles.gameCard} style={{ height: "100%" }}>
                {game.coverUrl || game.thumbnailUrl ? (
                  <Box className={styles.gameCardImageWrap}>
                    <Image
                      src={game.coverUrl || game.thumbnailUrl || ""}
                      alt={game.name}
                      fill
                      sizes="(max-width: 768px) 70vw, 220px"
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                ) : (
                  <Box className={styles.gameCardImageFallback}>
                    <Text color="gray" size="2">
                      {t("noImage")}
                    </Text>
                  </Box>
                )}

                <Flex direction="column" gap="2" py="3">
                  <Flex justify="between" align="center" gap="2">
                    <Text className={styles.rank}>#{index + 1}</Text>
                    <Text className={styles.similarity}>
                      {game.similarity}%
                    </Text>
                  </Flex>

                  <Text size="3" weight="bold">
                    {game.name}
                  </Text>

                  <Flex gap="1" wrap="wrap">
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
                        {t("noGenre")}
                      </Badge>
                    )}
                  </Flex>
                </Flex>
              </Card>
            </button>
          </GameDetailsDialog>
        ))}
      </Box>

      <Text color="gray" size="2" mt="3" align="center">
        {t("datasetNote", { count: datasetCount })}
      </Text>
    </>
  );
}
