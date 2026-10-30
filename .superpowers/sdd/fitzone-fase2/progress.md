# SDD ledger — plan: C:\Users\usuario\.opencode\plan\fitzone-fase2.md

Pre-flight: no shared interfaces entre tareas de la Fase A (middleware, seed/auth, client login, index.ts) más allá del orden de aplicación; se ejecutan secuencialmente y se verifican con una sola compilación + prueba E2E al final de la fase.
Ruling: rama de trabajo `fase2-seguridad` creada desde `main` (ec1b45b) — no se trabaja directo en main.
Ruling: verificación de cada tarea con `npx tsc --noEmit` en server/ y client/ + prueba funcional observada (login/401/403); el plan no trae tests unitarios en Fase A (Vitest llega en Fase D) — se sustituye por verificación manual ejecutada y leída.
