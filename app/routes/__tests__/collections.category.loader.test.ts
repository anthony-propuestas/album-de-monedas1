import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/collections.$category");

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL: "admin@example.com",
  DB: {} as unknown as D1Database,
};

const mockUser = { id: "u1", email: "t@t.com", name: "Test", picture: null };

function makeMockDb(rows: object[] = []) {
  const allFn = vi.fn().mockResolvedValue({ results: rows });
  const bindObj = { all: allFn };
  const prepareObj = { bind: vi.fn().mockReturnValue(bindObj) };
  const db = { prepare: vi.fn().mockReturnValue(prepareObj) };
  return { db, prepareObj, allFn };
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

describe("collections.$category loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect to '/' when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    let thrown: unknown;
    try {
      await loader({
        request: new Request("https://example.com/collections/most-pieces"),
        context: makeContext(db) as any,
        params: { category: "most-pieces" },
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("throws 404 Response for an invalid category slug", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    let thrown: unknown;
    try {
      await loader({
        request: new Request("https://example.com/collections/invalid-slug"),
        context: makeContext(db) as any,
        params: { category: "invalid-slug" },
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it("returns category title and description for most-pieces", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const result = await loader({
      request: new Request("https://example.com/collections/most-pieces"),
      context: makeContext(db) as any,
      params: { category: "most-pieces" },
    });
    const data = await result.json();
    expect(data.category.title).toBe("Mayor cantidad de piezas");
    expect(data.category.description).toBeTruthy();
    expect(data.category.slug).toBe("most-pieces");
  });

  it("binds 10 as LIMIT for the top-10 query", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db, prepareObj } = makeMockDb();
    await loader({
      request: new Request("https://example.com/collections/most-pieces"),
      context: makeContext(db) as any,
      params: { category: "most-pieces" },
    });
    expect(prepareObj.bind).toHaveBeenCalledWith(10);
  });

  it("returns empty collectors array when DB has no rows", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb([]);
    const result = await loader({
      request: new Request("https://example.com/collections/oldest"),
      context: makeContext(db) as any,
      params: { category: "oldest" },
    });
    const data = await result.json();
    expect(data.collectors).toEqual([]);
  });

  it("maps DB rows to collectors with userId, name, picture, stat", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const rows = [
      { id: "u1", name: "Ana", picture: null, stat: 42 },
      { id: "u2", name: "Bob", picture: "https://p.com/img.jpg", stat: 30 },
    ];
    const { db } = makeMockDb(rows);
    const result = await loader({
      request: new Request("https://example.com/collections/most-pieces"),
      context: makeContext(db) as any,
      params: { category: "most-pieces" },
    });
    const data = await result.json();
    expect(data.collectors).toHaveLength(2);
    expect(data.collectors[0].userId).toBe("u1");
    expect(data.collectors[0].name).toBe("Ana");
    expect(data.collectors[0].stat).toBe("42 piezas");
    expect(data.collectors[1].userId).toBe("u2");
    expect(data.collectors[1].picture).toBe("https://p.com/img.jpg");
    expect(data.collectors[1].stat).toBe("30 piezas");
  });

  it("applies statLabel — oldest formats year with 'Desde'", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const rows = [{ id: "u1", name: "Eva", picture: null, stat: 1902 }];
    const { db } = makeMockDb(rows);
    const result = await loader({
      request: new Request("https://example.com/collections/oldest"),
      context: makeContext(db) as any,
      params: { category: "oldest" },
    });
    const data = await result.json();
    expect(data.collectors[0].stat).toBe("Desde 1902");
  });

  it.each([
    "most-pieces", "oldest", "highest-value", "most-countries",
    "best-condition", "most-active", "most-denominations", "veteran",
  ])("resolves with status 200 for valid slug '%s'", async (slug) => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb([]);
    const result = await loader({
      request: new Request(`https://example.com/collections/${slug}`),
      context: makeContext(db) as any,
      params: { category: slug },
    });
    expect(result.status).toBe(200);
  });
});
