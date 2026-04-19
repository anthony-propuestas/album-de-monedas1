import * as authModule from "~/lib/auth.server";

vi.mock("~/lib/auth.server");

const { action } = await import("~/routes/auth.google");

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

describe("auth.google action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("calls authenticator.authenticate with 'google' strategy", async () => {
    const mockAuthenticate = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: "/home" } })
    );
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: mockAuthenticate } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google", { method: "POST" });
    await action({ request, context: mockContext as any, params: {} });

    expect(mockAuthenticate).toHaveBeenCalledWith("google", request, {
      successRedirect: "/home",
      failureRedirect: "/",
    });
  });

  it("passes successRedirect='/home' and failureRedirect='/'", async () => {
    const mockAuthenticate = vi.fn().mockResolvedValue(new Response());
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: mockAuthenticate } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google", { method: "POST" });
    await action({ request, context: mockContext as any, params: {} });

    const callArgs = mockAuthenticate.mock.calls[0];
    expect(callArgs[2]).toMatchObject({ successRedirect: "/home", failureRedirect: "/" });
  });

  it("calls createAuth with env + request so callbackURL is dynamic", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: vi.fn().mockResolvedValue(new Response()) } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://myapp.pages.dev/auth/google", { method: "POST" });
    await action({ request, context: mockContext as any, params: {} });

    expect(authModule.createAuth).toHaveBeenCalledWith(mockEnv, request);
  });

  it("returns the response from authenticate", async () => {
    const expectedResponse = new Response(null, {
      status: 302,
      headers: { Location: "/home" },
    });
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { authenticate: vi.fn().mockResolvedValue(expectedResponse) } as any,
      sessionStorage: {} as any,
    });

    const request = new Request("https://example.com/auth/google", { method: "POST" });
    const result = await action({ request, context: mockContext as any, params: {} });

    expect(result).toBe(expectedResponse);
  });
});
