import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { DescribeExperience } from "../../components/DescribeExperience";
import type {
  APIResponse,
  CompactGame,
  FormattedGameObject,
} from "../api/json/types";
import { toFormattedGame } from "../api/json/utils";
import styles from "../page.module.css";

async function fetchCandidateGames(): Promise<FormattedGameObject[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/json/candidates`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = (await response.json()) as APIResponse<null>;
      throw new Error(errorData.error || "Failed to fetch candidate games");
    }

    const data = (await response.json()) as APIResponse<CompactGame[]>;
    return (data.data || []).map(toFormattedGame);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching candidate games:", errorMessage);
    return [];
  }
}

export default async function DescribePage() {
  const candidateGames = await fetchCandidateGames();

  return (
    <main className={styles.page}>
      <Container size="4" py="6" className={styles.container}>
        <Flex direction="column" gap="5">
          <div>
            <Text className={styles.kicker}>Steamder Describe</Text>
            <Heading size="7" className={styles.title}>
              Conte o que voce quer jogar.
            </Heading>
            <Text size="3" color="gray" className={styles.subtitle}>
              Descreva o tipo de jogo, o tema ou o estilo visual. A busca usa
              embeddings locais para encontrar os 5 candidatos mais proximos.
            </Text>
          </div>

          <DescribeExperience candidateGames={candidateGames} />
        </Flex>
      </Container>
    </main>
  );
}
