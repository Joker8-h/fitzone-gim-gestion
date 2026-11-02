import { z } from 'zod';

// Configuración global de Zod: mensajes de validación en español para
// TODOS los schemas del server. Importar este módulo en el punto de entrada
// (index.ts) y en los tests para que se aplique el mismo criterio.
z.config(z.locales.es());
