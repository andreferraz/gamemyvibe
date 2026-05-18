import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { GamesList } from "../components/GamesList";
import type { APIResponse, GameResponse } from "./api/igdb/types";

async function fetchPopularGames(): Promise<GameResponse[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/igdb/discovery`, {
      cache: "no-store", // Disable caching for now; consider revalidate later
    });

    if (!response.ok) {
      const errorData = (await response.json()) as APIResponse<null>;
      throw new Error(errorData.error || "Failed to fetch games");
    }

    const data = (await response.json()) as APIResponse<GameResponse[]>;
    return data.data || [];
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching popular games:", errorMessage);
    return [];
  }
}

export default async function Home() {
  const games = await fetchPopularGames();

  return (
    <Box>
      <main>
        <Container size="3">
          <Flex direction="column" gap="4" py="4">
            <div>
              <Heading size="3" mb="2">
                🎮 Top 10 Popular Games
              </Heading>
              <Text size="2" color="gray">
                The most popular games on IGDB, based on rating count
              </Text>
            </div>

            {games.length > 0 ? (
              <GamesList games={games} />
            ) : (
              <Box
                p="4"
                style={{
                  border: "1px dashed var(--gray-6)",
                  borderRadius: "var(--radius-2)",
                  textAlign: "center",
                }}
              >
                <Text color="gray">
                  Unable to fetch games. Please try again later.
                </Text>
              </Box>
            )}
          </Flex>
        </Container>
      </main>
    </Box>
  );
}
