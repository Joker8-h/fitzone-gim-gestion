# FITZONE Fase 1 — Lista de Tareas y Verificación Final

## 1. Arquitectura Full-Stack React + Express + SQLite
- [x] Frontend migrado a React 18 + TypeScript + Vite (`client/`) compilando directamente a `server/public`.
- [x] Sistema de Autenticación (`scrypt` + Cookie `HttpOnly` + Bearer Token) con usuario inicial `admin` / `admin123` y gestión de cuentas desde el panel.
- [x] Seed en blanco desde cero (`clearAllDataToZero()` en `server/src/db/seed.ts`): 0 miembros, 0 planes, 0 clases, 0 equipos, 0 pagos al iniciar.

## 2. Corrección de Contratos API y Botones
- [x] `GET /api/attendance`: Agregado endpoint de listado general de asistencias en `server/src/routes/attendance.ts` y `attendanceService.ts` (evitando caída de `Promise.all` en React).
- [x] `POST /api/attendance/check-in`: Soporte dual para `clientId` y `documentId` con bloqueo estricto `403` (DP-003) y pase auditado (`override: true`).
- [x] `POST /api/memberships/assign`: Soporte dual para `pricePaid` y `amountPaid`, aplicando suma acumulativa de días al vencimiento vigente (DP-002) e ingreso automático en caja (DP-006).
- [x] `DELETE /api/clients/:id`, `DELETE /api/memberships/plans/:id`, `DELETE /api/finances/transactions/:id`: Endpoints y botones de eliminación conectados en todas las tablas y catálogos.
- [x] `QuickRenewModal`: Si el sistema inicia desde cero sin planes creados, ofrece el botón directo **"+ Crear Nuevo Plan Ahora"** para no bloquear el flujo de renovación.
- [x] `GET /api/whatsapp/status`: Propiedades `qrDataUrl` / `qrCodeDataUrl` y `connectedPhone` / `userPhone` unificadas entre Baileys y React.

## 3. Diseño Profesional Libre de Emojis
- [x] Eliminados todos los emojis en `LoginScreen.tsx`, `Topbar.tsx`, `Toast.tsx`, `UserManagementModal.tsx`, `Modals.tsx`, `DashboardView.tsx`, `OperationalViews.tsx`, `AdminAndAiViews.tsx`, `App.tsx`, `seed.ts` y `aiTrackingService.ts`, reemplazándolos por iconografía SVG limpia y etiquetas tipográficas ejecutivas.

## 4. Verificación E2E
- [x] Compilación TypeScript (`tsc --noEmit`) sin errores en `client/` y `server/`.
- [x] Prueba E2E automatizada contra `http://localhost:3001/api` verificando los 10 módulos (`auth`, `plans`, `clients`, `check-in 403`, `assign`, `cumulative renewal`, `check-in 201`, `operations`, `finances`, `dashboard & whatsapp`).
- [x] Base de datos restablecida a cero (`0` registros operativos) lista para producción.
