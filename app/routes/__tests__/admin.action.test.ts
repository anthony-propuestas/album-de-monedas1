import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");
vi.mock("~/lib/coins", () => ({
  COINS_BY_COUNTRY: {
    AR: [
      {
        pais: "Argentina",
        denominacion: "1 Peso",
        nombre: "Peso Convertible",
        anio: 1994,
        casa_acunacion: "Casa de Moneda de la Argentina",
      },
    ],
  },
}));

const { action } = await import("~/routes/admin");

const ADMIN_EMAIL = "admin@example.com";
const mockAdmin = { id: "admin-1", email: ADMIN_EMAIL, name: "Admin", picture: "" };
const mockNonAdmin = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

function makeDb(coins: object[] = []) {
  const run = vi.fn().mockResolvedValue(undefined);
  const stmt = { run };
  const bind = vi.fn().mockReturnValue(stmt);
  const all = vi.fn().mockResolvedValue({ results: coins });
  const prepare = vi.fn().mockReturnValue({ bind, all, run });
  const batch = vi.fn().mockResolvedValue([]);
  return { db: { prepare, batch } as unknown as D1Database, prepare, bind, run, all, batch };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL,
  DB: {} as unknown as D1Database,
};

function makeContext(db: D1Database) {
  return {
    cloudflare: {
      env: { ...mockEnv, DB: db },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

function makeFormRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("https://example.com/admin", { method: "POST", body: form });
}

function setupAdmin() {
  vi.mocked(authModule.createAuth).mockReturnValue({
    authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
    sessionStorage: {} as any,
  });
}

describe("admin action", () => {
  beforeEach(() => vi.resetAllMocks());

  // --- auth guard ---

  it("throws redirect when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await action({ request: makeFormRequest({ intent: "create_post", title: "t", body: "b" }), context: makeContext(db) as any, params: {} });
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
      await action({ request: makeFormRequest({ intent: "create_post", title: "t", body: "b" }), context: makeContext(db) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  // --- create_post ---

  it("returns 400 when title is missing", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "create_post", title: "", body: "body text" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/obligatorios/);
  });

  it("returns 400 when body is missing", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "create_post", title: "Title", body: "" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/obligatorios/);
  });

  it("returns 400 when title exceeds 200 chars", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "create_post", title: "x".repeat(201), body: "body" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/200/);
  });

  it("inserts post and redirects to /admin on create_post", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "create_post", title: "My Post", body: "Post body" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin");
  });

  it("calls DB INSERT with correct title and body", async () => {
    setupAdmin();
    const { db, prepare, bind } = makeDb();
    await action({ request: makeFormRequest({ intent: "create_post", title: "My Post", body: "Post body" }), context: makeContext(db) as any, params: {} });
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO posts"));
    expect(bind).toHaveBeenCalledWith("My Post", "Post body");
  });

  // --- delete_post ---

  it("deletes post and redirects to /admin", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "delete_post", id: "5" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin");
  });

  it("redirects without calling DB DELETE for invalid id", async () => {
    setupAdmin();
    const { db, run } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "delete_post", id: "0" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(302);
    expect(run).not.toHaveBeenCalled();
  });

  // --- fix_registry_match ---

  it("queries all coins from DB for fix_registry_match", async () => {
    setupAdmin();
    const { db, prepare } = makeDb([]);
    await action({ request: makeFormRequest({ intent: "fix_registry_match" }), context: makeContext(db) as any, params: {} });
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("SELECT id, country, denomination, name, year FROM coins"));
  });

  it("returns { fixed, total } for fix_registry_match", async () => {
    setupAdmin();
    const coins = [
      { id: "1", country: "AR", denomination: "1 Peso", name: "Peso Convertible", year: 1994 },
      { id: "2", country: "AR", denomination: "5 Pesos", name: "Unknown", year: 1900 },
    ];
    const { db } = makeDb(coins);
    const res = await action({ request: makeFormRequest({ intent: "fix_registry_match" }), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { fixed: number; total: number };
    expect(data.total).toBe(2);
    expect(data.fixed).toBe(1);
  });

  it("fixed=0 when no coin matches the catalog", async () => {
    setupAdmin();
    const coins = [
      { id: "1", country: "AR", denomination: "50 Pesos", name: "No Match", year: 1850 },
    ];
    const { db } = makeDb(coins);
    const res = await action({ request: makeFormRequest({ intent: "fix_registry_match" }), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { fixed: number; total: number };
    expect(data.fixed).toBe(0);
    expect(data.total).toBe(1);
  });

  it("fixed=1 when one coin matches the catalog", async () => {
    setupAdmin();
    const coins = [
      { id: "1", country: "AR", denomination: "1 Peso", name: "Peso Convertible", year: 1994 },
    ];
    const { db } = makeDb(coins);
    const res = await action({ request: makeFormRequest({ intent: "fix_registry_match" }), context: makeContext(db) as any, params: {} });
    const data = await res.json() as { fixed: number; total: number };
    expect(data.fixed).toBe(1);
    expect(data.total).toBe(1);
  });

  it("calls db.batch with UPDATE statements for fix_registry_match", async () => {
    setupAdmin();
    const coins = [
      { id: "1", country: "AR", denomination: "1 Peso", name: "Peso Convertible", year: 1994 },
    ];
    const { db, batch } = makeDb(coins);
    await action({ request: makeFormRequest({ intent: "fix_registry_match" }), context: makeContext(db) as any, params: {} });
    expect(batch).toHaveBeenCalled();
  });

  // --- unknown intent ---

  it("returns 400 for unknown intent", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ intent: "unknown_intent" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("Acción no reconocida.");
  });
});
