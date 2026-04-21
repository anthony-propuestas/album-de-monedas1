import { CATEGORIES, getCategoryBySlug } from "~/lib/collections";

describe("CATEGORIES", () => {
  it("has exactly 8 categories", () => {
    expect(CATEGORIES).toHaveLength(8);
  });

  it("every category has all required fields", () => {
    for (const cat of CATEGORIES) {
      expect(typeof cat.slug).toBe("string");
      expect(cat.slug.length).toBeGreaterThan(0);
      expect(typeof cat.title).toBe("string");
      expect(cat.title.length).toBeGreaterThan(0);
      expect(typeof cat.description).toBe("string");
      expect(cat.description.length).toBeGreaterThan(0);
      expect(typeof cat.iconKey).toBe("string");
      expect(cat.iconKey.length).toBeGreaterThan(0);
      expect(typeof cat.sql).toBe("string");
      expect(typeof cat.statLabel).toBe("function");
    }
  });

  it("all slugs are unique", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every SQL string contains a ? placeholder for LIMIT", () => {
    for (const cat of CATEGORIES) {
      expect(cat.sql).toContain("?");
    }
  });

  it("contains the expected 8 slugs", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(slugs).toContain("most-pieces");
    expect(slugs).toContain("oldest");
    expect(slugs).toContain("highest-value");
    expect(slugs).toContain("most-countries");
    expect(slugs).toContain("best-condition");
    expect(slugs).toContain("most-active");
    expect(slugs).toContain("most-denominations");
    expect(slugs).toContain("veteran");
  });
});

describe("getCategoryBySlug", () => {
  it("returns the correct category for a valid slug", () => {
    const cat = getCategoryBySlug("most-pieces");
    expect(cat).toBeDefined();
    expect(cat?.slug).toBe("most-pieces");
    expect(cat?.title).toBe("Mayor cantidad de piezas");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCategoryBySlug("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getCategoryBySlug("")).toBeUndefined();
  });

  it.each(CATEGORIES.map((c) => c.slug))(
    "finds category '%s' by slug",
    (slug) => {
      expect(getCategoryBySlug(slug)).toBeDefined();
    }
  );
});

describe("statLabel — most-pieces", () => {
  const cat = () => getCategoryBySlug("most-pieces")!;

  it("formats a numeric count as '{n} piezas'", () => {
    expect(cat().statLabel(42)).toBe("42 piezas");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — oldest", () => {
  const cat = () => getCategoryBySlug("oldest")!;

  it("formats a year as 'Desde {year}'", () => {
    expect(cat().statLabel(1895)).toBe("Desde 1895");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — highest-value", () => {
  const cat = () => getCategoryBySlug("highest-value")!;

  it("includes $ and USD in the formatted value", () => {
    const result = cat().statLabel(1500);
    expect(result).toContain("$");
    expect(result).toContain("USD");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — most-countries", () => {
  const cat = () => getCategoryBySlug("most-countries")!;

  it("formats count as '{n} países'", () => {
    expect(cat().statLabel(15)).toBe("15 países");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — best-condition", () => {
  const cat = () => getCategoryBySlug("best-condition")!;

  it("formats percentage as '{n}% MS/AU'", () => {
    expect(cat().statLabel(87.5)).toBe("87.5% MS/AU");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — most-active", () => {
  const cat = () => getCategoryBySlug("most-active")!;

  it("formats count as '{n} este mes'", () => {
    expect(cat().statLabel(5)).toBe("5 este mes");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — most-denominations", () => {
  const cat = () => getCategoryBySlug("most-denominations")!;

  it("formats count as '{n} denominaciones'", () => {
    expect(cat().statLabel(8)).toBe("8 denominaciones");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});

describe("statLabel — veteran", () => {
  const cat = () => getCategoryBySlug("veteran")!;

  it("formats a year string as 'Desde {year}'", () => {
    expect(cat().statLabel("1998")).toBe("Desde 1998");
  });

  it("returns '—' for null", () => {
    expect(cat().statLabel(null)).toBe("—");
  });
});
