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

interface StatsDbOptions {
  existing?: { profile_completed: number } | null;
  statsRow?: { total: number } | null;
  valueRow?: { total: number } | null;
  conditionRow?: { condition: string; cnt: number } | null;
}

// Handles the 4 sequential first() calls: profile check + 3 stats queries
function makeMockDbWithStats({
  existing = { profile_completed: 1 },
  statsRow = { total: 0 },
  valueRow = { total: 0 },
  conditionRow = null,
}: StatsDbOptions = {}) {
  const firstFn = vi
    .fn()
    .mockResolvedValueOnce(existing)
    .mockResolvedValueOnce(statsRow)
    .mockResolvedValueOnce(valueRow)
    .mockResolvedValueOnce(conditionRow);
  const runFn = vi.fn().mockResolvedValue({});
  const bindObj = { first: firstFn, run: runFn };
  const prepareObj = { bind: vi.fn().mockReturnValue(bindObj) };
  const db = { prepare: vi.fn().mockReturnValue(prepareObj) };
  return { db, firstFn, runFn, prepareObj };
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

  // --- stats ---

  const authenticatedUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    picture: null,
  };

  function mockAuthenticated() {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(authenticatedUser) } as any,
      sessionStorage: {} as any,
    });
  }

  it("returns stats.total from the DB COUNT query", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ statsRow: { total: 42 } });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats.total).toBe(42);
  });

  it("returns stats.estimatedValue from the DB SUM query", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ valueRow: { total: 1500 } });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats.estimatedValue).toBe(1500);
  });

  it("returns stats.topCondition from the condition query", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ conditionRow: { condition: "XF", cnt: 5 } });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats.topCondition).toBe("XF");
  });

  it("stats.total defaults to 0 when DB returns null", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ statsRow: null });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats.total).toBe(0);
  });

  it("stats.estimatedValue defaults to 0 when DB returns null", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ valueRow: null });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats.estimatedValue).toBe(0);
  });

  it("stats.topCondition defaults to null when DB returns null conditionRow", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ conditionRow: null });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats.topCondition).toBeNull();
  });

  it("makes 4 DB prepare calls for an existing user", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats();
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(db.prepare).toHaveBeenCalledTimes(4);
  });

  it("makes 5 DB prepare calls for a new user (INSERT included)", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ existing: null });
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(db.prepare).toHaveBeenCalledTimes(5);
  });

  it("response includes all three stats fields", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ statsRow: { total: 7 }, valueRow: { total: 300 }, conditionRow: { condition: "AU", cnt: 3 } });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats).toEqual({ total: 7, estimatedValue: 300, topCondition: "AU" });
  });
});
