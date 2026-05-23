import type { FormattedGameObject } from "@/app/api/json/types";
import type { RankedGame } from "@/components/recommendationTypes";

export interface DescribeExperienceWorkerInitRequest {
  type: "init";
  games: FormattedGameObject[];
}

export interface DescribeExperienceWorkerSearchRequest {
  type: "search";
  query: string;
  limit: number;
  requestId: number;
}

export type DescribeExperienceWorkerRequest =
  | DescribeExperienceWorkerInitRequest
  | DescribeExperienceWorkerSearchRequest;

export interface DescribeExperienceWorkerInitComplete {
  type: "init-complete";
}

export interface DescribeExperienceWorkerSearchResults {
  type: "search-results";
  requestId: number;
  results: RankedGame[];
}

export interface DescribeExperienceWorkerError {
  type: "error";
  stage: "init" | "search";
  message: string;
  requestId?: number;
}

export type DescribeExperienceWorkerResponse =
  | DescribeExperienceWorkerInitComplete
  | DescribeExperienceWorkerSearchResults
  | DescribeExperienceWorkerError;
