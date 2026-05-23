import { Badge, Box, Button, Dialog, Flex, Text } from "@radix-ui/themes";
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
      <Dialog.Content className={styles.gameDialogContent} maxWidth="760px">
        <Dialog.Title>{game.name}</Dialog.Title>
        <Dialog.Description>
          {t("description", { rank, similarity: game.similarity })}
        </Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          <div className={styles.gameDialogMediaWrap}>
            {imageSrc ? (
              <Box className={styles.gameDialogImageWrap}>
                <Image
                  src={imageSrc}
                  alt={game.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            ) : (
              <Box className={styles.gameDialogImageFallback}>
                <Text color="gray">{t("noCoverImage")}</Text>
              </Box>
            )}
          </div>

          <Flex wrap="wrap" gap="2">
            <Badge size="2" variant="soft" color="green">
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

          <Text className={styles.gameDialogSummary} size="2" color="gray">
            {game.summary || t("summaryUnavailable")}
          </Text>

          <Flex justify="end" mt="2">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                {t("close")}
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
