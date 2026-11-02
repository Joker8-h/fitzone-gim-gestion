// Error de aplicación con código HTTP. Los servicios lo lanzan para los
// fallos esperados (validación, conflictos, no encontrado); cualquier otro
// error que llegue al errorHandler se trata como 500 genérico SIN exponer
// el mensaje interno.
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

// Errores de negocio que hoy lanzan los servicios (respuestas 400/401)
export const badRequest = (msg: string) => new ApiError(400, msg);
export const unauthorized = (msg: string) => new ApiError(401, msg);
export const notFound = (msg: string) => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);
