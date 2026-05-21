import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { SteamderExperience } from "../components/SteamderExperience";
import type {
  APIResponse,
  CompactGame,
  FormattedGameObject,
} from "./api/json/types";
import { toFormattedGame } from "./api/json/utils";
import styles from "./page.module.css";

async function fetchDiscoveryGames(): Promise<FormattedGameObject[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/json/discovery`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = (await response.json()) as APIResponse<null>;
      throw new Error(errorData.error || "Failed to fetch games");
    }

    const data = (await response.json()) as APIResponse<CompactGame[]>;
    return (data.data || []).map(toFormattedGame);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching discovery games:", errorMessage);
    return [];
  }
}

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

export default async function Home() {
  const [discoveryGames, candidateGames] = await Promise.all([
    fetchDiscoveryGames(),
    fetchCandidateGames(),
  ]);

  return (
    <main className={styles.page}>
      <Container size="4" py="6" className={styles.container}>
        <Flex direction="column" gap="5">
          <div>
            <Text className={styles.kicker}>Steamder MVP</Text>
            <Heading size="7" className={styles.title}>
              Descubra no swipe. Refine em tempo real.
            </Heading>
            <Text size="3" color="gray" className={styles.subtitle}>
              A esquerda, um card para avaliar agora. A direita, as melhores
              recomendacoes com score de similaridade.
            </Text>
          </div>

          <SteamderExperience
            discoveryGames={discoveryGames}
            candidateGames={candidateGames}
          />
        </Flex>
      </Container>
    </main>
  );
}
