import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { DescribeExperience } from "../components/DescribeExperience";
import { getCandidateGames } from "./api/json/candidates/getCandidateGames";
import type { FormattedGameObject } from "./api/json/types";
import { toFormattedGame } from "./api/json/utils";
import styles from "./page.module.css";

async function fetchCandidateGames(): Promise<FormattedGameObject[]> {
  try {
    const candidateGames = await getCandidateGames();
    return candidateGames.map(toFormattedGame);
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
        <Flex direction="column" justify="center" gap="5">
          <Box mt="8">
            <Heading align="center" as="h1" className={styles.kicker}>
              🎮
              <Text ml="2" style={{ display: "inline-block" }}>
                Game my vibe
              </Text>
            </Heading>
            <Text align="center" as="p" size="9" weight="bold">
              Descreva o que quer jogar.
            </Text>
            <Box maxWidth="62ch" mx="auto">
              <Text
                as="p"
                align="center"
                size="3"
                color="gray"
                mx="auto"
                mt="4"
              >
                Escreva o tipo de jogo, o tema ou o estilo visual. A busca usa
                embeddings locais para encontrar os 5 candidatos mais próximos
                dentre uma lista mais de 500 jogos.
              </Text>
            </Box>
          </Box>

          <DescribeExperience candidateGames={candidateGames} />
        </Flex>
      </Container>
    </main>
  );
}
