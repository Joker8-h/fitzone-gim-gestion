import type { ZodType } from 'zod';

// Valida `data` con el schema Zod indicado. Si falla lanza ZodError, que el
// errorHandler central traduce a 400 con detalle por campo (Fase 2 — D7).
// Se usa dentro de los handlers para no repetir try/catch en cada ruta.
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
