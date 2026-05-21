import { Box } from "@radix-ui/themes";
import type { FormattedGameObject } from "@/app/api/json/types";
import { GameCard } from "./GameCard";

interface GamesListProps {
  games: FormattedGameObject[];
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
