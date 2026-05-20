import { Badge, Box, Button, Flex, Heading, Text } from "@radix-ui/themes";
import Image from "next/image";
import type { GameResponse } from "../app/api/igdb/types";
import styles from "../app/page.module.css";

interface DiscoveryPanelProps {
  game?: GameResponse;
  interactionsCount?: number;
  votedGamesCount?: number;
  isModelReady?: boolean;
  isCandidatesReady?: boolean;
  profileVectorDimensions?: number;
  onNoInterest?: () => void;
  onLike?: () => void;
  onLove?: () => void;
}

export function DiscoveryPanel({
  game,
  interactionsCount,
  votedGamesCount,
  isModelReady,
  isCandidatesReady,
  profileVectorDimensions,
  onNoInterest,
  onLike,
  onLove,
}: DiscoveryPanelProps) {
  if (!game) {
    return (
      <Box className={styles.panelCard}>
        <Heading size="4">Descoberta</Heading>
        <Text color="gray" mt="3">
          Nao foi possivel carregar os jogos para descoberta no momento.
        </Text>
      </Box>
    );
  }

  return (
    <Box className={styles.panelCard}>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" gap="3">
          <div>
            <Text as="p" className={styles.panelEyebrow}>
              Descoberta Ativa
            </Text>
            {typeof interactionsCount === "number" ? (
              <Text as="p" size="1" color="gray" mt="1">
                Interacoes registradas: {interactionsCount}
              </Text>
            ) : null}
            {typeof votedGamesCount === "number" ? (
              <Text as="p" size="1" color="gray" mt="1">
                Jogos votados: {votedGamesCount}
              </Text>
            ) : null}
            <Text as="p" size="1" color="gray" mt="1">
              Modelo USE: {isModelReady ? "pronto" : "carregando..."}
            </Text>
            <Text as="p" size="1" color="gray" mt="1">
              Candidatos vetorizados:{" "}
              {isCandidatesReady ? "pronto" : "carregando..."}
            </Text>
            <Text as="p" size="1" color="gray" mt="1">
              Vetor de perfil:{" "}
              {profileVectorDimensions
                ? `${profileVectorDimensions}D`
                : "aguardando interacoes"}
            </Text>
            <Heading size="5" mt="1">
              {game.name}
            </Heading>
            {game.genres.length > 0 ? (
              <Flex gap="2" mt="3" wrap="wrap">
                {game.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="soft" color="teal">
                    {genre}
                  </Badge>
                ))}
              </Flex>
            ) : null}
          </div>

          {game.coverUrl || game.thumbnailUrl ? (
            <Box className={styles.discoveryCoverWrap}>
              <Image
                src={game.coverUrl || game.thumbnailUrl || ""}
                alt={game.name}
                fill
                sizes="(max-width: 1024px) 160px, 200px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ) : null}
        </Flex>

        <Text size="3" className={styles.summaryText}>
          {game.summary}
        </Text>

        <Flex gap="2" className={styles.actionsRow}>
          <Button
            size="3"
            variant="outline"
            color="gray"
            className={styles.actionButton}
            onClick={onNoInterest}
          >
            Nao tenho interesse
          </Button>
          <Button
            size="3"
            color="cyan"
            className={styles.actionButton}
            onClick={onLike}
          >
            Gosto
          </Button>
          <Button
            size="3"
            color="amber"
            className={styles.actionButton}
            onClick={onLove}
          >
            Amo
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
