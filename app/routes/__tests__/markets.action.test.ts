import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { action } = await import("~/routes/markets");

const mockUser = { id: "user-123", email: "user@example.com", name: "John", picture: "" };
const SELLER_ID = "seller-456";

function makeMockDb() {
  const bindObj = {
    run: vi.fn().mockResolvedValue({}),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
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

function makeRequest(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, val] of Object.entries(fields)) body.append(key, val);
  return new Request("https://example.com/markets", { method: "POST", body });
}

describe("markets action — contact_seller", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect to '/' when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    let thrown: unknown;
    try {
      await action({
        request: makeRequest({ intent: "contact_seller", coin_id: "c1", seller_id: SELLER_ID, message: "Hola" }),
        context: makeContext(db) as any,
        params: {},
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("returns error when coin_id is missing", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const res = await action({
      request: makeRequest({ intent: "contact_seller", seller_id: SELLER_ID, message: "Hola" }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/inv[aá]li/i);
  });

  it("returns error when message is empty", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const res = await action({
      request: makeRequest({ intent: "contact_seller", coin_id: "c1", seller_id: SELLER_ID, message: "" }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/vac[ií]o/i);
  });

  it("returns error when contacting self", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const res = await action({
      request: makeRequest({ intent: "contact_seller", coin_id: "c1", seller_id: mockUser.id, message: "Hola" }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/vos mismo/i);
  });

  it("returns error when buyer_contact exceeds 200 chars", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const res = await action({
      request: makeRequest({
        intent: "contact_seller",
        coin_id: "c1",
        seller_id: SELLER_ID,
        message: "Hola",
        buyer_contact: "x".repeat(201),
      }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/buyer_contact/i);
  });

  it("returns error when message exceeds 1000 chars", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const res = await action({
      request: makeRequest({
        intent: "contact_seller",
        coin_id: "c1",
        seller_id: SELLER_ID,
        message: "x".repeat(1001),
      }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await res.json() as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/largo/i);
  });

  it("returns { ok: true } on success", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const res = await action({
      request: makeRequest({ intent: "contact_seller", coin_id: "c1", seller_id: SELLER_ID, message: "Hola, ¿está disponible?" }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await res.json() as { ok: boolean; error: null };
    expect(data.ok).toBe(true);
    expect(data.error).toBeNull();
  });
});
