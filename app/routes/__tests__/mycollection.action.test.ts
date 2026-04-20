import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { action } = await import("~/routes/mycollection");

function makeMockDb() {
  const bindObj = { run: vi.fn().mockResolvedValue({}) };
  const prepareObj = { bind: vi.fn().mockReturnValue(bindObj) };
  const db = { prepare: vi.fn().mockReturnValue(prepareObj) };
  return { db, prepareObj, bindObj };
}

function makeMockImages() {
  return { put: vi.fn().mockResolvedValue(undefined) };
}

const mockEnv: Env = {
  GOOGLE_CLIENT_ID: "x",
  GOOGLE_CLIENT_SECRET: "x",
  SESSION_SECRET: "x",
  DB: {} as unknown as D1Database,
};

function makeContext(
  db: ReturnType<typeof makeMockDb>["db"],
  images?: ReturnType<typeof makeMockImages>
) {
  return {
    cloudflare: {
      env: {
        ...mockEnv,
        DB: db as unknown as D1Database,
        IMAGES: images as unknown as R2Bucket | undefined,
      },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

function makeRequest(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    body.append(key, val);
  }
  return new Request("https://example.com/mycollection", { method: "POST", body });
}

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  name: "John Doe",
  picture: "https://example.com/pic.jpg",
};

describe("mycollection action", () => {
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
        request: makeRequest({ intent: "add_coin", name: "Peso" }),
        context: makeContext(db) as any,
        params: {},
      });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("returns 400 for unknown intent", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "delete_coin" }),
      context: makeContext(db) as any,
      params: {},
    });

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBe("Acción no reconocida.");
  });

  it("redirects to /mycollection after successful insert", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "add_coin", name: "1 Peso" }),
      context: makeContext(db) as any,
      params: {},
    });

    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/mycollection");
  });

  it("calls DB INSERT with user_id and coin name", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj, bindObj } = makeMockDb();
    await action({
      request: makeRequest({ intent: "add_coin", name: "1 Peso 1964" }),
      context: makeContext(db) as any,
      params: {},
    });

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO coins"));
    const bindArgs: unknown[] = prepareObj.bind.mock.calls[0];
    expect(bindArgs).toContain(mockUser.id);
    expect(bindArgs).toContain("1 Peso 1964");
    expect(bindObj.run).toHaveBeenCalled();
  });

  it("stores null for all photos when IMAGES binding is absent", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await action({
      request: makeRequest({ intent: "add_coin", name: "Peso" }),
      context: makeContext(db, undefined) as any,
      params: {},
    });

    const bindArgs: unknown[] = prepareObj.bind.mock.calls[0];
    expect(bindArgs.slice(-4)).toEqual([null, null, null, null]);
  });

  it("uploads photo_obverse to R2 and stores its key in DB", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const images = makeMockImages();
    const { db, prepareObj } = makeMockDb();
    const file = new File(["img-data"], "front.jpg", { type: "image/jpeg" });
    const body = new FormData();
    body.append("intent", "add_coin");
    body.append("name", "Peso");
    body.append("photo_obverse", file);
    const request = new Request("https://example.com/mycollection", { method: "POST", body });

    await action({ request, context: makeContext(db, images) as any, params: {} });

    expect(images.put).toHaveBeenCalledWith(
      expect.stringContaining(mockUser.id),
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: "image/jpeg" } }
    );
    const bindArgs: unknown[] = prepareObj.bind.mock.calls[0];
    const photoObverse = bindArgs[bindArgs.length - 4] as string;
    expect(photoObverse).not.toBeNull();
    expect(photoObverse).toContain(mockUser.id);
    expect(photoObverse).toContain("photo_obverse");
  });

  it("parses year as integer and estimated_value as float", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await action({
      request: makeRequest({ intent: "add_coin", name: "Peso", year: "1964", estimated_value: "25.50" }),
      context: makeContext(db) as any,
      params: {},
    });

    const bindArgs: unknown[] = prepareObj.bind.mock.calls[0];
    expect(bindArgs).toContain(1964);
    expect(bindArgs).toContain(25.5);
  });

  it("stores null for empty optional text fields", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await action({
      request: makeRequest({ intent: "add_coin", name: "Peso" }),
      context: makeContext(db) as any,
      params: {},
    });

    const bindArgs: unknown[] = prepareObj.bind.mock.calls[0];
    // country, denomination, condition, mint, catalog_ref are null when not submitted
    expect(bindArgs).toContain(null);
  });

  it("does not upload to R2 when file is empty", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const images = makeMockImages();
    const { db } = makeMockDb();
    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
    const body = new FormData();
    body.append("intent", "add_coin");
    body.append("name", "Peso");
    body.append("photo_obverse", emptyFile);
    const request = new Request("https://example.com/mycollection", { method: "POST", body });

    await action({ request, context: makeContext(db, images) as any, params: {} });

    expect(images.put).not.toHaveBeenCalled();
  });
});
