import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { action, loader } = await import("~/routes/api.rewards.claimed");

const mockUser = { id: "user-1", email: "user@example.com", name: "User", picture: "" };
const COIN_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function makeDb() {
  const run = vi.fn().mockResolvedValue({});
  const bind = vi.fn().mockReturnValue({ run });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, run, bind };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  DB: {} as unknown as D1Database,
};

function makeContext(db: ReturnType<typeof makeDb>["db"]) {
  return {
    cloudflare: {
      env: { ...mockEnv, DB: db as unknown as D1Database },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

function makeRequest(body: object = { coinId: COIN_ID, txHash: "0x" + "a".repeat(64) }) {
  return new Request("https://example.com/api/rewards/claimed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("api.rewards.claimed action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(401);
  });

  it("returns 400 when coinId is missing", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({
      request: makeRequest({ txHash: "0xtx" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when txHash is missing", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({
      request: makeRequest({ coinId: COIN_ID }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(res.status).toBe(400);
  });

  it("runs UPDATE filtering by user_id and status=approved", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db, run, bind } = makeDb();
    await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(run).toHaveBeenCalledOnce();
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("status = 'approved'"));
    expect(bind).toHaveBeenCalledWith("0x" + "a".repeat(64), expect.any(Number), COIN_ID, mockUser.id);
  });

  it("returns 400 when txHash has invalid format", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({
      request: makeRequest({ coinId: COIN_ID, txHash: "not-a-hash" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(res.status).toBe(400);
  });

  it("loader returns 405", async () => {
    const res = await loader();
    expect(res.status).toBe(405);
  });

  it("returns { ok: true } on success", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    const res = await action({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(200);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});
