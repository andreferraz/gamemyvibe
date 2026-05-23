# 🎮 Game My Vibe 💬

This is a [Next.js](https://nextjs.org) project with focus on exploring real-time game recommendation algorithms using client-side machine learning.

## Technologies Used

This project was build with help from the following technologies:

### AI
- **TensorFlow.js**: For client-side machine learning and real-time recommendation calculations.
- **OpenRouter**: For testing external models for optimizing game descriptions.
- **Ollama**: For hosting and running local language model without costs and rate-limits (this eventually replaced OpenRouter's usage).
- **GitHub Copilot**: For AI-assisted code generation and suggestions.

### UI
- **Next.js**: For server-side rendering, API routes, and overall app structure.
- **React**: For building interactive UI components.
- **Radix UI**: For accessible and customizable UI components.

### Data
- **Gemini**: For iterating ideas and building roadmaps.
- **IGDB API**: For fetching game data and metadata.
- **gpt-oss:20b**: The open-source model used for optimizing game descriptions.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Code Quality

Run linting and formatting:

```bash
npm run lint      # Check code with Biome
npm run format    # Format code with Biome
```

## Learn More

To learn more about the technologies used in this project, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [IGDB API Documentation](https://api-docs.igdb.com/?javascript#about)
- [Twitch OAuth Documentation](https://dev.twitch.tv/docs/authentication/oauth-2-guide)
- [Radix UI Themes](https://www.radix-ui.com/themes)
