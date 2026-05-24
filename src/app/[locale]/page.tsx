import { Box, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCandidateGames } from "@/app/api/json/candidates/getCandidateGames";
import type { FormattedGameObject } from "@/app/api/json/types";
import { toFormattedGame } from "@/app/api/json/utils";
import { DescribeExperience } from "@/components/DescribeExperience";
import styles from "../page.module.css";

async function fetchCandidateGames(): Promise<FormattedGameObject[]> {
  console.log("Fetching candidate games...");
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

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DescribePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("HomePage");
  const candidateGames = await fetchCandidateGames();

  return (
    <main className={styles.page}>
      <Container size="4" py="6" className={styles.container}>
        <Flex direction="column" justify="center" gap="5">
          <Box mt="8">
            <Heading
              align="center"
              as="h1"
              size="2"
              color="teal"
              className={styles.kicker}
              mb="4"
            >
              🎮
              <Text mx="2" style={{ display: "inline-block" }}>
                {t("brand")}
              </Text>
              💬
            </Heading>
            <Text align="center" as="p" size="9" weight="bold">
              {t("title")}
            </Text>
            <Box maxWidth="62ch" mx="auto">
              <Text
                as="p"
                size="4"
                align="center"
                color="gray"
                mx="auto"
                mt="4"
              >
                {t("description")}
              </Text>
            </Box>
          </Box>

          <DescribeExperience candidateGames={candidateGames} />
        </Flex>
      </Container>
    </main>
  );
}
