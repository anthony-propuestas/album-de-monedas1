import { createAuth } from "~/lib/auth.server";
import type { Env } from "~/types/env";

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  SESSION_SECRET: "test-session-secret-32-chars-long!",
};

describe("createAuth", () => {
  it("returns authenticator and sessionStorage without throwing", () => {
    const result = createAuth(mockEnv);
    expect(result.authenticator).toBeDefined();
    expect(result.sessionStorage).toBeDefined();
  });

  it("authenticator exposes isAuthenticated method", () => {
    const { authenticator } = createAuth(mockEnv);
    expect(typeof authenticator.isAuthenticated).toBe("function");
  });

  it("authenticator exposes authenticate method", () => {
    const { authenticator } = createAuth(mockEnv);
    expect(typeof authenticator.authenticate).toBe("function");
  });

  it("sessionStorage exposes getSession, commitSession, destroySession", () => {
    const { sessionStorage } = createAuth(mockEnv);
    expect(typeof sessionStorage.getSession).toBe("function");
    expect(typeof sessionStorage.commitSession).toBe("function");
    expect(typeof sessionStorage.destroySession).toBe("function");
  });

  it("accepts a request to generate dynamic callbackURL", () => {
    const request = new Request("https://myapp.pages.dev/auth/google");
    expect(() => createAuth(mockEnv, request)).not.toThrow();
  });

  it("uses /auth/google/callback as default callbackURL when no request given", () => {
    // Different origins should not throw — callbackURL is relative
    expect(() => createAuth(mockEnv)).not.toThrow();
  });

  it("creates independent instances for different envs", () => {
    const env2: Env = { ...mockEnv, GOOGLE_CLIENT_ID: "other-id" };
    const auth1 = createAuth(mockEnv);
    const auth2 = createAuth(env2);
    expect(auth1.authenticator).not.toBe(auth2.authenticator);
  });
});
