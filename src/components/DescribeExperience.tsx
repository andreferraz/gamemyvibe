"use client";

import { Box, Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormattedGameObject } from "@/app/api/json/types";
import type { RankedGame } from "@/components/recommendationTypes";
import type {
  DescribeExperienceWorkerRequest,
  DescribeExperienceWorkerResponse,
} from "@/workers/describeExperienceWorker.types";
import styles from "../app/page.module.css";
import { DescribeResultsList } from "./DescribeResultsList";

interface DescribeExperienceProps {
  candidateGames: FormattedGameObject[];
}

export function DescribeExperience({
  candidateGames,
}: DescribeExperienceProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedGame[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasReceivedProgress, setHasReceivedProgress] = useState(false);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [initProgress, setInitProgress] = useState({
    processed: 0,
    total: 0,
    percent: 0,
  });
  const workerRef = useRef<Worker | null>(null);
  const latestSearchRequestIdRef = useRef(0);

  useEffect(() => {
    setIsReady(false);
    setIsSearching(false);
    setResults([]);
    setHasReceivedProgress(false);
    setHasSearchedOnce(false);
    setInitProgress({ processed: 0, total: 0, percent: 0 });

    const worker = new Worker(
      new URL("../workers/describeExperience.worker.ts", import.meta.url),
    );

    workerRef.current = worker;
    latestSearchRequestIdRef.current = 0;

    worker.addEventListener(
      "message",
      (event: MessageEvent<DescribeExperienceWorkerResponse>) => {
        const message = event.data;

        if (message.type === "init-complete") {
          setInitProgress((current) => ({
            ...current,
            percent: 100,
          }));
          setIsReady(true);
          return;
        }

        if (message.type === "init-progress") {
          setHasReceivedProgress(true);
          setInitProgress({
            processed: message.processed,
            total: message.total,
            percent: message.percent,
          });
          return;
        }

        if (message.type === "search-results") {
          if (message.requestId !== latestSearchRequestIdRef.current) {
            return;
          }

          setResults(message.results);
          setIsSearching(false);
          return;
        }

        if (message.type === "error") {
          console.error(
            "Error in describe experience worker:",
            message.message,
          );

          if (message.stage === "init") {
            setIsReady(false);
          }

          if (
            message.requestId === undefined ||
            message.requestId === latestSearchRequestIdRef.current
          ) {
            setIsSearching(false);
          }

          if (message.stage === "search") {
            setResults([]);
          }
        }
      },
    );

    const initRequest: DescribeExperienceWorkerRequest = {
      type: "init",
      games: candidateGames,
    };

    worker.postMessage(initRequest);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [candidateGames]);

  const placeholder = useMemo(
    () =>
      isReady
        ? "Ex: A racing game with some stunning cars"
        : "Carregando modelo...",
    [isReady],
  );

  const statusText = useMemo(() => {
    if (!isReady && !hasReceivedProgress) {
      return "Ligando os motores…";
    }

    if (!isReady && hasReceivedProgress) {
      return "Preparando a mágica ✨";
    }

    if (!hasSearchedOnce) {
      return "Tudo pronto pra busca!";
    }

    return "";
  }, [hasReceivedProgress, hasSearchedOnce, isReady]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || !isReady) {
      return;
    }

    const nextRequestId = latestSearchRequestIdRef.current + 1;
    latestSearchRequestIdRef.current = nextRequestId;
    setIsSearching(true);
    setHasSearchedOnce(true);

    const searchRequest: DescribeExperienceWorkerRequest = {
      type: "search",
      query: trimmedQuery,
      limit: 5,
      requestId: nextRequestId,
    };

    workerRef.current?.postMessage(searchRequest);
  }

  return (
    <Flex direction="column" gap="4" mt="4">
      <form onSubmit={handleSearch}>
        <Flex direction="row" align="center" wrap="nowrap">
          <Box flexGrow="1">
            <TextField.Root
              size="3"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              disabled={!isReady || isSearching}
            />
          </Box>
          <Flex justify="between" align="center" wrap="wrap">
            <Button
              type="submit"
              size="3"
              disabled={!isReady || isSearching || !query.trim()}
            >
              Buscar jogos
            </Button>
          </Flex>
        </Flex>
      </form>

      {statusText && (
        <Flex direction="column" align="center" gap="3" py="6">
          <Text as="p" align="center" size="4" weight="bold" color="gray">
            {statusText}
          </Text>

          {!isReady && hasReceivedProgress ? (
            <div className={styles.embeddingProgressWrap}>
              <div
                className={styles.embeddingProgressTrack}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={initProgress.percent}
                aria-label="Progresso da vetorizacao"
              >
                <div
                  className={styles.embeddingProgressFill}
                  style={{ width: `${initProgress.percent}%` }}
                />
              </div>
            </div>
          ) : null}
        </Flex>
      )}

      <DescribeResultsList games={results} isLoading={isSearching} />
    </Flex>
  );
}
