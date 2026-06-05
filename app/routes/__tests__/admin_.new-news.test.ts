import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { loader, action } = await import("~/routes/admin_.new-news");

const ADMIN_EMAIL = "admin@example.com";
const mockAdmin = { id: "admin-1", email: ADMIN_EMAIL, name: "Admin", picture: "" };
const mockNonAdmin = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  ADMIN_EMAIL,
  DB: {} as unknown as D1Database,
};

function makeDb(shouldFail = false) {
  const run = shouldFail
    ? vi.fn().mockRejectedValue(new Error("DB error"))
    : vi.fn().mockResolvedValue(undefined);
  const bind = vi.fn().mockReturnValue({ run });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare } as unknown as D1Database, prepare, bind, run };
}

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
  return new Request("https://example.com/admin/new-news", { method: "POST", body: form });
}

function makeGetRequest() {
  return new Request("https://example.com/admin/new-news");
}

function setupAdmin() {
  vi.mocked(authModule.createAuth).mockReturnValue({
    authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
    sessionStorage: {} as any,
  });
}

describe("admin_.new-news loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await loader({ request: makeGetRequest(), context: makeContext(db) as any, params: {} });
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
      await loader({ request: makeGetRequest(), context: makeContext(db) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("returns 200 json for admin", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await loader({ request: makeGetRequest(), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(200);
  });
});

describe("admin_.new-news action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await action({ request: makeFormRequest({ title: "T", body: "B" }), context: makeContext(db) as any, params: {} });
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
      await action({ request: makeFormRequest({ title: "T", body: "B" }), context: makeContext(db) as any, params: {} });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
  });

  it("returns 400 when title is missing", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ title: "", body: "body text" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/obligatorios/);
  });

  it("returns 400 when body is missing", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ title: "Title", body: "" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/obligatorios/);
  });

  it("returns 400 when title exceeds 200 chars", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ title: "x".repeat(201), body: "body" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/200/);
  });

  it("inserts post and redirects to /admin on success", async () => {
    setupAdmin();
    const { db } = makeDb();
    const res = await action({ request: makeFormRequest({ title: "Mi Noticia", body: "Contenido" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin");
  });

  it("calls DB INSERT with correct title and body", async () => {
    setupAdmin();
    const { db, prepare, bind } = makeDb();
    await action({ request: makeFormRequest({ title: "Mi Noticia", body: "Contenido" }), context: makeContext(db) as any, params: {} });
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO posts"));
    expect(bind).toHaveBeenCalledWith("Mi Noticia", "Contenido");
  });

  it("returns 500 when DB throws", async () => {
    setupAdmin();
    const { db } = makeDb(true);
    const res = await action({ request: makeFormRequest({ title: "Mi Noticia", body: "Contenido" }), context: makeContext(db) as any, params: {} });
    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/Error/);
  });
});
