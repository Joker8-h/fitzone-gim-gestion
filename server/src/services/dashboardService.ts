import { db } from '../db/database.js';
import { financeService } from './financeService.js';
import { getTodayString } from './membershipService.js';

export interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
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
}

export const dashboardService = {
  getMetrics(): DashboardMetrics {
    const today = getTodayString();
    const currentMonthPrefix = today.substring(0, 7); // 'YYYY-MM'
    const startOfMonth = `${currentMonthPrefix}-01`;

    // 1. Clientes
    // @ts-ignore
    const clientCounts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ACTIVO' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'INACTIVO' THEN 1 ELSE 0 END) as inactive
      FROM clients
    `).get() as any;

    // 2. Membresías más recientes por cliente para calcular estados
    // @ts-ignore
    const allLatest = db.prepare(`
      SELECT m.end_date, m.client_id
      FROM client_memberships m
      INNER JOIN (
        SELECT client_id, MAX(end_date) as max_end
        FROM client_memberships
        GROUP BY client_id
      ) latest ON m.client_id = latest.client_id AND m.end_date = latest.max_end
    `).all() as any[];

    let vigente = 0;
    let porVencer = 0;
    let vencida = 0;

    for (const item of allLatest) {
      if (item.end_date < today) {
        vencida++;
      } else {
        // Calcular si está a 3 días o menos
        const diffMs = new Date(item.end_date).getTime() - new Date(today).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) {
          porVencer++;
        } else {
          vigente++;
        }
      }
    }

    // 3. Finanzas del mes en curso
    const monthFinances = financeService.getSummary(startOfMonth, today);

    // 4. Asistencias
    // @ts-ignore
    const todayAtt = db.prepare(`
      SELECT COUNT(*) as count FROM attendances
      WHERE date(check_in_time) = date('now', 'localtime')
    `).get() as any;

    // @ts-ignore
    const monthAtt = db.prepare(`
      SELECT COUNT(*) as count FROM attendances
      WHERE date(check_in_time) >= ?
    `).get(startOfMonth) as any;

    return {
      totalClients: clientCounts?.total || 0,
      activeClients: clientCounts?.active || 0,
      inactiveClients: clientCounts?.inactive || 0,
      memberships: {
        vigente,
        porVencer,
        vencida,
      },
      financesMonth: {
        totalIncomes: monthFinances.totalIncomes,
        totalExpenses: monthFinances.totalExpenses,
        netResult: monthFinances.netResult,
      },
      todayAttendancesCount: todayAtt?.count || 0,
      monthAttendancesCount: monthAtt?.count || 0,
    };
  }
};
