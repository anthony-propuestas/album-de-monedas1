import { countries } from "~/lib/countries";

describe("countries list", () => {
  it("has at least 150 entries", () => {
    expect(countries.length).toBeGreaterThanOrEqual(150);
  });

  it("each entry has non-empty string value and label", () => {
    for (const c of countries) {
      expect(typeof c.value).toBe("string");
      expect(c.value.length).toBeGreaterThan(0);
      expect(typeof c.label).toBe("string");
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it("all values are 2-letter uppercase ISO codes", () => {
    for (const c of countries) {
      expect(c.value).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("values are unique (no duplicate codes)", () => {
    const values = countries.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("labels are unique (no duplicate names)", () => {
    const labels = countries.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("includes key Latin American and Spanish-speaking countries", () => {
    const codes = countries.map((c) => c.value);
    ["AR", "MX", "ES", "CO", "CL", "PE", "VE", "UY"].forEach((code) => {
      expect(codes).toContain(code);
    });
  });

  it("Argentina maps to 'Argentina'", () => {
    const ar = countries.find((c) => c.value === "AR");
    expect(ar?.label).toBe("Argentina");
  });

  it("US maps to 'Estados Unidos'", () => {
    const us = countries.find((c) => c.value === "US");
    expect(us?.label).toBe("Estados Unidos");
  });
});
