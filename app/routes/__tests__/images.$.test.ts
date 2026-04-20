const { loader } = await import("~/routes/images.$");

function makeMockObject(contentType = "image/jpeg") {
  return {
    body: new ReadableStream(),
    writeHttpMetadata: vi.fn((headers: Headers) => {
      headers.set("Content-Type", contentType);
    }),
  };
}

function makeMockBucket(object: ReturnType<typeof makeMockObject> | null = makeMockObject()) {
  return { get: vi.fn().mockResolvedValue(object) };
}

function makeContext(bucket?: ReturnType<typeof makeMockBucket>) {
  return {
    cloudflare: {
      env: { IMAGES: bucket },
      ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn() },
      cf: {},
      caches: {} as CacheStorage,
    },
  };
}

function makeArgs(key: string | undefined, bucket?: ReturnType<typeof makeMockBucket>) {
  return {
    request: new Request("https://example.com/images/test"),
    params: { "*": key },
    context: makeContext(bucket) as any,
  };
}

describe("images.$ loader", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws 404 when key param is missing", async () => {
    let thrown: unknown;
    try {
      await loader(makeArgs(undefined, makeMockBucket()) as any);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it("throws 404 when IMAGES binding is absent", async () => {
    let thrown: unknown;
    try {
      await loader(makeArgs("user-1/coin-1/photo_obverse", undefined) as any);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it("throws 404 when object is not found in R2", async () => {
    const bucket = makeMockBucket(null);
    let thrown: unknown;
    try {
      await loader(makeArgs("user-1/coin-1/photo_obverse", bucket) as any);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it("calls bucket.get with the correct key", async () => {
    const bucket = makeMockBucket();
    await loader(makeArgs("user-1/coin-1/photo_obverse", bucket) as any);
    expect(bucket.get).toHaveBeenCalledWith("user-1/coin-1/photo_obverse");
  });

  it("returns 200 response when object is found", async () => {
    const bucket = makeMockBucket();
    const result = await loader(makeArgs("user-1/coin-1/photo_obverse", bucket) as any);
    expect(result.status).toBe(200);
  });

  it("sets immutable Cache-Control header", async () => {
    const bucket = makeMockBucket();
    const result = await loader(makeArgs("user-1/coin-1/photo_obverse", bucket) as any);
    expect(result.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("calls writeHttpMetadata to set content type from object metadata", async () => {
    const obj = makeMockObject("image/png");
    const bucket = makeMockBucket(obj);
    const result = await loader(makeArgs("user-1/coin-1/photo_obverse", bucket) as any);
    expect(obj.writeHttpMetadata).toHaveBeenCalled();
    expect(result.headers.get("Content-Type")).toBe("image/png");
  });
});
