import type { CoinEntry } from "./index";

export const MONEDAS_ARGENTINA: CoinEntry[] = [
  // Serie 1 — 5 Centavos
  ...Array.from({ length: 15 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "5 Centavos",
    nombre: "Cinco Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 109",
  })),

  // Serie 1 — 10 Centavos
  ...Array.from({ length: 17 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "10 Centavos",
    nombre: "Diez Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 107",
  })),

  // Serie 1 — 25 Centavos
  ...Array.from({ length: 17 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "25 Centavos",
    nombre: "Veinticinco Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 110",
  })),

  // Serie 1 — 50 Centavos
  ...Array.from({ length: 11 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "50 Centavos",
    nombre: "Cincuenta Centavos — Serie 1",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 111",
  })),

  // Serie 1 — 1 Peso Bimetálica
  ...Array.from({ length: 13 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Un Peso — Serie 1 Bimetálica",
    anio: 2000 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 112",
  })),

  // Serie 1 — 2 Pesos Bimetálica
  ...Array.from({ length: 6 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre: "Dos Pesos — Serie 1 Bimetálica",
    anio: 2011 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Serie 1",
    km: "KM# 127",
  })),

  // Conmemorativas
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

  // Serie 2 — Árboles: 1 Peso Jacarandá
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "1 Peso",
    nombre: "Un Peso — Jacarandá",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    nota: "Acero con cobre, color rojizo. Reemplaza Serie 1.",
  })),

  // Serie 2 — 2 Pesos Palo Borracho
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "2 Pesos",
    nombre: "Dos Pesos — Palo Borracho",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    nota: "Tono dorado. Flor del Palo Borracho en anverso.",
  })),

  // Serie 2 — 5 Pesos Arrayán
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "5 Pesos",
    nombre: "Cinco Pesos — Arrayán",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    nota: "Tono plateado. Flor del Arrayán en anverso.",
  })),

  // Serie 2 — 10 Pesos Caldén
  ...Array.from({ length: 7 }, (_, i) => ({
    pais: "Argentina",
    denominacion: "10 Pesos",
    nombre: "Diez Pesos — Caldén",
    anio: 2018 + i,
    casa_acunacion: "Casa de Moneda de la Argentina",
    serie: "Árboles de la República Argentina",
    nota: "Tono dorado. Árbol Caldén en anverso. Introducida diciembre 2018.",
  })),
];
