import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { action } = await import("~/routes/admin.rewards.$id.reject");

const ADMIN_EMAIL = "admin@example.com";
const mockAdmin = { id: "admin-1", email: ADMIN_EMAIL, name: "Admin", picture: "" };
const mockNonAdmin = { id: "user-1", email: "user@example.com", name: "User", picture: "" };

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

function makeRequest(rejectReason = "No coincide con el registro") {
  const form = new FormData();
  form.set("reject_reason", rejectReason);
  return new Request("https://example.com/admin/rewards/claim-1/reject", {
    method: "POST",
    body: form,
  });
}

describe("admin.rewards.$id.reject action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect to / when unauthenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await action({ request: makeRequest(), context: makeContext(db) as any, params: { id: "claim-1" } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("throws redirect to / when user is not admin", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockNonAdmin) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeDb();
    let thrown: unknown;
    try {
      await action({ request: makeRequest(), context: makeContext(db) as any, params: { id: "claim-1" } });
    } catch (e) {
      thrown = e;
    }
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("runs UPDATE and redirects to /admin/rewards for admin", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const { db, run } = makeDb();
    let thrown: unknown;
    try {
      await action({ request: makeRequest(), context: makeContext(db) as any, params: { id: "claim-1" } });
    } catch (e) {
      thrown = e;
    }
    expect(run).toHaveBeenCalledOnce();
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe("/admin/rewards");
  });

  it("passes reject_reason to the UPDATE query", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const { db, bind } = makeDb();
    try {
      await action({
        request: makeRequest("Foto borrosa"),
        context: makeContext(db) as any,
        params: { id: "claim-1" },
      });
    } catch {}
    expect(bind).toHaveBeenCalledWith(expect.anything(), "Foto borrosa", "claim-1");
  });

  it("uses fallback reason when reject_reason is absent", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockAdmin) } as any,
      sessionStorage: {} as any,
    });
    const { db, bind } = makeDb();
    const form = new FormData();
    const req = new Request("https://example.com/admin/rewards/claim-1/reject", {
      method: "POST",
      body: form,
    });
    try {
      await action({ request: req, context: makeContext(db) as any, params: { id: "claim-1" } });
    } catch {}
    const reasonArg = (bind as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(reasonArg).toBe("Sin motivo");
  });
});
