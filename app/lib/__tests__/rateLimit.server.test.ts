import { checkRateLimit } from "~/lib/rateLimit.server";

const FIXED_NOW_SECS = 3700; // 1h 1m 40s → windowStart = 3600, retryAfter = 3500

function makeDb(count: number) {
  const first = vi.fn().mockResolvedValue({ count });
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare } as unknown as D1Database, first, bind, prepare };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW_SECS * 1000);
});
afterAll(() => vi.useRealTimers());

describe("checkRateLimit", () => {
  it("allows when count is below limit", async () => {
    const { db } = makeDb(1);
    const result = await checkRateLimit(db, "user-1", "upload", 5, 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows when count equals limit exactly", async () => {
    const { db } = makeDb(5);
    const result = await checkRateLimit(db, "user-1", "upload", 5, 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("blocks when count exceeds limit", async () => {
    const { db } = makeDb(6);
    const result = await checkRateLimit(db, "user-1", "upload", 5, 1);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct retryAfterSeconds when blocked", async () => {
    const { db } = makeDb(6);
    const result = await checkRateLimit(db, "user-1", "upload", 5, 1);
    // windowStart=3600, windowSecs=3600, now=3700 → retryAfter=3500
    expect(result.retryAfterSeconds).toBe(3500);
  });

  it("clamps remaining to 0 when count exceeds limit by more than 1", async () => {
    const { db } = makeDb(20);
    const result = await checkRateLimit(db, "user-1", "upload", 5, 1);
    expect(result.remaining).toBe(0);
  });

  it("calls prepare with bind params (no string interpolation)", async () => {
    const { db, prepare, bind } = makeDb(1);
    await checkRateLimit(db, "user-42", "claim", 3, 2);
    expect(prepare).toHaveBeenCalledOnce();
    expect(bind).toHaveBeenCalledWith("user-42", "claim", expect.any(Number));
  });

  it("falls back to count 1 when db returns null", async () => {
    const first = vi.fn().mockResolvedValue(null);
    const bind = vi.fn().mockReturnValue({ first });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;
    const result = await checkRateLimit(db, "user-1", "upload", 5, 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
