export interface GoogleOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  isConfigured: boolean;
  missing: string[];
}

export function getGoogleOAuthConfig(env: Record<string, string | undefined>): GoogleOAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI || (env.RADIX_APP_URL ? `${env.RADIX_APP_URL}/api/auth/google/callback` : undefined);

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!redirectUri) missing.push("GOOGLE_REDIRECT_URI");

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: missing.length === 0,
    missing,
  };
}

export function buildGoogleAuthorizationUrl(options: {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope?: string;
}): string {
  const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: options.scope || "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  if (options.state) {
    params.set("state", options.state);
  }

  return `${baseUrl}?${params.toString()}`;
}
