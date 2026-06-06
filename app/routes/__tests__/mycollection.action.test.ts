import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");
vi.mock("~/lib/rateLimit.server", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
}));

const { action } = await import("~/routes/mycollection");

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
  beforeEach(() => vi.clearAllMocks());

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
      request: makeRequest({ intent: "unknown_xyz" }),
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
    const bindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
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

    const bindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
    // last 5 are [photo_obverse, photo_reverse, photo_edge, photo_detail, registry_match]
    expect(bindArgs.slice(-5, -1)).toEqual([null, null, null, null]);
  });

  it("uploads photo_obverse to R2 and stores its key in DB", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const images = makeMockImages();
    const { db, prepareObj } = makeMockDb();
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const file = new File([jpegBytes], "front.jpg", { type: "image/jpeg" });
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
    const bindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
    // bind order: ..., photo_obverse, photo_reverse, photo_edge, photo_detail, registry_match
    const photoObverse = bindArgs[bindArgs.length - 5] as string;
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

    const bindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
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

    const bindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
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

describe("mycollection action — edit_coin intent", () => {
  const mockCoinRow = {
    id: "coin-abc",
    user_id: "user-123",
    name: "1 Peso",
    country: "MX",
    year: 1964,
    denomination: "1 Peso",
    condition: "VF",
    mint: null,
    catalog_ref: null,
    estimated_value: null,
    notes: null,
    photo_obverse: null,
    photo_reverse: null,
    photo_edge: null,
    photo_detail: null,
    created_at: 0,
    for_sale: 0,
    asking_price: null,
    registry_match: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
  });

  it("returns 400 when coin_id is missing", async () => {
    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "edit_coin", name: "Peso" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toContain("ID requerido");
  });

  it("returns 404 when coin is not found in DB", async () => {
    const { db } = makeMockDb();
    // bindObj.first defaults to null — coin not found
    const result = await action({
      request: makeRequest({ intent: "edit_coin", coin_id: "coin-abc", name: "Peso" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(404);
  });

  it("returns 403 when coin has an active pending claim", async () => {
    const { db, bindObj } = makeMockDb();
    bindObj.first
      .mockResolvedValueOnce(mockCoinRow)
      .mockResolvedValueOnce({ status: "pending" });
    const result = await action({
      request: makeRequest({ intent: "edit_coin", coin_id: "coin-abc", name: "Peso" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(403);
    const data = await result.json();
    expect(data.error).toContain("verificación");
  });

  it("redirects to /mycollection after successful update", async () => {
    const { db, bindObj } = makeMockDb();
    bindObj.first.mockResolvedValueOnce(mockCoinRow);
    // second call (claim check) uses default null
    const result = await action({
      request: makeRequest({ intent: "edit_coin", coin_id: "coin-abc", name: "Peso Editado" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/mycollection");
  });

  it("calls DB UPDATE (not INSERT) with coin_id and user_id in bind args", async () => {
    const { db, prepareObj, bindObj } = makeMockDb();
    bindObj.first.mockResolvedValueOnce(mockCoinRow);
    await action({
      request: makeRequest({ intent: "edit_coin", coin_id: "coin-abc", name: "Peso Editado" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE coins SET"));
    const updateBindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
    expect(updateBindArgs).toContain("coin-abc");
    expect(updateBindArgs).toContain(mockUser.id);
  });

  it("keeps existing photo key when no new file is submitted", async () => {
    const coinWithPhoto = { ...mockCoinRow, photo_obverse: "user-123/coin-abc/photo_obverse" };
    const { db, prepareObj, bindObj } = makeMockDb();
    bindObj.first.mockResolvedValueOnce(coinWithPhoto);
    await action({
      request: makeRequest({ intent: "edit_coin", coin_id: "coin-abc", name: "Peso" }),
      context: makeContext(db) as any,
      params: {},
    });
    const updateBindArgs: unknown[] = prepareObj.bind.mock.calls.at(-1)!;
    expect(updateBindArgs).toContain("user-123/coin-abc/photo_obverse");
  });

  it("does not call images.delete or images.put when no new file is submitted", async () => {
    const { db, bindObj } = makeMockDb();
    const images = { put: vi.fn(), delete: vi.fn() };
    bindObj.first.mockResolvedValueOnce({ ...mockCoinRow, photo_obverse: "user-123/coin-abc/photo_obverse" });
    await action({
      request: makeRequest({ intent: "edit_coin", coin_id: "coin-abc", name: "Peso" }),
      context: makeContext(db, images as any) as any,
      params: {},
    });
    expect(images.put).not.toHaveBeenCalled();
    expect(images.delete).not.toHaveBeenCalled();
  });

  it("uploads new photo and deletes old one when a valid JPEG is provided", async () => {
    const coinWithPhoto = { ...mockCoinRow, photo_obverse: "user-123/coin-abc/photo_obverse" };
    const { db, bindObj } = makeMockDb();
    const images = { put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined) };
    bindObj.first.mockResolvedValueOnce(coinWithPhoto);

    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const file = new File([jpegBytes], "new.jpg", { type: "image/jpeg" });
    const body = new FormData();
    body.append("intent", "edit_coin");
    body.append("coin_id", "coin-abc");
    body.append("name", "Peso");
    body.append("photo_obverse", file);
    const request = new Request("https://example.com/mycollection", { method: "POST", body });

    await action({ request, context: makeContext(db, images as any) as any, params: {} });

    expect(images.delete).toHaveBeenCalledWith("user-123/coin-abc/photo_obverse");
    expect(images.put).toHaveBeenCalledWith(
      expect.stringContaining("photo_obverse"),
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: "image/jpeg" } }
    );
  });
});
