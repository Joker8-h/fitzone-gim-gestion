export type TabId =
  | 'dashboard'
  | 'clients'
  | 'memberships'
  | 'classes'
  | 'attendance'
  | 'finances'
  | 'employees'
  | 'equipment'
  | 'reports'
  | 'whatsapp';

export interface Client {
  id: string;
  document_id: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  registration_date: string;
  status: 'ACTIVO' | 'INACTIVO';
  notes?: string;
  created_at: string;
  updated_at: string;
  plan_name?: string;
  membership_end_date?: string;
  membership_status?: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'SIN_MEMBRESIA';
  last_access?: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description?: string;
  is_active: number;
}

export interface GymClass {
  id: string;
  name: string;
  instructor_name: string;
  schedule_time: string;
  enrolled_count: number;
  capacity: number;
  color_theme: string;
  status: string;
}

export interface GymEvent {
  id: string;
  title: string;
  event_date: string;
  day_num: string;
  month_short: string;
  time_range: string;
}

export interface Employee {
  id: string;
  full_name: string;
  role: string;
  specialty?: string;
  phone: string;
  salary: number;
  status: 'ACTIVO' | 'INACTIVO';
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  status: 'Disponible' | 'En uso' | 'Mantenimiento';
  last_maintenance: string;
}

export interface AttendanceRecord {
  id: string;
  client_id: string;
  check_in_time: string;
  was_overridden: number;
  override_reason?: string;
  registered_by?: string;
  full_name: string;
  document_id: string;
  avatar_url?: string;
  plan_name?: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  full_name: string;
  document_id: string;
  avatar_url?: string;
  plan_name: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'INGRESO' | 'EGRESO';
  is_system: number;
}

export interface FinancialTransaction {
  id: string;
  type: 'INGRESO' | 'EGRESO';
  category_id: string;
  category_name?: string;
  concept: string;
  amount: number;
  date: string;
  registered_by?: string;
}

export interface FinanceSummary {
  totalIncomes: number;
  totalExpenses: number;
  netResult: number;
  byCategory: Array<{ name: string; type: string; total: number }>;
}

export interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  todayIncomes: number;
  memberships: {
    vigente: number;
    porVencer: number;
    vencida: number;
  };
  financesMonth: {
    totalIncomes: number;
    totalExpenses: number;
    netResult: number;
  };
  todayAttendancesCount: number;
  monthAttendancesCount: number;
  attendancePercentage: number;
  attendanceLast7Days: Array<{ date: string; label: string; count: number }>;
  recentAttendances: AttendanceRecord[];
  recentPayments: PaymentRecord[];
  planDistribution: Array<{ name: string; count: number; percentage: number }>;
  monthlyRevenues?: Array<{ month: string; total: number }>;
  classesToday: GymClass[];
  upcomingEvents: GymEvent[];
  equipmentList: EquipmentItem[];
}

export interface TrackingRule {
  id: string;
  rule_type: 'INACTIVITY' | 'EXPIRING_MEMBERSHIP';
  threshold_days: number;
  is_enabled: number;
  message_template: string;
}

export interface TrackingCandidate {
  clientId: string;
  fullName: string;
  phone: string;
  reason: 'INACTIVITY' | 'EXPIRING_MEMBERSHIP';
  daysInfo: number;
  endDate?: string;
  planName?: string;
  suggestedMessage: string;
}

export interface CommunicationLog {
  id: string;
  client_id: string;
  full_name?: string;
  phone?: string;
  rule_type: string;
  message: string;
  status: string;
  sent_at: string;
  response_info?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  performed_by?: string;
  created_at: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}
