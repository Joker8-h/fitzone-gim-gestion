import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { api } from '../services/api';
import type {
  AttendanceRecord,
  AuditLog,
  Client,
  CommunicationLog,
  DashboardMetrics,
  Employee,
  EquipmentItem,
  FinancialCategory,
  FinancialTransaction,
  FinanceSummary,
  GymClass,
  GymEvent,
  MembershipPlan,
  SystemUser,
  TrackingCandidate,
  TrackingRule,
} from '../types/api';

/**
 * Estado de datos centralizado del cliente (Fase 2 — D4).
 *
 * Antes ~20 `useState` de datos vivían en `App.tsx` y CADA mutación refrescaba
 * los 13 endpoints (`refreshAllData`). Ahora el estado vive aquí, detrás de un
 * `useReducer`, y las mutaciones invalidan de forma SELECTIVA: `invalidate()`
 * solo vuelve a pedir los endpoints que realmente se afectaron.
 *
 * El refetch integral (`refreshAll`) se reserva para dos casos:
 * 1. la carga inicial tras iniciar sesión,
 * 2. el botón "Reintentar" del banner de error.
 */

/** Recursos refrescables de forma independiente (1:1 con endpoints de services/api). */
export type DataResource =
  | 'metrics'
  | 'clients'
  | 'plans'
  | 'classes'
  | 'events'
  | 'employees'
  | 'equipment'
  | 'attendances'
  | 'financeSummary'
  | 'transactions'
  | 'categories'
  | 'auditLogs'
  | 'systemUsers'
  | 'waStatus'
  | 'trackingRules'
  | 'trackingCandidates'
  | 'waLogs';

/** Estado de la sesión de WhatsApp (mismo shape que `api.getWhatsAppStatus`). */
export interface WaStatus {
  status: string;
  qrDataUrl: string | null;
  connectedPhone: string | null;
}

/** Estado completo expuesto por el contexto. */
export interface DataState {
  // Dashboard & Miembros
  metrics: DashboardMetrics | null;
  clients: Client[];
  plans: MembershipPlan[];
  // Operación diaria
  classes: GymClass[];
  events: GymEvent[];
  employees: Employee[];
  equipment: EquipmentItem[];
  attendances: AttendanceRecord[];
  // Finanzas
  financeSummary: FinanceSummary | null;
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  // Auditoría y usuarios del sistema
  auditLogs: AuditLog[];
  systemUsers: SystemUser[];
  // WhatsApp & IA
  waStatus: WaStatus;
  trackingRules: TrackingRule[];
  trackingCandidates: TrackingCandidate[];
  waLogs: CommunicationLog[];
  // C8: spinner global mientras dura el refetch integral
  loadingData: boolean;
  // C8: banner de error con botón "Reintentar" (refetch integral fallido)
  dataError: string | null;
}

/** Valores por recurso (el estado sin los flags de carga/error). */
type ResourceValues = Omit<DataState, 'loadingData' | 'dataError'>;

/** Recursos que componen el refetch integral (los 13 endpoints de siempre). */
type CoreResource =
  | 'metrics'
  | 'clients'
  | 'plans'
  | 'classes'
  | 'events'
  | 'employees'
  | 'equipment'
  | 'attendances'
  | 'financeSummary'
  | 'transactions'
  | 'categories'
  | 'auditLogs'
  | 'systemUsers';

/** Valores que aporta un refetch integral. */
type CoreValues = Pick<ResourceValues, CoreResource>;

/** Acciones del reducer de datos. */
type DataAction =
  /** Refetch integral en curso: activa el spinner global. */
  | { type: 'FETCH_START' }
  /** Refetch integral correcto: mergea los 13 recursos y limpia el error. */
  | { type: 'FETCH_SUCCESS'; values: CoreValues }
  /** Fallo de refetch (integral o selectivo de recursos core): banner + fin de spinner. */
  | { type: 'FETCH_ERROR'; message: string }
  /** Refetch selectivo correcto: solo sobreescribe los recursos pedidos. */
  | { type: 'SET_RESOURCES'; values: Partial<ResourceValues> };

/** Estado inicial (spinner visible hasta la primera carga correcta). */
const INITIAL_DATA_STATE: DataState = {
  metrics: null,
  clients: [],
  plans: [],
  classes: [],
  events: [],
  employees: [],
  equipment: [],
  attendances: [],
  financeSummary: null,
  transactions: [],
  categories: [],
  auditLogs: [],
  systemUsers: [],
  waStatus: { status: 'DISCONNECTED', qrDataUrl: null, connectedPhone: null },
  trackingRules: [],
  trackingCandidates: [],
  waLogs: [],
  loadingData: true,
  dataError: null,
};

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loadingData: true };
    case 'FETCH_SUCCESS':
      return { ...state, ...action.values, loadingData: false, dataError: null };
    case 'FETCH_ERROR':
      return { ...state, loadingData: false, dataError: action.message };
    case 'SET_RESOURCES':
      // Refetch selectivo: no toca loadingData ni dataError
      return { ...state, ...action.values };
    default:
      return state;
  }
}

