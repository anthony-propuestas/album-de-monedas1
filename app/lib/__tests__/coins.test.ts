import { COINS_BY_COUNTRY, type CoinEntry } from "~/lib/coins/index";
import { MONEDAS_ARGENTINA } from "~/lib/coins/argentina";

describe("COINS_BY_COUNTRY registry", () => {
  it("contains the AR key", () => {
    expect(COINS_BY_COUNTRY).toHaveProperty("AR");
  });

  it("AR maps to MONEDAS_ARGENTINA", () => {
    expect(COINS_BY_COUNTRY["AR"]).toBe(MONEDAS_ARGENTINA);
  });

  it("unknown country returns undefined", () => {
    expect(COINS_BY_COUNTRY["XX"]).toBeUndefined();
  });
});

describe("MONEDAS_ARGENTINA data", () => {
  it("has entries", () => {
    expect(MONEDAS_ARGENTINA.length).toBeGreaterThan(0);
  });

  it("every entry has the required CoinEntry fields with correct types", () => {
    for (const coin of MONEDAS_ARGENTINA) {
      expect(typeof coin.pais).toBe("string");
      expect(coin.pais.length).toBeGreaterThan(0);
      expect(typeof coin.denominacion).toBe("string");
      expect(coin.denominacion.length).toBeGreaterThan(0);
      expect(typeof coin.nombre).toBe("string");
      expect(coin.nombre.length).toBeGreaterThan(0);
      expect(typeof coin.anio).toBe("number");
      expect(typeof coin.casa_acunacion).toBe("string");
      expect(coin.casa_acunacion.length).toBeGreaterThan(0);
    }
  });

  it("all entries have pais = 'Argentina'", () => {
    expect(MONEDAS_ARGENTINA.every((c) => c.pais === "Argentina")).toBe(true);
  });

  it("all entries have casa_acunacion = 'Casa de Moneda de la Argentina'", () => {
    expect(
      MONEDAS_ARGENTINA.every((c) => c.casa_acunacion === "Casa de Moneda de la Argentina")
    ).toBe(true);
  });

  it("all years are within reasonable range (2000–2030)", () => {
    for (const coin of MONEDAS_ARGENTINA) {
      expect(coin.anio).toBeGreaterThanOrEqual(2000);
      expect(coin.anio).toBeLessThanOrEqual(2030);
    }
  });

  it("contains the expected denominations", () => {
    const denominations = [...new Set(MONEDAS_ARGENTINA.map((c) => c.denominacion))];
    expect(denominations).toContain("5 Centavos");
    expect(denominations).toContain("10 Centavos");
    expect(denominations).toContain("25 Centavos");
    expect(denominations).toContain("50 Centavos");
    expect(denominations).toContain("1 Peso");
    expect(denominations).toContain("2 Pesos");
    expect(denominations).toContain("5 Pesos");
    expect(denominations).toContain("10 Pesos");
  });

  it("Serie 2 names appear for the correct denominations", () => {
    const jacaranda = MONEDAS_ARGENTINA.filter((c) => c.nombre === "Un Peso — Jacarandá");
    expect(jacaranda.length).toBeGreaterThan(0);
    expect(jacaranda.every((c) => c.denominacion === "1 Peso")).toBe(true);

    const calden = MONEDAS_ARGENTINA.filter((c) => c.nombre === "Diez Pesos — Caldén");
    expect(calden.length).toBeGreaterThan(0);
    expect(calden.every((c) => c.denominacion === "10 Pesos")).toBe(true);
  });

  it("filtering by denomination returns only matching entries", () => {
    const filtered = MONEDAS_ARGENTINA.filter((c) => c.denominacion === "1 Peso");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((c) => c.denominacion === "1 Peso")).toBe(true);
  });

  it("filtering by nombre returns matching years in order", () => {
    const years = MONEDAS_ARGENTINA
      .filter((c) => c.nombre === "Un Peso — Jacarandá")
      .map((c) => c.anio)
      .sort((a, b) => a - b);
    expect(years[0]).toBe(2018);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it("find returns the exact coin for a given nombre + anio", () => {
    const coin = MONEDAS_ARGENTINA.find(
      (c) => c.nombre === "Un Peso — Jacarandá" && c.anio === 2021
    );
    expect(coin).toBeDefined();
    expect(coin?.casa_acunacion).toBe("Casa de Moneda de la Argentina");
    expect(coin?.denominacion).toBe("1 Peso");
  });

  it("no duplicate (nombre + anio) pairs", () => {
    const keys = MONEDAS_ARGENTINA.map((c) => `${c.nombre}__${c.anio}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
