import { Flex, Link, Text } from "@radix-ui/themes";
import { getTranslations } from "next-intl/server";
import { FaGithub } from "react-icons/fa6";

export async function AppHeader() {
  const t = await getTranslations("Header");

  return (
    <header>
      <Flex align="center" justify="between" gap="3">
        <Link
          href="https://github.com/andreferraz/gamemyvibe"
          target="_blank"
          rel="noopener noreferrer"
          weight="medium"
          title={t("githubTitle")}
          aria-label={t("githubTitle")}
          color="gray"
        >
          <FaGithub size={24} />
        </Link>

        <Text size="1" color="gray">
          {t("developedBy")}{" "}
          <Link
            href="https://www.andreferraz.dev/"
            target="_blank"
            rel="noopener noreferrer"
            weight="medium"
            title={t("authorTitle")}
          >
            André Ferraz
          </Link>
        </Text>
      </Flex>
    </header>
  );
}
