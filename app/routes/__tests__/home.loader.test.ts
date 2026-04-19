import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

// imported after mock so it picks up the mocked module
const { loader } = await import("~/routes/home");

function makeMockDb(firstResult: { profile_completed: number } | null = null) {
  const bindObj = {
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue({}),
  };
  const prepareObj = { bind: vi.fn().mockReturnValue(bindObj) };
  return { prepare: vi.fn().mockReturnValue(prepareObj) };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  DB: {} as unknown as D1Database,
};

function makeContext(db: ReturnType<typeof makeMockDb>) {
  return {
    cloudflare: {
      env: { ...mockEnv, DB: db as unknown as D1Database },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

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
      await loader({ request: makeRequest(), context: makeContext(makeMockDb()) as any, params: {} });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("returns user data and profileCompleted=false for a new user", async () => {
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

    const db = makeMockDb(null); // new user
    const result = await loader({
      request: makeRequest(),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.user).toEqual(mockUser);
    expect(data.profileCompleted).toBe(false);
  });

  it("returns profileCompleted=true for a returning user with complete profile", async () => {
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

    const db = makeMockDb({ profile_completed: 1 });
    const result = await loader({
      request: makeRequest(),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.profileCompleted).toBe(true);
  });

  it("calls isAuthenticated with the incoming request", async () => {
    const mockIsAuthenticated = vi.fn().mockResolvedValue(null);
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: mockIsAuthenticated } as any,
      sessionStorage: {} as any,
    });

    const request = makeRequest();
    try {
      await loader({ request, context: makeContext(makeMockDb()) as any, params: {} });
    } catch {}

    expect(mockIsAuthenticated).toHaveBeenCalledWith(request);
    expect(mockIsAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("calls createAuth with the cloudflare env", () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });

    const db = makeMockDb();
    const ctx = makeContext(db);
    loader({ request: makeRequest(), context: ctx as any, params: {} }).catch(() => {});

    expect(authModule.createAuth).toHaveBeenCalledWith(ctx.cloudflare.env);
  });
});
