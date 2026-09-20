import { describe, expect, it } from "vitest";
import { buildGoogleAuthorizationUrl, getGoogleOAuthConfig } from "./googleAuth";

describe("Google OAuth config", () => {
  it("builds a Google authorization URL when client settings are configured", () => {
    const url = buildGoogleAuthorizationUrl({
      clientId: "test-client-id",
      redirectUri: "https://example.com/api/auth/google/callback",
      state: "demo-state",
    });

    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fapi%2Fauth%2Fgoogle%2Fcallback");
    expect(url).toContain("state=demo-state");
  });

  it("reports missing configuration clearly when env vars are absent", () => {
    const config = getGoogleOAuthConfig({
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      GOOGLE_REDIRECT_URI: undefined,
      VITE_GOOGLE_CLIENT_ID: undefined,
      RADIX_APP_URL: undefined,
    });

    expect(config.isConfigured).toBe(false);
    expect(config.missing).toContain("GOOGLE_CLIENT_ID");
  });
});
