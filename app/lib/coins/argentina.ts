import type { CoinEntry } from "./index";

export const MONEDAS_ARGENTINA: CoinEntry[] = [

  // ── PATACONES Y ARGENTINOS (1881–1896) ──────────────────────

  // 5 Pesos Argentinos — Oro
  ...([1881,1882,1883,1884,1885,1886,1887,1888,1889,1896] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Patacones y Argentinos",
    material: "Oro 900",
  })),

  // 2.50 Pesos (½ Argentino) — Oro
  {
    pais: "Argentina",
    denominacion: "2.50 Pesos",
    nombre: "Libertad Según Oudine",
    anio: 1884,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Patacones y Argentinos",
    material: "Oro 900",
  },

  // 1 Peso Patacón — Plata
  ...([1881,1882,1883] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Patacones y Argentinos",
    material: "Plata 900",
  })),

  // 50 Centavos Patacón — Plata
  ...([1881,1882,1883] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Patacones y Argentinos",
    material: "Plata 900",
  })),

  // 20 Centavos Patacón — Plata
  ...([1881,1882,1883] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Patacones y Argentinos",
    material: "Plata 900",
  })),

  // 10 Centavos Patacón — Plata
  ...([1881,1882,1883] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Patacones y Argentinos",
    material: "Plata 900",
  })),

  // ── COBRES GRANDES (1882–1896) ───────────────────────────────

  // 2 Centavos
  ...([1882,1883,1884,1885,1887,1888,1889,1890,1891,1892,1893,1894,1895,1896] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "2 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Cobres Grandes",
    material: "Cobre",
  })),

  // 1 Centavo
  ...([1882,1883,1884,1885,1886,1888,1889,1890,1891,1892,1893,1894,1895,1896] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Cobres Grandes",
    material: "Cobre",
  })),

  // ── MONEDA NACIONAL — NÍQUEL (1896–1942) ────────────────────

  // 20 Centavos
  ...([
    1896,1897,1898,1899,1905,1906,1907,1908,1909,1910,
    1911,1912,1913,1914,1915,1916,1918,1919,1920,1921,
    1922,1923,1924,1925,1926,1927,1928,1929,1930,1931,
    1935,1936,1937,1938,1939,1940,1941,1942,
  ] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Centavos",
    nombre: "Imagen de la Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional",
    material: "Níquel",
  })),

  // 10 Centavos
  ...([
    1896,1897,1898,1899,1903,1904,1905,1906,1907,1908,
    1909,1910,1911,1912,1913,1914,1915,1916,1917,1918,
    1919,1920,1921,1922,1923,1924,1925,1926,1927,1928,
    1929,1930,1931,1933,1934,1935,1936,1937,1938,1939,
    1940,1941,1942,
  ] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Imagen de la Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional",
    material: "Níquel",
  })),

  // 5 Centavos
  ...([
    1896,1897,1898,1899,1903,1904,1905,1906,1907,1908,
    1909,1910,1911,1912,1913,1914,1915,1916,1917,1918,
    1919,1920,1921,1922,1923,1924,1925,1926,1927,1928,
    1929,1930,1931,1933,1934,1935,1936,1937,1938,1939,
    1940,1941,1942,
  ] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Imagen de la Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional",
    material: "Níquel",
  })),

  // 50 Centavos
  {
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Imagen de la Libertad",
    anio: 1941,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional",
    material: "Níquel",
  },

  // ── COBRES CHICOS (1939–1950) ────────────────────────────────

  // 2 Centavos — Cobre 75%
  ...([1939,1940,1941,1942,1944,1945,1946,1947] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "2 Centavos",
    nombre: "Escudo Argentino",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Cobres Chicos",
    material: "Cobre 75%",
  })),

  // 2 Centavos — Cobre 100%
  ...([1947,1948,1949,1950] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "2 Centavos",
    nombre: "Escudo Argentino",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Cobres Chicos",
    material: "Cobre 100%",
  })),

  // 1 Centavo — Cobre 75%
  ...([1939,1940,1941,1942,1943,1944] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "Escudo Argentino",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Cobres Chicos",
    material: "Cobre 75%",
  })),

  // 1 Centavo — Cobre 100%
  ...([1945,1946,1947,1948] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "Escudo Argentino",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Cobres Chicos",
    material: "Cobre 100%",
  })),

  // ── MONEDA NACIONAL BAZOR — BRONCE (1942–1950) ──────────────

  // 20 Centavos
  ...([1942,1943,1944,1945,1946,1947,1948,1949,1950] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Centavos",
    nombre: "Libertad Según Bazor",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional - Bazor",
    material: "Bronce",
  })),

  // 10 Centavos
  ...([1942,1943,1944,1945,1946,1947,1948,1949,1950] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Libertad Según Bazor",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional - Bazor",
    material: "Bronce",
  })),

  // 5 Centavos
  ...([1942,1943,1944,1945,1946,1947,1948,1949,1950] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Libertad Según Bazor",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Nacional - Bazor",
    material: "Bronce",
  })),

  // ── SAN MARTÍN (1950–1956) ───────────────────────────────────

  // 50 Centavos — Acero
  ...([1952,1953,1954,1955,1956] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Acero",
  })),

  // 20 Centavos — Níquel
  ...([1950,1951,1952] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Centavos",
    nombre: anio === 1950 ? "Año Libertador | San Martín" : "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Níquel",
  })),

  // 20 Centavos — Acero
  ...([1952,1953,1954,1955,1956] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Centavos",
    nombre: "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Acero",
  })),

  // 10 Centavos — Níquel
  ...([1950,1951,1952] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: anio === 1950 ? "Año Libertador | San Martín" : "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Níquel",
  })),

  // 10 Centavos — Acero
  ...([1952,1953,1954,1955,1956] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Acero",
  })),

  // 5 Centavos — Níquel
  ...([1950,1951,1952,1953] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: anio === 1950 ? "Año Libertador | San Martín" : "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Níquel",
  })),

  // 5 Centavos — Acero
  ...([1953,1954,1955,1956] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Busto San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "San Martín",
    material: "Acero",
  })),

  // ── LIBERTAD — ACERO (1957–1962) ────────────────────────────

  // 1 Peso
  ...([1957,1958,1959,1960,1961,1962] as number[]).map((anio, i) => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: i === 3 ? "150° Revolución Mayo" : "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Libertad",
    material: "Acero",
  })),

  // 50 Centavos
  ...([1957,1958,1959,1960,1961] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Libertad",
    material: "Acero",
  })),

  // 20 Centavos
  ...([1957,1958,1959,1960,1961] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Libertad",
    material: "Acero",
  })),

  // 10 Centavos
  ...([1957,1958,1959] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Libertad",
    material: "Acero",
  })),

  // 5 Centavos
  ...([1957,1958,1959] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Libertad Según Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Libertad",
    material: "Acero",
  })),

  // ── EL RESERO — ACERO (1962–1968) ───────────────────────────

  ...([1962,1963,1964,1965,1966,1967,1968] as number[]).map((anio, i) => ({
    pais: "Argentina",
    denominacion: "10 Pesos",
    nombre: i === 4 ? "150° Aniversario Independencia" : "Obra Escultor Sarniguet",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "El Resero",
    material: "Acero",
  })),

  // ── FRAGATA SARMIENTO — ACERO (1961–1968) ───────────────────

  ...([1961,1962,1963,1964,1965,1966,1967,1968] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre: "Finaliza Actividad Naval",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Fragata Sarmiento",
    material: "Acero",
  })),

  // ── MONEDA PATRIA — ACERO (1964–1968) ───────────────────────

  ...([1964,1965,1966,1967,1968] as number[]).map((anio, i) => ({
    pais: "Argentina",
    denominacion: "25 Pesos",
    nombre: i < 4 && anio !== 1968 ? "Primer Moneda Patria" : "D. F. Sarmiento",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Moneda Patria",
    material: "Acero",
  })),

  // ── PESO LEY 18.188 (1970–1981) ─────────────────────────────

  // 3000 Pesos — Plata
  ...([1977,1978] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "3000 Pesos",
    nombre: "Logo Mundial FIFA 1978",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Plata",
  })),

  // 2000 Pesos — Plata
  ...([1977,1978] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "2000 Pesos",
    nombre: "Logo Mundial FIFA 1978",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Plata",
  })),

  // 1000 Pesos — Plata
  ...([1977,1978] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1000 Pesos",
    nombre: "Logo Mundial FIFA 1978",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Plata",
  })),

  // 100 Pesos — Bronce
  ...([
    { anio: 1977, nombre: "Logo Mundial FIFA 1978" },
    { anio: 1978, nombre: "Logo Mundial FIFA 1978" },
    { anio: 1978, nombre: "Retrato General San Martín" },
    { anio: 1979, nombre: "Retrato General San Martín" },
    { anio: 1979, nombre: "Conquista del Desierto" },
    { anio: 1980, nombre: "Retrato General San Martín" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "100 Pesos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Bronce",
  })),

  // 100 Pesos — Acero
  ...([1980,1981] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "100 Pesos",
    nombre: "Retrato General San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Acero",
  })),

  // 50 Pesos — Bronce
  ...([
    { anio: 1977, nombre: "Logo Mundial FIFA 1978" },
    { anio: 1978, nombre: "Logo Mundial FIFA 1978" },
    { anio: 1978, nombre: "Retrato General San Martín" },
    { anio: 1979, nombre: "Retrato General San Martín" },
    { anio: 1979, nombre: "Conquista del Desierto" },
    { anio: 1980, nombre: "Retrato General San Martín" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "50 Pesos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Bronce",
  })),

  // 50 Pesos — Acero
  ...([1980,1981] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "50 Pesos",
    nombre: "Retrato General San Martín",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Acero",
  })),

  // 20 Pesos — Bronce
  ...([1977,1978] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "20 Pesos",
    nombre: "Logo Mundial FIFA 1978",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Bronce",
  })),

  // 10 Pesos — Bronce
  ...([
    { anio: 1976, nombre: "Sol Patrio" },
    { anio: 1977, nombre: "Sol Patrio" },
    { anio: 1978, nombre: "Sol Patrio" },
    { anio: 1977, nombre: "Almirante Guillermo Brown" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "10 Pesos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Bronce",
  })),

  // 5 Pesos — Bronce
  ...([
    { anio: 1976, nombre: "Sol Patrio" },
    { anio: 1977, nombre: "Sol Patrio" },
    { anio: 1977, nombre: "Almirante Guillermo Brown" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Bronce",
  })),

  // 1 Peso — Bronce
  ...([1974,1975,1976] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Sol Patrio",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Bronce",
  })),

  // Centavos (50, 20, 10, 5) — Bronce
  ...(["50 Centavos","20 Centavos","10 Centavos","5 Centavos"] as string[]).flatMap(denominacion =>
    [1970,1971,1972,1973,1974,1975,1976].map(anio => ({
      pais: "Argentina",
      denominacion,
      nombre: "Retrato Libertad",
      anio,
      casa_acunacion: "Casa de Moneda de la Argentina",
      serie: "Peso Ley 18.188",
      material: "Bronce",
    }))
  ),

  // 5 Centavos — Aluminio
  ...([1970,1971,1972,1973] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Retrato Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Aluminio",
  })),

  // 1 Centavo — Aluminio
  ...([1970,1971,1972,1973,1974,1975] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "Retrato Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Peso Ley 18.188",
    material: "Aluminio",
  })),

  // ── PESOS ARGENTINOS (1983–1985) ────────────────────────────

  {
    pais: "Argentina",
    denominacion: "50 Pesos",
    nombre: "Cincuentenario BCRA",
    anio: 1985,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Bronce",
  },

  ...([1984,1985] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Pesos",
    nombre: "Casa de Tucumán",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Bronce",
  })),

  ...([1984,1985] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre: "Cabildo Buenos Aires",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Bronce",
  })),

  {
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Congreso de la Nación",
    anio: 1984,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Aluminio",
  },

  {
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Busto de la Libertad",
    anio: 1983,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Aluminio",
  },

  {
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Busto de la Libertad",
    anio: 1983,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Aluminio",
  },

  {
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Busto de la Libertad",
    anio: 1983,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Aluminio",
  },

  {
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "Busto de la Libertad",
    anio: 1983,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Argentinos",
    material: "Aluminio",
  },

  // ── AUSTRALES (1985–1991) ────────────────────────────────────

  ...([1990,1991] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1000 Australes",
    nombre: "Escudo Nacional",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Aluminio",
  })),

  ...([1990,1991] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "500 Australes",
    nombre: "Escudo Nacional",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Aluminio",
  })),

  ...([1990,1991] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "100 Australes",
    nombre: "Escudo Nacional",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Aluminio",
  })),

  {
    pais: "Argentina",
    denominacion: "10 Australes",
    nombre: "Casa del Acuerdo",
    anio: 1989,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Aluminio",
  },

  {
    pais: "Argentina",
    denominacion: "5 Australes",
    nombre: "Casa de Tucumán",
    anio: 1989,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Aluminio",
  },

  {
    pais: "Argentina",
    denominacion: "1 Austral",
    nombre: "Cabildo Buenos Aires",
    anio: 1989,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Aluminio",
  },

  ...([1985,1986,1987,1988] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Libertad de Oudine",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Bronce",
  })),

  ...([1985,1986,1987,1988] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Escudo Nacional",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Bronce",
  })),

  ...([1985,1986,1987,1988] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Puma",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Bronce",
  })),

  ...([1985,1986,1987] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "Ñandú",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Bronce",
  })),

  {
    pais: "Argentina",
    denominacion: "½ Centavo",
    nombre: "Hornero",
    anio: 1985,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Australes",
    material: "Bronce",
  },

  // ── PESOS CONVERTIBLES (1992–2016) ──────────────────────────

  // 5 Pesos — Níquel
  {
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre: "Convención Constituyente",
    anio: 1994,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Níquel",
  },

  // 2 Pesos — Níquel (conmemorativas y circulación)
  ...([
    { anio: 1994, nombre: "Convención Constituyente" },
    { anio: 1999, nombre: "Nacimiento - Borges" },
    { anio: 2002, nombre: "Fallecimiento Eva Perón" },
    { anio: 2006, nombre: "Derechos Humanos" },
    { anio: 2007, nombre: "Gesta de Malvinas" },
    { anio: 2007, nombre: "Chubut - Petróleo" },
    { anio: 2010, nombre: "75° Aniversario BCRA" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Níquel",
  })),

  // 2 Pesos — Bimetálica
  ...([
    { anio: 2010, nombre: "Diseño Bicentenario" },
    { anio: 2011, nombre: "Diseño Bicentenario" },
    { anio: 2012, nombre: "Recuperación Malvinas" },
    { anio: 2014, nombre: "Diseño Bicentenario" },
    { anio: 2015, nombre: "Diseño Bicentenario" },
    { anio: 2016, nombre: "Diseño Bicentenario" },
    { anio: 2016, nombre: "Aniversario Independencia" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bimetálica",
  })),

  // 1 Peso — Bimetálica (circulación + conmemorativas)
  ...([
    { anio: 1994, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 1995, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 1995, nombre: "Error: PROVINCIAS" },
    { anio: 1996, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 1996, nombre: "UNICEF" },
    { anio: 1997, nombre: "50° Aniversario Voto Femenino" },
    { anio: 1998, nombre: "Mercosur" },
    { anio: 2001, nombre: "Gral. Urquiza" },
    { anio: 2006, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 2007, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 2008, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 2009, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 2010, nombre: "Motivo: 1° Moneda Patria" },
    { anio: 2010, nombre: "Glaciar Perito Moreno" },
    { anio: 2010, nombre: "Mar del Plata" },
    { anio: 2010, nombre: "Aconcagua" },
    { anio: 2010, nombre: "El Palmar" },
    { anio: 2010, nombre: "Pucara de Tilcara" },
    { anio: 2013, nombre: "Doble Fecha 1813 - 2013" },
    { anio: 2016, nombre: "Motivo: 1° Moneda Patria" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bimetálica",
  })),

  // 50 Centavos — Bronce
  ...([
    { anio: 1992, nombre: "Casa Histórica Tucumán" },
    { anio: 1993, nombre: "Casa Histórica Tucumán" },
    { anio: 1994, nombre: "Casa Histórica Tucumán" },
    { anio: 1996, nombre: "UNICEF" },
    { anio: 1997, nombre: "50° Aniversario Voto Femenino" },
    { anio: 1998, nombre: "Mercosur" },
    { anio: 2000, nombre: "General M. M. de Güemes" },
    { anio: 2000, nombre: "General José de San Martín" },
    { anio: 2009, nombre: "Casa Histórica Tucumán" },
    { anio: 2010, nombre: "Casa Histórica Tucumán" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bronce",
  })),

  // 25 Centavos — Bronce
  ...([
    { anio: 1992, nombre: "Cabildo de Buenos Aires" },
    { anio: 1993, nombre: "Cabildo de Buenos Aires" },
    { anio: 2009, nombre: "Cabildo de Buenos Aires" },
    { anio: 2010, nombre: "Cabildo de Buenos Aires" },
  ]).map(({ anio, nombre }) => ({
    pais: "Argentina",
    denominacion: "25 Centavos",
    nombre,
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bronce",
  })),

  // 25 Centavos — Níquel
  ...([1993,1994,1996] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "25 Centavos",
    nombre: "Cabildo de Buenos Aires",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Níquel",
  })),

  // 10 Centavos — Bronce
  ...([1992,1993,1994,2004,2005,2006] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Escudo Nacional",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bronce",
  })),

  // 10 Centavos — Acero
  ...([2006,2007,2008,2009,2010,2011] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Escudo Nacional",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Acero",
  })),

  // 5 Centavos — Bronce
  ...([1992,1993,2004,2005] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Sol Radiante Patrio",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bronce",
  })),

  // 5 Centavos — Níquel
  ...([1993,1994,1995] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Sol Radiante Patrio",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Níquel",
  })),

  // 5 Centavos — Acero
  ...([2006,2007,2008,2009,2010,2011] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Sol Radiante Patrio",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Acero",
  })),

  // 1 Centavo — Octogonal
  {
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "En Unión y Libertad",
    anio: 1992,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Octogonal",
    nota: "Forma octogonal, edición única",
  },

  // 1 Centavo — Bronce
  ...([1992,1993] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "En Unión y Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Bronce",
  })),

  // 1 Centavo — Cobre
  ...([1993,1997,1998,1999,2000] as number[]).map(anio => ({
    pais: "Argentina",
    denominacion: "1 Centavo",
    nombre: "En Unión y Libertad",
    anio,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Pesos Convertibles",
    material: "Cobre",
  })),

  // ── SERIE 1 (2000–2016) — con KM# ───────────────────────────

  // 5 Centavos
  ...Array.from({ length: 15 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Cinco Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 109",
  })),

  // 10 Centavos
  ...Array.from({ length: 17 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Diez Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 107",
  })),

  // 25 Centavos
  ...Array.from({ length: 17 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "25 Centavos",
    nombre: "Veinticinco Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 110",
  })),

  // 50 Centavos
  ...Array.from({ length: 11 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Cincuenta Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 111",
  })),

  // 1 Peso Bimetálica
  ...Array.from({ length: 13 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Un Peso — Serie 1 Bimetálica",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 112",
  })),

  // 2 Pesos Bimetálica
  ...Array.from({ length: 6 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre: "Dos Pesos — Serie 1 Bimetálica",
    anio: 2011 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 127",
  })),

  // ── CONMEMORATIVAS ───────────────────────────────────────────

  {
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Bicentenario Revolución de Mayo",
    anio: 2010,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Conmemorativa",
    km: "KM# 140",
    nota: "Acuñada en 2011 con año de cuño 2010",
  },
  {
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre: "30° Aniversario Recuperación Islas Malvinas",
    anio: 2012,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Conmemorativa",
    km: "KM# 143",
    nota: "Mapa de Malvinas + isotipo UNASUR en anverso",
  },
  {
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Bicentenario Declaración de Independencia",
    anio: 2016,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Conmemorativa",
  },
  {
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Bicentenario de la Democracia",
    anio: 2023,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Conmemorativa",
  },

  // ── ÁRBOLES DE LA REPÚBLICA ARGENTINA (2017–2024) ───────────

  // 1 Peso — Jacarandá
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Un Peso — Jacarandá",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    material: "Acero con cobre",
    nota: "Color rojizo. Reemplaza Serie 1. Diámetro 20mm, 4.3g",
  })),

  // 2 Pesos — Palo Borracho
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre: "Dos Pesos — Palo Borracho",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    material: "Acero con latón",
    nota: "Color amarillo dorado. Diámetro 21.5mm, 5g",
  })),

  // 5 Pesos — Arrayán
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre: "Cinco Pesos — Arrayán",
    anio: 2017 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    material: "Acero electrodepositado con níquel",
    nota: "Color plateado. Diámetro 23mm, 7.3g",
  })),

  // 10 Pesos — Caldén
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "10 Pesos",
    nombre: "Diez Pesos — Caldén",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    material: "Alpaca",
    nota: "Color blanco plateado. Diámetro 24.5mm, 9g",
  })),
];
