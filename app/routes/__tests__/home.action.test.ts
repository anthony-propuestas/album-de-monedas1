import * as authModule from "~/lib/auth.server";
import type { Env } from "~/types/env";

vi.mock("~/lib/auth.server");

const { action } = await import("~/routes/home");

function makeMockDb() {
  const bindObj = {
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({}),
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

function makeRequest(formData: Record<string, string>) {
  const body = new URLSearchParams(formData);
  return new Request("https://example.com/home", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

const mockUser = {
  id: "user-123",
  email: "user@example.com",
  name: "John Doe",
  picture: "https://example.com/pic.jpg",
};

describe("home action", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws redirect to '/' when user is not authenticated", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(null) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    let thrown: unknown;
    try {
      await action({
        request: makeRequest({ intent: "complete_profile" }),
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

  it("returns error for unknown intent", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "unknown_action" }),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.error).toBe("Acción no reconocida.");
  });

  it("returns error when name is missing", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "",
        country: "AR",
        collecting_since: "iniciante",
        goals: "aprender",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.error).toBe("Todos los campos son obligatorios.");
  });

  it("returns error when country is missing", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "John Doe",
        country: "",
        collecting_since: "iniciante",
        goals: "aprender",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.error).toBe("Todos los campos son obligatorios.");
  });

  it("returns error when goals is missing", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "John Doe",
        country: "AR",
        collecting_since: "iniciante",
        goals: "",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.error).toBe("Todos los campos son obligatorios.");
  });

  it("returns { success: true } when all fields are provided", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "John Doe",
        country: "AR",
        collecting_since: "iniciante",
        goals: "aprender,networking",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    const data = await result.json();
    expect(data.success).toBe(true);
  });

  it("calls DB UPDATE with correct field values", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj, bindObj } = makeMockDb();
    await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "John Doe",
        country: "AR",
        collecting_since: "iniciante",
        goals: "aprender",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE users SET"));
    expect(prepareObj.bind).toHaveBeenCalledWith(
      "John Doe",
      "AR",
      "iniciante",
      "aprender",
      mockUser.id
    );
    expect(bindObj.run).toHaveBeenCalled();
  });

  it("does not call DB when validation fails", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, bindObj } = makeMockDb();
    await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "",
        country: "AR",
        collecting_since: "iniciante",
        goals: "aprender",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    expect(bindObj.run).not.toHaveBeenCalled();
  });

  // --- send_chat ---

  it("send_chat: returns { ok: true } for a valid message", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "send_chat", message: "Hola mundo" }),
      context: makeContext(db) as any,
      params: {},
    });
    const data = await result.json();
    expect(data.ok).toBe(true);
  });

  it("send_chat: calls INSERT INTO chat_messages with user data and message", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db, prepareObj, bindObj } = makeMockDb();
    await action({
      request: makeRequest({ intent: "send_chat", message: "Test message" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO chat_messages"));
    expect(prepareObj.bind).toHaveBeenCalledWith(mockUser.id, mockUser.name, mockUser.picture, "Test message");
    expect(bindObj.run).toHaveBeenCalled();
  });

  it("send_chat: returns 400 and no DB call for empty message", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "send_chat", message: "" }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBeDefined();
    const insertCalls = (db.prepare.mock.calls as string[][]).filter(([sql]) =>
      sql.includes("INSERT INTO chat_messages")
    );
    expect(insertCalls.length).toBe(0);
  });

  it("send_chat: returns 400 for whitespace-only message", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({ intent: "send_chat", message: "   " }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(400);
  });

  it("returns 400 when country is not in the ISO whitelist", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });
    const { db } = makeMockDb();
    const result = await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "John Doe",
        country: "XX",
        collecting_since: "iniciante",
        goals: "aprender",
      }),
      context: makeContext(db) as any,
      params: {},
    });
    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toMatch(/pa[ií]s/i);
  });

  it("trims whitespace from fields", async () => {
    vi.mocked(authModule.createAuth).mockReturnValue({
      authenticator: { isAuthenticated: vi.fn().mockResolvedValue(mockUser) } as any,
      sessionStorage: {} as any,
    });

    const { db, prepareObj } = makeMockDb();
    await action({
      request: makeRequest({
        intent: "complete_profile",
        name: "  John Doe  ",
        country: "  AR  ",
        collecting_since: "  iniciante  ",
        goals: "  aprender  ",
      }),
      context: makeContext(db) as any,
      params: {},
    });

    expect(prepareObj.bind).toHaveBeenCalledWith(
      "John Doe",
      "AR",
      "iniciante",
      "aprender",
      mockUser.id
    );
  });
});
