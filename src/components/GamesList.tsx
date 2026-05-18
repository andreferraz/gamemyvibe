import { Box } from "@radix-ui/themes";
import type { GameResponse } from "../app/api/igdb/types";
import { GameCard } from "./GameCard";

interface GamesListProps {
  games: GameResponse[];
}

export function GamesList({ games }: GamesListProps) {
  if (!games.length) {
    return null;
  }
  return (
    <Box>
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </Box>
  );
}
