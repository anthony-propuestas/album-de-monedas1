import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/collections._index");

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL: "admin@example.com",
  DB: {} as unknown as D1Database,
};

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  picture: null,
};

function makeMockDb(topUser: object | null = null) {
  const firstFn = vi.fn().mockResolvedValue(topUser);
  const bindObj = { first: firstFn };
  const prepareObj = { bind: vi.fn().mockReturnValue(bindObj) };
  const db = { prepare: vi.fn().mockReturnValue(prepareObj) };
  return { db, firstFn, prepareObj };
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

function makeRequest() {
  return new Request("https://example.com/collections");
}

describe("collections._index loader", () => {
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

  it("returns exactly 8 previews", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await result.json();
    expect(data.previews).toHaveLength(8);
  });

  it("calls DB prepare exactly 8 times — one per category", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(db.prepare).toHaveBeenCalledTimes(8);
  });

  it("binds 1 as LIMIT for every preview query", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db, prepareObj } = makeMockDb(null);
    await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    for (const call of prepareObj.bind.mock.calls) {
      expect(call[0]).toBe(1);
    }
  });

  it("each preview has the required shape", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const { previews } = await result.json();
    for (const p of previews) {
      expect(p).toHaveProperty("slug");
      expect(p).toHaveProperty("title");
      expect(p).toHaveProperty("description");
      expect(p).toHaveProperty("iconKey");
      expect(p).toHaveProperty("topName");
      expect(p).toHaveProperty("topPicture");
      expect(p).toHaveProperty("topStat");
    }
  });

  it("topName and topStat are null when DB returns no top user", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const { previews } = await result.json();
    for (const p of previews) {
      expect(p.topName).toBeNull();
      expect(p.topStat).toBeNull();
    }
  });

  it("populates topName and topStat when DB returns a top user", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const topUser = { id: "u1", name: "Ana López", picture: null, stat: 100 };
    const { db } = makeMockDb(topUser);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const { previews } = await result.json();
    for (const p of previews) {
      expect(p.topName).toBe("Ana López");
      expect(p.topStat).not.toBeNull();
    }
  });

  it("all 8 category slugs are present in the response", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb(null);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const { previews } = await result.json();
    const slugs = previews.map((p: { slug: string }) => p.slug);
    const expected = [
      "most-pieces", "oldest", "highest-value", "most-countries",
      "best-condition", "most-active", "most-denominations", "veteran",
    ];
    for (const s of expected) {
      expect(slugs).toContain(s);
    }
  });

  it("topPicture reflects the picture from DB", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const topUser = { id: "u1", name: "Carlos", picture: "https://example.com/pic.jpg", stat: 50 };
    const { db } = makeMockDb(topUser);
    const result = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const { previews } = await result.json();
    for (const p of previews) {
      expect(p.topPicture).toBe("https://example.com/pic.jpg");
    }
  });
});
