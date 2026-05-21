import { buildIgdbCoverUrls } from "@/utils/igdb";
import { genres } from "./genres";
import type { CompactGame, FormattedGameObject, RawGameObject } from "./types";

export function toCompactGame(game: RawGameObject): CompactGame {
  return {
    i: game.id,
    n: game.name,
    s: game.summary ?? "",
    c: game.coverUrl,
    g: game.genres?.map((genre) => genre.id) ?? [],
    p: game.totalRatingCount,
    r: game.rating,
  };
}

export function toFormattedGame(game: CompactGame): FormattedGameObject {
  const igdbCover = buildIgdbCoverUrls(game.c ?? "");

  return {
    id: game.i,
    name: game.n,
    summary: game.s,
    thumbnailUrl: igdbCover.thumbnailUrl,
    coverUrl: igdbCover.coverUrl,
    genres: game.g
      .map((id) => genres.find((g) => g.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
    popularity: game.p,
    rating: game.r,
  };
}
