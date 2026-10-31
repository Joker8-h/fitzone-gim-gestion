import { query, queryOne } from '../db/database.js';
import { financeService } from './financeService.js';
import { getTodayString, addDaysToDate } from './membershipService.js';

export const dashboardService = {
  async getMetrics() {
    const today = getTodayString();
    const currentYear = today.substring(0, 4);
    const currentMonthPrefix = today.substring(0, 7); // 'YYYY-MM'
    const startOfMonth = `${currentMonthPrefix}-01`;

    // 1. Clientes
    const clientCounts = await queryOne<any>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ACTIVO' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'INACTIVO' THEN 1 ELSE 0 END) as inactive
      FROM clients
    `);

    // 2. Membresías más recientes por cliente para calcular estados
    const allLatest = await query<any>(`
      SELECT m.end_date, m.client_id, p.name as plan_name
      FROM client_memberships m
      JOIN membership_plans p ON m.plan_id = p.id
      INNER JOIN (
        SELECT client_id, MAX(end_date) as max_end
        FROM client_memberships
        GROUP BY client_id
      ) latest ON m.client_id = latest.client_id AND m.end_date = latest.max_end
    `);

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
    const todayFinances = await financeService.getSummary(today, today);
    const monthFinances = await financeService.getSummary(startOfMonth, today);

    // 4. Asistencias hoy y mes
    const todayAtt = await queryOne<any>(`
      SELECT COUNT(*) as count FROM attendances
      WHERE substring(check_in_time from 1 for 10) = to_char(localtimestamp, 'YYYY-MM-DD')
    `);

    const monthAtt = await queryOne<any>(`
      SELECT COUNT(*) as count FROM attendances
      WHERE substring(check_in_time from 1 for 10) >= ?
    `, [startOfMonth]);

    // 5. Asistencias de los últimos 7 días (reales desde base de datos)
    const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const attendanceLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = addDaysToDate(today, -i);
      const [, m, d] = dStr.split('-').map(Number);
      const label = `${d} ${monthsShort[m - 1]}`;
      const row = await queryOne<any>(`
        SELECT COUNT(*) as count FROM attendances
        WHERE substring(check_in_time from 1 for 10) = ?
      `, [dStr]);
      attendanceLast7Days.push({
        date: dStr,
        label,
        count: Number(row?.count || 0),
      });
    }

    // 6. Miembros recientes (últimas entradas reales)
    const recentAttendances = await query<any>(`
      SELECT 
        a.id, a.client_id, a.check_in_time, a.was_overridden,
        c.full_name, c.document_id, c.avatar_url,
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
    `);

    // 7. Últimos pagos registrados (reales)
    const recentPayments = await query<any>(`
      SELECT 
        pay.id, pay.amount, pay.payment_method, pay.created_at,
        c.full_name, c.document_id, c.avatar_url,
        COALESCE(pl.name, 'Membresía') as plan_name
      FROM payments pay
      JOIN clients c ON pay.client_id = c.id
      LEFT JOIN client_memberships m ON pay.membership_id = m.id
      LEFT JOIN membership_plans pl ON m.plan_id = pl.id
      ORDER BY pay.created_at DESC
      LIMIT 6
    `);

    // 8. Distribución real de planes (para gráfica de dona)
    const totalWithPlans = allLatest.length;
    const planDistribution = totalWithPlans > 0
      ? Object.entries(planCounter).map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalWithPlans) * 100),
        })).sort((a, b) => b.count - a.count)
      : [];

    // 9. Ingresos mensuales reales por mes del año actual (enero..mes actual)
    const currentMonthNum = Number(today.substring(5, 7));
    const monthlyRevenues = [];
    for (let m = 1; m <= currentMonthNum; m++) {
      const mPrefix = `${currentYear}-${String(m).padStart(2, '0')}`;
      const row = await queryOne<any>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_transactions
        WHERE type = 'INGRESO' AND substring(date from 1 for 7) = ?
      `, [mPrefix]);
      monthlyRevenues.push({
        month: monthsShort[m - 1],
        total: Number(row?.total || 0),
      });
    }

    // 10. Clases del día, Próximos eventos y Estado de equipos (reales)
    const classesToday = await query<any>('SELECT * FROM gym_classes ORDER BY schedule_time ASC');
    const upcomingEvents = await query<any>('SELECT * FROM gym_events ORDER BY event_date ASC LIMIT 5');
    const equipmentList = await query<any>('SELECT * FROM equipment ORDER BY created_at ASC LIMIT 6');

    const activeCount = Number(clientCounts?.active || 0);
    const todayCount = Number(todayAtt?.count || 0);
    const attendancePercentage =
      activeCount > 0 ? Math.min(100, Math.round((todayCount / activeCount) * 100)) : 0;

    return {
      totalClients: Number(clientCounts?.total || 0),
      activeClients: activeCount,
      inactiveClients: Number(clientCounts?.inactive || 0),
      todayIncomes: Number(todayFinances.totalIncomes || 0),
      memberships: {
        vigente,
        porVencer,
        vencida,
      },
      financesMonth: {
        totalIncomes: Number(monthFinances.totalIncomes || 0),
        totalExpenses: Number(monthFinances.totalExpenses || 0),
        netResult: Number(monthFinances.netResult || 0),
      },
      todayAttendancesCount: todayCount,
      monthAttendancesCount: Number(monthAtt?.count || 0),
      attendancePercentage,
      attendanceLast7Days,
      recentAttendances,
      recentPayments,
      planDistribution,
      monthlyRevenues,
      classesToday,
      upcomingEvents,
      equipmentList,
    };
  }
};
