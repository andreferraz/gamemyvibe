// Utility for IGDB/Twitch authentication
interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";

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