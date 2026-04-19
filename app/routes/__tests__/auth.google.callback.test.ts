import * as authModule from "~/lib/auth.server";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/auth.google.callback");

const mockEnv = {
  GOOGLE_CLIENT_ID: "test-id",
  GOOGLE_CLIENT_SECRET: "test-secret",
  SESSION_SECRET: "test-session",
};

const mockContext = {
  cloudflare: {
    env: mockEnv,
    ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
    cf: {},
    caches: {} as CacheStorage,
  },
};

describe("auth.google.callback loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("calls authenticator.authenticate with 'google' strategy on callback", async () => {
    const mockAuthenticate = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: "/home" } })
    );
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: mockAuthenticate } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google/callback?code=abc&state=xyz");
    await loader({ request, context: mockContext as any, params: {} });

    expect(mockAuthenticate).toHaveBeenCalledWith("google", request, {
      successRedirect: "/home",
      failureRedirect: "/",
    });
  });

  it("redirects to '/home' on successful authentication", async () => {
    const successResponse = new Response(null, {
      status: 302,
      headers: { Location: "/home" },
    });
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: vi.fn().mockResolvedValue(successResponse) } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google/callback?code=abc&state=xyz");
    const result = await loader({ request, context: mockContext as any, params: {} });

    expect((result as Response).headers.get("Location")).toBe("/home");
    expect((result as Response).status).toBe(302);
  });

  it("redirects to '/' on failed authentication", async () => {
    const failureResponse = new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: vi.fn().mockResolvedValue(failureResponse) } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google/callback?error=access_denied");
    const result = await loader({ request, context: mockContext as any, params: {} });

    expect((result as Response).headers.get("Location")).toBe("/");
  });

  it("calls createAuth with env + request so callbackURL matches the actual origin", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: vi.fn().mockResolvedValue(new Response()) } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://myapp.pages.dev/auth/google/callback?code=abc");
    await loader({ request, context: mockContext as any, params: {} });

    expect(authModule.createAuth).toHaveBeenCalledWith(mockEnv, request);
  });

  it("only calls authenticate once per request", async () => {
    const mockAuthenticate = vi.fn().mockResolvedValue(new Response());
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: mockAuthenticate } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google/callback?code=abc");
    await loader({ request, context: mockContext as any, params: {} });

    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
  });
});
