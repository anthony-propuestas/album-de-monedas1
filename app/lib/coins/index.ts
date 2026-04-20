import { MONEDAS_ARGENTINA } from "./argentina";

export interface CoinEntry {
  pais: string;
  denominacion: string;
  nombre: string;
  anio: number;
  casa_acunacion: string;
  serie?: string;
  km?: string;
  nota?: string;
}

// Para agregar un nuevo país:
// 1. Crear app/lib/coins/pais.ts con CoinEntry[]
// 2. Importar aquí y asignar a su código ISO-2
export const COINS_BY_COUNTRY: Record<string, CoinEntry[]> = {
  AR: MONEDAS_ARGENTINA,
};
