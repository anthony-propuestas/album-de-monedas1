import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

// imported after mock so it picks up the mocked module
const { loader } = await import("~/routes/home");

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
};

const mockContext = {
  cloudflare: {
    env: mockEnv,
    ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
    cf: {},
    caches: {} as CacheStorage,
  },
};

function makeRequest(url = "https://example.com/home") {
  return new Request(url);
}

describe("home loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws a redirect to '/' when user is not authenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });

    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: mockContext as any, params: {} });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("returns user data when the session is valid", async () => {
    const mockUser = {
      id: "user-123",
      email: "user@example.com",
      name: "John Doe",
      picture: "https://example.com/pic.jpg",
    };

    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const result = await loader({
      request: makeRequest(),
      context: mockContext as any,
      params: {},
    });

    expect(result).toEqual({ user: mockUser });
  });

  it("calls isAuthenticated with the incoming request", async () => {
    const mockIsAuthenticated = vi.fn().mockResolvedValue(null);
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: mockIsAuthenticated } as any,
      sessionStorage: {} as any,
    });

    const request = makeRequest();
    try {
      await loader({ request, context: mockContext as any, params: {} });
    } catch {}

    expect(mockIsAuthenticated).toHaveBeenCalledWith(request);
    expect(mockIsAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("calls createAuth with the cloudflare env (no request needed for session check)", () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });

    const request = makeRequest();
    loader({ request, context: mockContext as any, params: {} }).catch(() => {});

    expect(authModule.createAuth).toHaveBeenCalledWith(mockEnv);
  });
});
