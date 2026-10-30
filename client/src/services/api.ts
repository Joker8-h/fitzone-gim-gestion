import type {
  Client,
  MembershipPlan,
  GymClass,
  GymEvent,
  Employee,
  EquipmentItem,
  AttendanceRecord,
  FinancialCategory,
  FinancialTransaction,
  FinanceSummary,
  DashboardMetrics,
  TrackingRule,
  TrackingCandidate,
  CommunicationLog,
  AuditLog,
  SystemUser,
} from '../types/api';

let sessionToken: string | null = null;

export function setAuthToken(token: string | null) {
  sessionToken = token;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMessage = data?.message || data?.error || `Error HTTP ${res.status}`;
    const err: any = new Error(errMessage);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export const api = {
  // Autenticación y Usuarios del Sistema
  login: (username: string, password: string) =>
    request<{ user: SystemUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: SystemUser }>('/api/auth/me'),
  getUsers: () => request<SystemUser[]>('/api/auth/users'),
  createUser: (payload: { name: string; email: string; password: string; role: string }) =>
    request<SystemUser>('/api/auth/users', { method: 'POST', body: JSON.stringify(payload) }),
  deleteUser: (id: string) =>
    request<{ deleted: boolean }>(`/api/auth/users/${id}`, { method: 'DELETE' }),

  // Dashboard & Auditoría
  getDashboardMetrics: () => request<DashboardMetrics>('/api/dashboard/metrics'),
  getAuditLogs: () => request<AuditLog[]>('/api/dashboard/audit-logs'),

  // Miembros (Clientes)
  getClients: (search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const qs = params.toString();
    return request<Client[]>(`/api/clients${qs ? `?${qs}` : ''}`);
  },
  getClientDetail: (id: string) => request<any>(`/api/clients/${id}`),
  createClient: (payload: { documentId: string; fullName: string; phone: string; notes?: string }) =>
    request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(payload) }),
  updateClient: (
    id: string,
    payload: { fullName?: string; phone?: string; notes?: string; status?: 'ACTIVO' | 'INACTIVO' }
  ) => request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deactivateClient: (id: string) =>
    request<Client>(`/api/clients/${id}/deactivate`, { method: 'PATCH' }),
  deleteClient: (id: string) =>
    request<{ deleted: boolean }>(`/api/clients/${id}`, { method: 'DELETE' }),

  // Planes y Membresías (DP-002)
  getPlans: () => request<MembershipPlan[]>('/api/memberships/plans'),
  createPlan: (payload: { name: string; durationDays: number; price: number; description?: string }) =>
    request<MembershipPlan>('/api/memberships/plans', { method: 'POST', body: JSON.stringify(payload) }),
  deletePlan: (id: string) =>
    request<{ deleted: boolean }>(`/api/memberships/plans/${id}`, { method: 'DELETE' }),
  assignMembership: (payload: {
    clientId: string;
    planId: string;
    paymentMethod: string;
    pricePaid?: number;
    amountPaid?: number;
    reference?: string;
    notes?: string;
  }) =>
    request<{ membership: any; payment: any }>('/api/memberships/assign', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        amountPaid: payload.amountPaid ?? payload.pricePaid,
        pricePaid: payload.pricePaid ?? payload.amountPaid,
      }),
    }),

  // Asistencia (DP-003)
  getAttendances: (date?: string) =>
    request<AttendanceRecord[]>(`/api/attendance${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  checkIn: (payload: { clientId?: string; documentId?: string; override?: boolean; overrideReason?: string }) =>
    request<any>('/api/attendance/check-in', { method: 'POST', body: JSON.stringify(payload) }),

  // Operaciones: Clases, Eventos, Empleados, Equipos
  getClasses: () => request<GymClass[]>('/api/operations/classes'),
  createClass: (payload: {
    name: string;
    instructorName: string;
    scheduleTime: string;
    capacity?: number;
    colorTheme?: string;
  }) => request<GymClass>('/api/operations/classes', { method: 'POST', body: JSON.stringify(payload) }),
  updateClassEnrollment: (id: string, delta: number) =>
    request<GymClass>(`/api/operations/classes/${id}/enrollment`, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    }),
  deleteClass: (id: string) =>
    request<{ deleted: boolean }>(`/api/operations/classes/${id}`, { method: 'DELETE' }),

  getEvents: () => request<GymEvent[]>('/api/operations/events'),
  createEvent: (payload: {
    title: string;
    eventDate?: string;
    dayNum: string;
    monthShort: string;
    timeRange: string;
  }) => request<GymEvent>('/api/operations/events', { method: 'POST', body: JSON.stringify(payload) }),
  deleteEvent: (id: string) =>
    request<{ deleted: boolean }>(`/api/operations/events/${id}`, { method: 'DELETE' }),

  getEmployees: () => request<Employee[]>('/api/operations/employees'),
  createEmployee: (payload: {
    fullName: string;
    role: string;
    specialty?: string;
    phone: string;
    salary?: number;
  }) => request<Employee>('/api/operations/employees', { method: 'POST', body: JSON.stringify(payload) }),
  toggleEmployeeStatus: (id: string) =>
    request<Employee>(`/api/operations/employees/${id}/toggle`, { method: 'PATCH' }),
  deleteEmployee: (id: string) =>
    request<{ deleted: boolean }>(`/api/operations/employees/${id}`, { method: 'DELETE' }),

  getEquipment: () => request<EquipmentItem[]>('/api/operations/equipment'),
  createEquipment: (payload: {
    name: string;
    category: string;
    status?: string;
    lastMaintenance?: string;
  }) => request<EquipmentItem>('/api/operations/equipment', { method: 'POST', body: JSON.stringify(payload) }),
  updateEquipmentStatus: (id: string, status: string, lastMaintenance?: string) =>
    request<EquipmentItem>(`/api/operations/equipment/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, lastMaintenance }),
    }),
  deleteEquipment: (id: string) =>
    request<{ deleted: boolean }>(`/api/operations/equipment/${id}`, { method: 'DELETE' }),

  // Finanzas (DP-006)
  getFinanceSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return request<FinanceSummary>(`/api/finances/summary${qs ? `?${qs}` : ''}`);
  },
  getFinanceTransactions: () => request<FinancialTransaction[]>('/api/finances/transactions'),
  getFinanceCategories: () => request<FinancialCategory[]>('/api/finances/categories'),
  createFinanceTransaction: (payload: {
    type: 'INGRESO' | 'EGRESO';
    categoryId: string;
    concept: string;
    amount: number;
    date?: string;
  }) => request<FinancialTransaction>('/api/finances/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteFinanceTransaction: (id: string) =>
    request<{ deleted: boolean }>(`/api/finances/transactions/${id}`, { method: 'DELETE' }),

  // WhatsApp & IA (Baileys + Gemini)
  getWhatsAppStatus: () =>
    request<{ status: string; qrDataUrl: string | null; connectedPhone: string | null }>('/api/whatsapp/status'),
  connectWhatsApp: () => request<any>('/api/whatsapp/connect', { method: 'POST' }),
  disconnectWhatsApp: () => request<any>('/api/whatsapp/disconnect', { method: 'POST' }),
  getTrackingRules: () => request<TrackingRule[]>('/api/whatsapp/rules'),
  updateTrackingRule: (
    ruleType: string,
    payload: { thresholdDays?: number; isEnabled?: boolean; messageTemplate?: string }
  ) => request<TrackingRule>(`/api/whatsapp/rules/${ruleType}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getTrackingCandidates: () => request<TrackingCandidate[]>('/api/whatsapp/candidates'),
  sendWhatsAppMessage: (payload: { clientId: string; ruleType: string; message: string }) =>
    request<{ success: boolean; message: string }>('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runAutomatedWhatsAppSweep: () =>
    request<{ processedCount: number; candidates: TrackingCandidate[] }>('/api/whatsapp/run-automated', {
      method: 'POST',
    }),
  getWhatsAppLogs: () => request<CommunicationLog[]>('/api/whatsapp/logs'),
};
