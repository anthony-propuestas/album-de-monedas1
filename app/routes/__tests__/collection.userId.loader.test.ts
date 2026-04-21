import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/collection.$userId");

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL: "admin@example.com",
  DB: {} as unknown as D1Database,
};

const mockSessionUser = { id: "sess-1", email: "me@ex.com", name: "Me", picture: null };

const mockProfileUser = {
  id: "target-1",
  name: "Carlos",
  picture: null,
  country: "AR",
  collecting_since: "2005",
};

function makeMockDb(profileUser: object | null, coins: object[] = []) {
  const firstFn = vi.fn().mockResolvedValue(profileUser);
  const allFn = vi.fn().mockResolvedValue({ results: coins });
  const db = {
    prepare: vi.fn()
      .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ first: firstFn }) })
      .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ all: allFn }) }),
  };
  return { db, firstFn, allFn };
}

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

describe("collection.$userId loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect to '/' when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    let thrown: unknown;
    try {
      await loader({
        request: new Request("https://example.com/collection/target-1"),
        context: makeContext(db) as any,
        params: { userId: "target-1" },
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("throws 404 when userId does not exist in DB", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    let thrown: unknown;
    try {
      await loader({
        request: new Request("https://example.com/collection/ghost"),
        context: makeContext(db) as any,
        params: { userId: "ghost" },
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it("returns profileUser and coins", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const coins = [{ id: "c1", name: "1 Peso", user_id: "target-1" }];
    const { db } = makeMockDb(mockProfileUser, coins);
    const result = await loader({
      request: new Request("https://example.com/collection/target-1"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    const data = await result.json();
    expect(data.profileUser.name).toBe("Carlos");
    expect(data.profileUser.country).toBe("AR");
    expect(data.coins).toHaveLength(1);
    expect(data.coins[0].id).toBe("c1");
  });

  it("returns empty filters when no search params", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(mockProfileUser, []);
    const result = await loader({
      request: new Request("https://example.com/collection/target-1"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    const data = await result.json();
    expect(data.filters).toEqual({ q: "", country: "", year: "", condition: "" });
  });

  it("reflects search params in returned filters", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(mockProfileUser, []);
    const result = await loader({
      request: new Request("https://example.com/collection/target-1?q=peso&country=MX&year=1968&condition=MS"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    const data = await result.json();
    expect(data.filters).toEqual({ q: "peso", country: "MX", year: "1968", condition: "MS" });
  });

  it("includes 'from' param in response when present in URL", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(mockProfileUser, []);
    const result = await loader({
      request: new Request("https://example.com/collection/target-1?from=most-pieces"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    const data = await result.json();
    expect(data.from).toBe("most-pieces");
  });

  it("returns empty string for 'from' when not in URL", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(mockProfileUser, []);
    const result = await loader({
      request: new Request("https://example.com/collection/target-1"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    const data = await result.json();
    expect(data.from).toBe("");
  });

  it("applies q filter — SQL contains LIKE and wildcard is bound", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const firstFn = vi.fn().mockResolvedValue(mockProfileUser);
    const allFn = vi.fn().mockResolvedValue({ results: [] });
    const coinBindFn = vi.fn().mockReturnValue({ all: allFn });
    const db = {
      prepare: vi.fn()
        .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ first: firstFn }) })
        .mockReturnValueOnce({ bind: coinBindFn }),
    };
    await loader({
      request: new Request("https://example.com/collection/target-1?q=peso"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("LIKE"));
    expect(coinBindFn).toHaveBeenCalledWith("target-1", "%peso%");
  });

  it("applies country filter — SQL contains country clause", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const firstFn = vi.fn().mockResolvedValue(mockProfileUser);
    const allFn = vi.fn().mockResolvedValue({ results: [] });
    const coinBindFn = vi.fn().mockReturnValue({ all: allFn });
    const db = {
      prepare: vi.fn()
        .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ first: firstFn }) })
        .mockReturnValueOnce({ bind: coinBindFn }),
    };
    await loader({
      request: new Request("https://example.com/collection/target-1?country=MX"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("country"));
    expect(coinBindFn).toHaveBeenCalledWith("target-1", "MX");
  });

  it("parses year filter as integer", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const firstFn = vi.fn().mockResolvedValue(mockProfileUser);
    const allFn = vi.fn().mockResolvedValue({ results: [] });
    const coinBindFn = vi.fn().mockReturnValue({ all: allFn });
    const db = {
      prepare: vi.fn()
        .mockReturnValueOnce({ bind: vi.fn().mockReturnValue({ first: firstFn }) })
        .mockReturnValueOnce({ bind: coinBindFn }),
    };
    await loader({
      request: new Request("https://example.com/collection/target-1?year=1968"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    expect(coinBindFn).toHaveBeenCalledWith("target-1", 1968);
  });

  it("coin query ends with ORDER BY created_at DESC", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockSessionUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(mockProfileUser, []);
    await loader({
      request: new Request("https://example.com/collection/target-1"),
      context: makeContext(db) as any,
      params: { userId: "target-1" },
    });
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY created_at DESC")
    );
  });
});