/** Fetcher por recurso: alinea cada `DataResource` con su endpoint de `services/api`. */
const RESOURCE_FETCHERS: { [K in DataResource]: () => Promise<ResourceValues[K]> } = {
  metrics: api.getDashboardMetrics,
  clients: () => api.getClients(),
  plans: api.getPlans,
  classes: api.getClasses,
  events: api.getEvents,
  employees: api.getEmployees,
  equipment: api.getEquipment,
  attendances: api.getAttendances,
  financeSummary: () => api.getFinanceSummary(),
  transactions: api.getFinanceTransactions,
  categories: api.getFinanceCategories,
  auditLogs: api.getAuditLogs,
  systemUsers: api.getUsers,
  waStatus: api.getWhatsAppStatus,
  trackingRules: api.getTrackingRules,
  trackingCandidates: api.getTrackingCandidates,
  waLogs: api.getWhatsAppLogs,
};

/** Recursos de WhatsApp/IA: sus errores NUNCA activan el banner global (como antes). */
const WHATSAPP_RESOURCES: ReadonlySet<DataResource> = new Set([
  'waStatus',
  'trackingRules',
  'trackingCandidates',
  'waLogs',
]);

/** Carga integral de los 13 endpoints core (mismo orden que el `refreshAllData` original). */
async function fetchCoreData(): Promise<CoreValues> {
  const [
    metrics,
    clients,
    plans,
    classes,
    events,
    employees,
    equipment,
    attendances,
    financeSummary,
    transactions,
    categories,
    auditLogs,
    systemUsers,
  ] = await Promise.all([
    api.getDashboardMetrics(),
    api.getClients(),
    api.getPlans(),
    api.getClasses(),
    api.getEvents(),
    api.getEmployees(),
    api.getEquipment(),
    api.getAttendances(),
    api.getFinanceSummary(),
    api.getFinanceTransactions(),
    api.getFinanceCategories(),
    api.getAuditLogs(),
    api.getUsers(),
  ]);

  return {
    metrics,
    clients,
    plans,
    classes,
    events,
    employees,
    equipment,
    attendances,
    financeSummary,
    transactions,
    categories,
    auditLogs,
    systemUsers,
  };
}

/** Refetchea en paralelo SOLO los recursos indicados y devuelve sus valores. */
async function fetchSelected(resources: readonly DataResource[]): Promise<Partial<ResourceValues>> {
  const fetched = await Promise.all(
    resources.map(async (resource) => ({ resource, value: await RESOURCE_FETCHERS[resource]() }))
  );
  const values: Partial<ResourceValues> = {};
  for (const { resource, value } of fetched) {
    Object.assign(values, { [resource]: value });
  }
  return values;
}

/** Mensaje legible para el banner de error (mismo fallback que el código original). */
function toErrorMessage(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : 'No se pudieron cargar los datos del gimnasio.';
}

interface DataProviderValue {
  state: DataState;
  /** Refetch integral de los 13 endpoints core (login inicial y "Reintentar"). */
  refreshAll: () => Promise<void>;
  /** Refetch del bloque WhatsApp & IA (4 endpoints). */
  refreshWhatsApp: () => Promise<void>;
  /** Refetch SELECTIVO: solo los endpoints afectados por la última mutación. */
  invalidate: (resources: DataResource[]) => Promise<void>;
}

const DataContext = createContext<DataProviderValue | null>(null);

/** Hook de acceso al estado de datos centralizado. */
export function useData(): DataProviderValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData debe usarse dentro de <DataProvider>');
  }
  return ctx;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, INITIAL_DATA_STATE);

  const refreshAll = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const values = await fetchCoreData();
      dispatch({ type: 'FETCH_SUCCESS', values });
    } catch (err) {
      console.error('Error refrescando datos:', err);
      dispatch({ type: 'FETCH_ERROR', message: toErrorMessage(err) });
    }
  }, []);

  const refreshWhatsApp = useCallback(async () => {
    try {
      const values = await fetchSelected(['waStatus', 'trackingRules', 'trackingCandidates', 'waLogs']);
      dispatch({ type: 'SET_RESOURCES', values });
    } catch (err) {
      // Comportamiento original: este bloque solo registraba el error en consola
      console.error('Error cargando WhatsApp IA:', err);
    }
  }, []);

  const invalidate = useCallback(async (resources: DataResource[]) => {
    const pending = [...new Set(resources)];
    if (pending.length === 0) return;

    try {
      const values = await fetchSelected(pending);
      dispatch({ type: 'SET_RESOURCES', values });
    } catch (err) {
      console.error('Error refrescando datos:', err);
      // Si el fallo afecta recursos core se muestra el banner con reintento,
      // igual que ocurría cuando cada mutación refrescaba todo.
      if (pending.some((resource) => !WHATSAPP_RESOURCES.has(resource))) {
        dispatch({ type: 'FETCH_ERROR', message: toErrorMessage(err) });
      }
    }
  }, []);

  const value = useMemo<DataProviderValue>(
    () => ({ state, refreshAll, refreshWhatsApp, invalidate }),
    [state, refreshAll, refreshWhatsApp, invalidate]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
