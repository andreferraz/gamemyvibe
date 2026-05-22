import type { FormattedGameObject } from "@/app/api/json/types";

export interface RankedGame extends FormattedGameObject {
  similarity: number;
}