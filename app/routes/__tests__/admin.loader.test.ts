import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/admin");

const ADMIN_EMAIL = "admin@example.com";
const mockAdmin = { id: "admin-1", email: ADMIN_EMAIL, name: "Admin", picture: "" };
const mockNonAdmin = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

const mockPosts = [
  { id: 1, title: "Post 1", created_at: 1700000000 },
  { id: 2, title: "Post 2", created_at: 1700001000 },
];

function makeDb(posts: object[] = mockPosts, chatMessages: object[] = [], shouldFail = false) {
  const all = shouldFail
    ? vi.fn().mockRejectedValue(new Error("DB error"))
    : vi.fn()
        .mockResolvedValueOnce({ results: posts })
        .mockResolvedValueOnce({ results: chatMessages });
  const prepare = vi.fn().mockReturnValue({ all });
  return { prepare };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL,
  DB: {} as unknown as D1Database,
};

function makeContext(db: ReturnType<typeof makeDb>) {
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
  return new Request("https://example.com/admin");
}

describe("admin loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(makeDb()) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("throws redirect when user is not admin", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockNonAdmin) } as any,
      sessionStorage: {} as any,
    });
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(makeDb()) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("returns user and posts for admin", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const db = makeDb(mockPosts);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { user: typeof mockAdmin; posts: typeof mockPosts };
    expect(data.user).toEqual(mockAdmin);
    expect(data.posts).toEqual(mockPosts);
  });

  it("returns empty posts array when DB has no posts", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const db = makeDb([]);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { posts: [] };
    expect(data.posts).toEqual([]);
  });

  it("returns chatMessages array in response", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const db = makeDb(mockPosts, []);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { chatMessages: unknown[] };
    expect(Array.isArray(data.chatMessages)).toBe(true);
    expect(data.chatMessages).toEqual([]);
  });

  it("returns chatMessages with data from DB", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const mockMsg = { id: 1, user_name: "Alice", message: "Hola", created_at: 1000000 };
    const db = makeDb(mockPosts, [mockMsg]);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { chatMessages: typeof mockMsg[] };
    expect(data.chatMessages).toEqual([mockMsg]);
  });

  it("throws 500 Response when DB fails", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(makeDb([], [], true)) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(500);
  });
});
