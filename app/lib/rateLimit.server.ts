interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  db: D1Database,
  userId: string,
  action: string,
  maxCount: number,
  windowHours: number
): Promise<RateLimitResult> {
  const windowSecs = windowHours * 3600;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSecs) * windowSecs;

  const row = await db
    .prepare(
      `INSERT INTO rate_limits (user_id, action, window_start, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, action, window_start)
       DO UPDATE SET count = count + 1
       RETURNING count`
    )
    .bind(userId, action, windowStart)
    .first<{ count: number }>();

  const count = row?.count ?? 1;
  const allowed = count <= maxCount;
  const retryAfterSeconds = allowed ? 0 : windowStart + windowSecs - now;

  return { allowed, remaining: Math.max(0, maxCount - count), retryAfterSeconds };
}
