export interface GameGenre {
  id: number;
  name: string;
}

export interface GameGenre {
  id: number;
  name: string;
}

export interface RawGameObject {
  id: number;
  name: string;
  resume?: string;
  summary?: string;
  coverUrl?: string;
  genres?: GameGenre[];
  totalRatingCount?: number;
  rating?: number;
}

export interface FormattedGameObject {
  id: number;
  name: string;
  summary: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  genres: string[];
  popularity?: number;
  rating?: number;
}

export interface CompactGame {
  /** ID */
  i: number;
  /** Name  */
  n: string;
  /** Summary  */
  s: string;
  /** Thumbnail URL  */
  t?: string;
  /** Cover URL  */
  c?: string;
  /** Genres IDs  */
  g: number[];
  /** Popularity (total rating count)  */
  p?: number;
  /** Rating */
  r?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}
