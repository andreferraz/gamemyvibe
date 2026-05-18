This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup

### Environment Variables

This project integrates with the IGDB API via Twitch OAuth. Before running the development server, ensure the following variables are set in `.env`:

```bash
CLIENT_ID=your_twitch_client_id
CLIENT_SECRET=your_twitch_client_secret
```

**How to obtain credentials:**

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create an application
3. Copy the Client ID and Client Secret

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

### Popular Games API (`/api/igdb/discovery`)

**Endpoint:** `GET /api/igdb/discovery`

Fetches the top 10 most popular games from the IGDB database. Games are filtered to include only those with descriptions (summary) and are sorted by rating count.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "The Legend of Zelda: Breath of the Wild",
      "summary": "...",
      "coverUrl": "https://...",
      "genres": ["Action", "Adventure"],
      "popularity": 5000
    }
  ],
  "statusCode": 200
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 500
}
```

### Home Page

The home page (`/`) displays a list of the top 10 popular games fetched via the API. Each game card shows:

- Game title
- Genre badges
- Truncated description (first 150 characters)
- Cover image (if available)

Games are fetched server-side on each request (no caching by default).

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
