import { Badge, Box, Flex, Heading, Text } from "@radix-ui/themes";
import Image from "next/image";
import type { GameResponse } from "../app/api/igdb/types";

export interface GameCardProps {
  game: GameResponse;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <Box
      key={game.id}
      p="3"
      mb="2"
      style={{
        border: "1px solid var(--gray-6)",
        borderRadius: "var(--radius-2)",
      }}
    >
      <Flex direction="column" gap="2">
        <Flex justify="between" align="start">
          <div>
            <Heading size="2" mb="1">
              {game.name}
            </Heading>
            {game.genres && game.genres.length > 0 && (
              <Flex gap="1" mb="2" wrap="wrap">
                {game.genres.map((genre) => (
                  <Badge key={genre} size="1" variant="soft">
                    {genre}
                  </Badge>
                ))}
              </Flex>
            )}
          </div>
          {game.coverUrl && (
            <Box
              style={{
                width: "80px",
                height: "100px",
                borderRadius: "var(--radius-2)",
                overflow: "hidden",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Image
                src={game.coverUrl}
                alt={game.name}
                fill
                sizes="80px"
                style={{
                  objectFit: "cover",
                }}
              />
            </Box>
          )}
        </Flex>
        <Text size="2" color="gray">
          {game.summary.substring(0, 150)}
          {game.summary.length > 150 ? "..." : ""}
        </Text>
      </Flex>
    </Box>
  );
}
