const { loader } = await import("~/routes/_index");

function makeMockDb(usersCount: number | null, coinsCount: number | null) {
  return {
    prepare: vi.fn((sql: string) => ({
      first: vi.fn().mockResolvedValue(
        sql.includes("users")
          ? usersCount !== null ? { count: usersCount } : null
          : coinsCount !== null ? { count: coinsCount } : null
      ),
    })),
  };
}

function makeContext(db: ReturnType<typeof makeMockDb>) {
  return {
    cloudflare: {
      env: { DB: db as unknown as D1Database },
    },
  };
}

describe("_index loader", () => {
  it("returns totalUsers and totalCoins from the database", async () => {
    const db = makeMockDb(10, 25);
    const result = await loader({ context: makeContext(db) as any, request: new Request("https://example.com/"), params: {} });
    const data = await result.json();
    expect(data.totalUsers).toBe(10);
    expect(data.totalCoins).toBe(25);
  });

  it("defaults totalUsers to 0 when DB returns null", async () => {
    const db = makeMockDb(null, 5);
    const result = await loader({ context: makeContext(db) as any, request: new Request("https://example.com/"), params: {} });
    const data = await result.json();
    expect(data.totalUsers).toBe(0);
  });

  it("defaults totalCoins to 0 when DB returns null", async () => {
    const db = makeMockDb(3, null);
    const result = await loader({ context: makeContext(db) as any, request: new Request("https://example.com/"), params: {} });
    const data = await result.json();
    expect(data.totalCoins).toBe(0);
  });

  it("queries both users and coins tables", async () => {
    const db = makeMockDb(0, 0);
    await loader({ context: makeContext(db) as any, request: new Request("https://example.com/"), params: {} });
    const calls: string[] = db.prepare.mock.calls.map((c: [string]) => c[0]);
    expect(calls.some((sql) => sql.includes("FROM users"))).toBe(true);
    expect(calls.some((sql) => sql.includes("FROM coins"))).toBe(true);
  });

  it("issues exactly two DB queries", async () => {
    const db = makeMockDb(0, 0);
    await loader({ context: makeContext(db) as any, request: new Request("https://example.com/"), params: {} });
    expect(db.prepare).toHaveBeenCalledTimes(2);
  });
});
