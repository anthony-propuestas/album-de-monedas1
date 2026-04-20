import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/mycollection");

function makeMockDb(coins: object[] = []) {
  const bindObj = { all: vi.fn().mockResolvedValue({ results: coins }) };
  const prepareObj = { bind: vi.fn().mockReturnValue(bindObj) };
  const db = { prepare: vi.fn().mockReturnValue(prepareObj) };
  return { db, prepareObj, bindObj };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  DB: {} as unknown as D1Database,
};

function makeContext(db: ReturnType<typeof makeMockDb>["db"]) {
  return {
    cloudflare: {
      env: { ...mockEnv, DB: db as unknown as D1Database },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

function makeRequest(search = "") {
  return new Request(`https://example.com/mycollection${search}`);
}

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  name: "John Doe",
  picture: "https://example.com/pic.jpg",
};

describe("mycollection loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect to '/' when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("returns user and empty coins array", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb([]);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();

    expect(data.user).toEqual(mockUser);
    expect(data.coins).toEqual([]);
  });

  it("returns coins from DB", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const coins = [{ id: "coin-1", name: "1 Peso", user_id: "user-123" }];
    const { db } = makeMockDb(coins);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();

    expect(data.coins).toEqual(coins);
  });

  it("returns empty filters when no search params", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();

    expect(data.filters).toEqual({ q: "", country: "", year: "", condition: "" });
  });

  it("reflects search params in returned filters", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await loader({
      request: makeRequest("?q=peso&country=MX&year=1964&condition=MS"),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await result.json();

    expect(data.filters).toEqual({ q: "peso", country: "MX", year: "1964", condition: "MS" });
  });

  it("binds user_id as first parameter", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });

    expect(prepareObj.bind.mock.calls[0][0]).toBe(mockUser.id);
  });

  it("adds LIKE clause and wildcard value for q filter", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await loader({ request: makeRequest("?q=peso"), context: makeContext(db) as any, params: {} });

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("LIKE"));
    expect(prepareObj.bind).toHaveBeenCalledWith(mockUser.id, "%peso%");
  });

  it("adds country filter to query", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await loader({ request: makeRequest("?country=MX"), context: makeContext(db) as any, params: {} });

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("country"));
    expect(prepareObj.bind).toHaveBeenCalledWith(mockUser.id, "MX");
  });

  it("parses year filter as integer", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await loader({ request: makeRequest("?year=1964"), context: makeContext(db) as any, params: {} });

    expect(prepareObj.bind).toHaveBeenCalledWith(mockUser.id, 1964);
  });

  it("adds condition filter to query", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await loader({ request: makeRequest("?condition=MS"), context: makeContext(db) as any, params: {} });

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("condition"));
    expect(prepareObj.bind).toHaveBeenCalledWith(mockUser.id, "MS");
  });

  it("query always ends with ORDER BY created_at DESC", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("ORDER BY created_at DESC"));
  });
});
