// Utility for IGDB/Twitch authentication
interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";

function toHttpsIgdbUrl(url: string): string {
  return url.startsWith("http") ? url : `https:${url}`;
}

function replaceIgdbImageSize(url: string, size: string): string {
  if (/\/t_[^/]+\//.test(url)) {
    return url.replace(/\/t_[^/]+\//, `/${size}/`);
  }
  return url;
}

export function buildIgdbCoverUrls(coverUrl: string): {
  thumbnailUrl: string;
  coverUrl: string;
} {
  const normalized = toHttpsIgdbUrl(coverUrl);
  return {
    thumbnailUrl: normalized,
    coverUrl: replaceIgdbImageSize(normalized, "t_cover_big_2x"),
  };
}

export async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_AUTH_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Twitch authentication failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as TwitchTokenResponse;
  return data.access_token;
}
