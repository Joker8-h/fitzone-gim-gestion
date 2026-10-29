import { db } from '../db/database.js';
import { financeService } from './financeService.js';
import { getTodayString, addDaysToDate } from './membershipService.js';

export const dashboardService = {
  getMetrics() {
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
      SELECT m.end_date, m.client_id, p.name as plan_name
      FROM client_memberships m
      JOIN membership_plans p ON m.plan_id = p.id
      INNER JOIN (
        SELECT client_id, MAX(end_date) as max_end
        FROM client_memberships
        GROUP BY client_id
      ) latest ON m.client_id = latest.client_id AND m.end_date = latest.max_end
    `).all() as any[];

    let vigente = 0;
    let porVencer = 0;
    let vencida = 0;
    const planCounter: Record<string, number> = {};

    for (const item of allLatest) {
      planCounter[item.plan_name] = (planCounter[item.plan_name] || 0) + 1;

      if (item.end_date < today) {
        vencida++;
      } else {
        const diffMs = new Date(item.end_date).getTime() - new Date(today).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) {
          porVencer++;
        } else {
          vigente++;
        }
      }
    }

    // 3. Finanzas de hoy y del mes en curso
    const todayFinances = financeService.getSummary(today, today);
    const monthFinances = financeService.getSummary(startOfMonth, today);

    // 4. Asistencias hoy y mes
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

    // 5. Asistencias de los últimos 7 días
    const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const attendanceLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = addDaysToDate(today, -i);
      const [, m, d] = dStr.split('-').map(Number);
      const label = `${d} ${monthsShort[m - 1]}`;
      // @ts-ignore
      const row = db.prepare(`
        SELECT COUNT(*) as count FROM attendances
        WHERE date(check_in_time) = ?
      `).get(dStr) as any;
      attendanceLast7Days.push({
        date: dStr,
        label,
        count: row?.count || 0,
      });
    }

    // 6. Miembros recientes (últimas entradas)
    // @ts-ignore
    const recentAttendances = db.prepare(`
      SELECT 
        a.id, a.client_id, a.check_in_time, a.was_overridden,
        c.full_name, c.document_id,
        (
          SELECT p.name 
          FROM client_memberships m 
          JOIN membership_plans p ON m.plan_id = p.id 
          WHERE m.client_id = c.id 
          ORDER BY m.end_date DESC LIMIT 1
        ) as plan_name
      FROM attendances a
      JOIN clients c ON a.client_id = c.id
      ORDER BY a.check_in_time DESC
      LIMIT 6
    `).all() as any[];

    // 7. Últimos pagos registrados
    // @ts-ignore
    const recentPayments = db.prepare(`
      SELECT 
        pay.id, pay.amount, pay.payment_method, pay.created_at,
        c.full_name, c.document_id,
        COALESCE(pl.name, 'Membresía') as plan_name
      FROM payments pay
      JOIN clients c ON pay.client_id = c.id
      LEFT JOIN client_memberships m ON pay.membership_id = m.id
      LEFT JOIN membership_plans pl ON m.plan_id = pl.id
      ORDER BY pay.created_at DESC
      LIMIT 6
    `).all() as any[];

    // 8. Distribución de planes (para gráfica de dona)
    const totalWithPlans = allLatest.length || 1;
    const planDistribution = Object.entries(planCounter).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalWithPlans) * 100),
    })).sort((a, b) => b.count - a.count);

    const activeCount = clientCounts?.active || 0;
    const todayCount = todayAtt?.count || 0;
    const attendancePercentage = activeCount > 0 ? Math.min(100, Math.round((todayCount / activeCount) * 100)) : 0;

    return {
      totalClients: clientCounts?.total || 0,
      activeClients: activeCount,
      inactiveClients: clientCounts?.inactive || 0,
      todayIncomes: todayFinances.totalIncomes,
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
      todayAttendancesCount: todayCount,
      monthAttendancesCount: monthAtt?.count || 0,
      attendancePercentage,
      attendanceLast7Days,
      recentAttendances,
      recentPayments,
      planDistribution,
    };
  }
};
