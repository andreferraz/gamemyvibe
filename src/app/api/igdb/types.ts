export interface IGDBCover {
  id: number;
  url?: string;
  width?: number;
  height?: number;
}

export interface IGDBGenre {
  id: number;
  name: string;
  slug?: string;
  url?: string;
}

export interface IGDBGameRaw {
  id: number;
  name: string;
  summary?: string;
  cover?: IGDBCover;
  genres?: IGDBGenre[];
  total_rating_count?: number;
  rating?: number;
  hypes?: number;
  follows?: number;
}

export interface GameResponse {
  id: number;
  name: string;
  summary: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  genres: string[];
  popularity?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}
