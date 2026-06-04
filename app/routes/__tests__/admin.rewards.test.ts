import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader } = await import("~/routes/admin.rewards");

const ADMIN_EMAIL = "admin@example.com";
const mockAdmin = { id: "admin-1", email: ADMIN_EMAIL, name: "Admin", picture: "" };
const mockNonAdmin = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

const mockClaims = [
  {
    id: "claim-1",
    user_id: "user-1",
    coin_id: "coin-1",
    coin_registry_key: "AR|1 Peso|Peso Nacional|1960",
    wallet_address: "0xwallet",
    created_at: 1700000000,
    country: "AR",
    denomination: "1 Peso",
    name: "Peso Nacional",
    year: 1960,
    photo_obverse: null,
  },
];

function makeDb(results: object[] = mockClaims) {
  const all = vi.fn().mockResolvedValue({ results });
  const prepare = vi.fn().mockReturnValue({ all });
  return { db: { prepare } };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL,
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

function makeRequest() {
  return new Request("https://example.com/admin/rewards");
}

describe("admin.rewards loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
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
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("returns claims for admin user", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb(mockClaims);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { claims: typeof mockClaims };
    expect(data.claims).toEqual(mockClaims);
  });

  it("returns empty array when no pending claims", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb([]);
    const res = await loader({ request: makeRequest(), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { claims: [] };
    expect(data.claims).toEqual([]);
  });
});
