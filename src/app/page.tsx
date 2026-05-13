import { Box, Button, Container, Flex, Text } from "@radix-ui/themes";

export default function Home() {
  return (
    <Box>
      <main>
        <Container>
          <Flex direction="column" gap="2">
            <Text>Hello from Radix Themes :)</Text>
            <Button>Let's go</Button>
          </Flex>
        </Container>
      </main>
    </Box>
  );
}
