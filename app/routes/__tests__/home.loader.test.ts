import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

// imported after mock so it picks up the mocked module
const { loader } = await import("~/routes/home");

function makeMockDb(firstResult: { profile_completed: number } | null = null) {
  const bindObj = {
    first: vi.fn().mockResolvedValue(firstResult),
    run: vi.fn().mockResolvedValue({}),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
  const prepareObj = {
    bind: vi.fn().mockReturnValue(bindObj),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({}),
  };
  return { prepare: vi.fn().mockReturnValue(prepareObj) };
}

interface StatsDbOptions {
  existing?: { profile_completed: number } | null;
  statsRow?: { total: number } | null;
  valueRow?: { total: number } | null;
  conditionRow?: { condition: string; cnt: number } | null;
}

// Handles sequential first() calls: profile + 3 stats + messages
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
    .mockResolvedValueOnce(conditionRow)
    .mockResolvedValueOnce({ unread: 0 }); // messages query
  const runFn = vi.fn().mockResolvedValue({});
  const allFn = vi.fn().mockResolvedValue({ results: [] });
  const bindObj = { first: firstFn, run: runFn, all: allFn };
  const prepareObj = {
    bind: vi.fn().mockReturnValue(bindObj),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({}),
  };
  const db = { prepare: vi.fn().mockReturnValue(prepareObj) };
  return { db, firstFn, runFn, prepareObj };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL: "admin@example.com",
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

  it("makes at least 7 DB prepare calls (INSERT user + profile + 3 stats + coins + user_badges + messages)", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats();
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    // INSERT OR IGNORE users + SELECT profile + 3 stats + SELECT coins + SELECT user_badges + SELECT messages = 8+
    expect(db.prepare.mock.calls.length).toBeGreaterThanOrEqual(7);
  });

  it("runs INSERT OR IGNORE for both new and existing users", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ existing: null });
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT OR IGNORE INTO users"));
  });

  it("response includes all three stats fields", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats({ statsRow: { total: 7 }, valueRow: { total: 300 }, conditionRow: { condition: "AU", cnt: 3 } });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.stats).toEqual({ total: 7, estimatedValue: 300, topCondition: "AU" });
  });

  it("returns claimedByCountry as an object", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats();
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.claimedByCountry).toBeDefined();
    expect(typeof data.claimedByCountry).toBe("object");
  });

  // --- chat ---

  it("runs the chat_messages cleanup DELETE query", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats();
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const deleteCalls = (db.prepare.mock.calls as string[][]).filter(([sql]) =>
      sql.includes("DELETE FROM chat_messages")
    );
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("queries chat_messages ordered by created_at DESC", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats();
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const chatCalls = (db.prepare.mock.calls as string[][]).filter(([sql]) =>
      sql.includes("FROM chat_messages") && sql.includes("ORDER BY")
    );
    expect(chatCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("returns chatMessages array in response", async () => {
    mockAuthenticated();
    const { db } = makeMockDbWithStats();
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(Array.isArray(data.chatMessages)).toBe(true);
  });

  it("returns chatMessages with data from DB", async () => {
    mockAuthenticated();
    const { db, prepareObj } = makeMockDbWithStats();
    const mockMsg = { id: 1, user_id: "u1", user_name: "Alice", user_picture: null, message: "Hola", created_at: 1000000 };
    prepareObj.all.mockResolvedValue({ results: [mockMsg] });
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.chatMessages).toEqual([mockMsg]);
  });
});
