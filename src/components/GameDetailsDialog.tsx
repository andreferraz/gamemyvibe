import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Text,
} from "@radix-ui/themes";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import styles from "../app/page.module.css";
import type { RankedGame } from "./recommendationTypes";

interface GameDetailsDialogProps {
  game: RankedGame;
  rank: number;
  children: ReactNode;
}

export function GameDetailsDialog({
  game,
  rank,
  children,
}: GameDetailsDialogProps) {
  const t = useTranslations("GameDetailsDialog");
  const imageSrc = game.coverUrl || game.thumbnailUrl;

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>
      <Dialog.Content
        className={styles.gameDialogContent}
        maxWidth="800px"
        aria-describedby={undefined}
      >
        <Flex direction="row" gap="5">
          <Box flexShrink="0" flexBasis="240px">
            {imageSrc ? (
              <AspectRatio ratio={1 / 1.4}>
                <Image
                  src={imageSrc}
                  alt={game.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  style={{ objectFit: "cover" }}
                />
              </AspectRatio>
            ) : (
              <Box className={styles.gameDialogImageFallback}>
                <Text color="gray">{t("noCoverImage")}</Text>
              </Box>
            )}
          </Box>

          <Flex direction="column" gap="3">
            <Dialog.Title size="6" mb="0" mt="4">
              {game.name}
            </Dialog.Title>
            <Flex wrap="wrap" gap="1">
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

            <Text className={styles.gameDialogSummary} color="gray">
              {game.summary || t("summaryUnavailable")}
            </Text>

            <Flex wrap="wrap" gap="2">
              <Badge size="2" variant="soft" color="teal">
                {t("similarity", { similarity: game.similarity })}
              </Badge>
              {typeof game.rating === "number" ? (
                <Badge size="2" variant="soft" color="blue">
                  {t("rating", { rating: game.rating.toFixed(1) })}
                </Badge>
              ) : null}
              {typeof game.popularity === "number" ? (
                <Badge size="2" variant="soft" color="orange">
                  {t("popularity", { popularity: game.popularity })}
                </Badge>
              ) : null}
            </Flex>

            <Flex direction="row" justify="end" align="center" mt="auto">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  {t("close")}
                </Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
