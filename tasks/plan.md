# Plan de Implementación: Migración a React + TypeScript y Endurecimiento de Seguridad (FITZONE Fase 1)

## 1. Resumen Ejecutivo
Transformar el frontend del **Sistema de Gestión para Gimnasio (FITZONE)** a una arquitectura modular en **React 18 + TypeScript + Vite** (`client/`), manteniendo el 100% de fidelidad visual con el boceto aprobado de FITZONE y conectando cada botón, filtro, paginación, modal y flujo operativo con el backend **Express + SQLite (`node:sqlite`) + Baileys + Gemini AI** (`server/`).

Al compilar la aplicación React con Vite (`client/dist` sincronizado con `server/public`), eliminamos por completo la dependencia de scripts JIT en tiempo de ejecución (`cdn.tailwindcss.com`), lo que nos permite activar una cabecera **`Content-Security-Policy` (CSP) estricta sin `'unsafe-eval'`** y endurecer todas las rutas de la API.

---

## 2. Decisiones de Arquitectura y Organización (`client/` + `server/`)

### 2.1 Estructura Modular del Frontend en React (`client/src/`)
```
client/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx                    # Punto de entrada React 18
    ├── App.tsx                     # Shell principal, estado global sincronizado y enrutamiento de vistas
    ├── styles/
    │   └── fitzone.css             # Sistema de diseño FITZONE completo (variables, grillas, tablas, modales)
    ├── types/
    │   └── api.ts                  # Contratos TypeScript estrictos entre Frontend y Backend
    ├── services/
    │   └── api.ts                  # Cliente HTTP centralizado con manejo de errores, timeouts y cabeceras seguras
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx         # Sidebar oscuro FITZONE con las 10 secciones + tarjeta motivacional
    │   │   ├── Topbar.tsx          # Buscador global interactivo, campana de alertas con dropdown y perfil Admin
    │   │   └── Toast.tsx           # Sistema de notificaciones flotantes
    │   ├── charts/
    │   │   ├── AttendanceLineChart.tsx  # Curva SVG interactiva (7 días / 14 días / 30 días)
    │   │   ├── MonthlyRevenueBars.tsx   # Gráfica de barras de ingresos mensuales
    │   │   └── PlanDonutChart.tsx       # Gráfica de dona SVG de membresías más comunes
    │   └── modals/
    │       ├── ClientModal.tsx          # Crear / Editar Miembro (DP-001)
    │       ├── PlanModal.tsx            # Crear Plan de Membresía
    │       ├── ClassModal.tsx           # Crear / Editar Clase Grupal
    │       ├── EventModal.tsx           # Crear Evento del Gimnasio
    │       ├── EmployeeModal.tsx        # Registrar / Editar Empleado o Entrenador
    │       ├── EquipmentModal.tsx       # Agregar / Editar Equipo o Máquina
    │       └── QuickRenewModal.tsx      # Renovación rápida desde cualquier tabla (DP-002)
    └── views/
        ├── DashboardView.tsx       # Vista Inicio: 4 KPIs + 9 tarjetas del boceto con paginación y acciones reales
        ├── ClientsView.tsx         # Vista Miembros: CRUD completo, filtros, activar/inactivar, historial
        ├── MembershipsView.tsx     # Vista Membresías: Catálogo de planes + Asignación/Renovación acumulativa (DP-002)
        ├── ClassesView.tsx         # Vista Clases y Eventos: Cupos (+1/-1), estados, creación y eliminación
        ├── AttendanceView.tsx      # Vista Asistencia: Kiosco por cédula (DP-003 bloqueo estricto + excepción auditada)
        ├── FinancesView.tsx        # Vista Pagos y Finanzas: Ingresos, egresos, pago a entrenadores y balance (DP-006)
        ├── EmployeesView.tsx       # Vista Empleados: Directorio de entrenadores, cambio de estado y pago rápido de nómina
        ├── EquipmentView.tsx       # Vista Equipos: Inventario de máquinas, ciclo de estados y registro de mantenimiento
        ├── ReportsView.tsx         # Vista Reportes: Cartera por vencer/vencida, bitácora de auditoría y exportación CSV
        └── WhatsAppAiView.tsx      # Vista Configuración & IA: Escaneo QR Baileys en vivo, reglas Gemini AI y envíos
```

### 2.2 Mapa de Botones y Acciones Verificables (100% Funcionales)
Cada botón visible en el boceto y en las vistas secundarias tendrá una acción real conectada al backend:
1. **Topbar**:
   - Input `Buscar miembros, clases, equipos...`: Filtra en vivo miembros o redirige a la vista correspondiente.
   - Botón `Campana de notificaciones`: Abre un panel desplegable con las alertas reales de membresías por vencer/inactivos y acceso directo a WhatsApp IA.
   - Selector `Perfil Administrador`: Muestra estado del sistema y acceso rápido a auditoría/configuración.
2. **Vista `Inicio` (Dashboard)**:
   - Selector `Últimos 7 días / Últimos 14 días` en la gráfica de asistencia: Actualiza dinámicamente la curva de asistencia.
   - Botón `Ver todas →` en *Clases de hoy*: Navega a la vista `Clases` y permite inscribir alumnos (`+1`/`-1`) directamente desde la tarjeta.
   - Botón `Ver todos →` en *Miembros recientes*: Navega a la bitácora de `Asistencia`.
   - En *Lista de miembros*:
     - Buscador `Buscar miembro...`: Filtra instantáneamente la tabla.
     - Botón `+ Nuevo miembro`: Abre `ClientModal` para crear un miembro real en SQLite.
     - Píldoras `Todos`, `Activos`, `Inactivos`: Filtran el listado por estado real.
     - Botones de cada fila (`Editar ✏️`, `Renovar Membresía 💳`, `Registrar Entrada / Opciones ⋮`): Abren edición, modal de renovación rápida (`QuickRenewModal`) o registran check-in inmediato con validación `DP-003`.
     - Botones de paginación `< 1 2 3 4 5 >`: Paginan realmente los registros de la tabla y permiten cambiar de página.
   - En *Próximos eventos*: Clic en cada evento o `Ver calendario →` lleva al calendario de eventos o muestra detalle.
   - En *Estado de equipos*: Clic en cualquier máquina rota su estado (`Disponible` → `En uso` → `Mantenimiento`) en la base de datos y actualiza la fecha de mantenimiento.
   - En *Últimos pagos*: `Ver todos →` navega a la vista `Pagos`.
3. **Seguridad y Endurecimiento (`server/src/middleware/security.ts`)**:
   - Cabecera `Content-Security-Policy` compatible con el bundle compilado de React (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'`).
   - Validación estricta de tipos y rangos en todos los endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Sanitización recursiva contra XSS e inyección de prototipos (`__proto__`, `constructor`, `prototype`).
   - Consultas 100% parametrizadas en `node:sqlite`.
   - Rate limiting por IP diferenciado para lectura, escritura y acciones de WhatsApp/IA.

---

## 3. Lista de Tareas y Puntos de Control
Ver el desglose detallado en `tasks/todo.md`.
