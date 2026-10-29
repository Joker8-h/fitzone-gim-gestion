import { db, initDatabase } from './database.js';
import crypto from 'crypto';

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split('T')[0];
}

export function runSeed() {
  initDatabase();
  console.log('[SEED] Poblando base de datos inicial...');

  // 1. Usuario Admin
  const checkAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@gimnasio.com');
  if (!checkAdmin) {
    db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'Propietaria Administradora',
      'admin@gimnasio.com',
      'admin123',
      'ADMIN'
    );
  }

  // 2. Planes iniciales
  const plans = [
    { name: 'Mensual', duration_days: 30, price: 100000, description: 'Acceso ilimitado por 30 días calendario' },
    { name: 'Trimestral', duration_days: 90, price: 270000, description: '3 meses continuos con descuento' },
    { name: 'Semestral', duration_days: 180, price: 500000, description: '6 meses de entrenamiento ilimitado' },
    { name: 'Anual', duration_days: 365, price: 900000, description: 'Plan completo por 1 año' },
    { name: 'Quincenal', duration_days: 15, price: 55000, description: 'Acceso por 15 días calendario' },
    { name: 'Día Individual', duration_days: 1, price: 12000, description: 'Pase de un solo día' }
  ];

  for (const plan of plans) {
    const existing = db.prepare('SELECT id FROM membership_plans WHERE name = ?').get(plan.name);
    if (!existing) {
      db.prepare(`
        INSERT INTO membership_plans (id, name, duration_days, price, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), plan.name, plan.duration_days, plan.price, plan.description);
    }
  }

  // 3. Categorías financieras
  const categories = [
    { name: 'Membresías', type: 'INGRESO', is_system: 1 },
    { name: 'Venta de Bebidas / Suplementos', type: 'INGRESO', is_system: 0 },
    { name: 'Otros Ingresos', type: 'INGRESO', is_system: 0 },
    { name: 'Pago a Entrenadores', type: 'EGRESO', is_system: 1 },
    { name: 'Arriendo Local', type: 'EGRESO', is_system: 0 },
    { name: 'Servicios Públicos (Luz/Agua/Internet)', type: 'EGRESO', is_system: 0 },
    { name: 'Mantenimiento y Reparaciones', type: 'EGRESO', is_system: 0 },
    { name: 'Insumos de Limpieza', type: 'EGRESO', is_system: 0 },
    { name: 'Otros Gastos', type: 'EGRESO', is_system: 0 },
  ];

  for (const cat of categories) {
    const existing = db.prepare('SELECT id FROM financial_categories WHERE name = ?').get(cat.name);
    if (!existing) {
      db.prepare(`
        INSERT INTO financial_categories (id, name, type, is_system)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), cat.name, cat.type, cat.is_system);
    }
  }

  // 4. Reglas de seguimiento inteligente
  const rules = [
    {
      rule_type: 'INACTIVITY',
      threshold_days: 5,
      is_enabled: 1,
      message_template: '¡Hola {nombre}! 💪 Te extrañamos en FITZONE. Notamos que hace {dias} días no vienes a entrenar. ¡Recuerda que la disciplina hoy construye los resultados de mañana! Te esperamos hoy.'
    },
    {
      rule_type: 'EXPIRING_MEMBERSHIP',
      threshold_days: 3,
      is_enabled: 1,
      message_template: 'Hola {nombre} 👋 te recordamos que tu membresía en FITZONE vencerá el {fecha_vence} (en {dias} días). Renueva a tiempo para continuar tu entrenamiento sin interrupciones. 🏋️'
    }
  ];

  for (const rule of rules) {
    const existing = db.prepare('SELECT id FROM tracking_rules WHERE rule_type = ?').get(rule.rule_type);
    if (!existing) {
      db.prepare(`
        INSERT INTO tracking_rules (id, rule_type, threshold_days, is_enabled, message_template)
        VALUES (?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), rule.rule_type, rule.threshold_days, rule.is_enabled, rule.message_template);
    }
  }

  // 5. Miembros iniciales demostrativos si hay pocos registros
  const today = new Date().toISOString().split('T')[0];
  // @ts-ignore
  const planMensual = db.prepare("SELECT * FROM membership_plans WHERE name = 'Mensual'").get() as any;
  // @ts-ignore
  const planTrimestral = db.prepare("SELECT * FROM membership_plans WHERE name = 'Trimestral'").get() as any;
  // @ts-ignore
  const planAnual = db.prepare("SELECT * FROM membership_plans WHERE name = 'Anual'").get() as any;
  // @ts-ignore
  const catMembresias = db.prepare("SELECT id FROM financial_categories WHERE name = 'Membresías'").get() as any;

  const sampleMembers = [
    { doc: '1020456789', name: 'Carlos Martínez', phone: '3104567890', plan: planMensual, daysOffset: 22, attendedToday: '08:12:00' },
    { doc: '1030567891', name: 'María López', phone: '3115678901', plan: planTrimestral, daysOffset: 75, attendedToday: '08:05:00' },
    { doc: '1040678912', name: 'Andrés Gómez', phone: '3126789012', plan: planMensual, daysOffset: 2, attendedToday: '07:58:00' }, // Por vencer en 2 días
    { doc: '1050789123', name: 'Valentina Ruiz', phone: '3157890123', plan: planAnual, daysOffset: 310, attendedToday: '07:42:00' },
    { doc: '1060891234', name: 'Jhonatan Pérez', phone: '3168901234', plan: planMensual, daysOffset: 18, attendedToday: null }, // Inactivo > 5 días
    { doc: '1070912345', name: 'Camila Restrepo', phone: '3189012345', plan: planMensual, daysOffset: -4, attendedToday: null } // Vencida hace 4 días
  ];

  for (const sm of sampleMembers) {
    // @ts-ignore
    const exists = db.prepare('SELECT id FROM clients WHERE document_id = ?').get(sm.doc) as any;
    if (!exists && sm.plan) {
      const clientId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO clients (id, document_id, full_name, phone, registration_date, status)
        VALUES (?, ?, ?, ?, ?, 'ACTIVO')
      `).run(clientId, sm.doc, sm.name, sm.phone, addDays(today, -30));

      const startDate = addDays(today, sm.daysOffset - sm.plan.duration_days);
      const endDate = addDays(today, sm.daysOffset);
      const memId = crypto.randomUUID();
      const payId = crypto.randomUUID();

      db.prepare(`
        INSERT INTO client_memberships (id, client_id, plan_id, start_date, end_date, status, price_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(memId, clientId, sm.plan.id, startDate, endDate, sm.daysOffset < 0 ? 'VENCIDA' : 'VIGENTE', sm.plan.price);

      db.prepare(`
        INSERT INTO payments (id, client_id, membership_id, amount, payment_method, created_at)
        VALUES (?, ?, ?, ?, 'EFECTIVO', ?)
      `).run(payId, clientId, memId, sm.plan.price, `${today} 08:00:00`);

      if (catMembresias) {
        db.prepare(`
          INSERT INTO financial_transactions (id, type, category_id, concept, amount, date, payment_id, registered_by)
          VALUES (?, 'INGRESO', ?, ?, ?, ?, ?, 'Admin')
        `).run(crypto.randomUUID(), catMembresias.id, `Pago Membresía: ${sm.plan.name} - ${sm.name}`, sm.plan.price, today, payId);
      }

      if (sm.attendedToday) {
        db.prepare(`
          INSERT INTO attendances (id, client_id, check_in_time, was_overridden, registered_by)
          VALUES (?, ?, ?, 0, 'Recepción')
        `).run(crypto.randomUUID(), clientId, `${today} ${sm.attendedToday}`);
      } else if (sm.name === 'Jhonatan Pérez') {
        // Última asistencia hace 7 días para demostrar detección IA de inactividad
        const sevenDaysAgo = addDays(today, -7);
        db.prepare(`
          INSERT INTO attendances (id, client_id, check_in_time, was_overridden, registered_by)
          VALUES (?, ?, ?, 0, 'Recepción')
        `).run(crypto.randomUUID(), clientId, `${sevenDaysAgo} 18:21:00`);
      }

      // Agregar asistencias históricas en los últimos 6 días para poblar la curva de la gráfica
      for (let d = 1; d <= 6; d++) {
        if ((sm.doc.charCodeAt(9) + d) % 2 === 0) {
          const histDate = addDays(today, -d);
          db.prepare(`
            INSERT INTO attendances (id, client_id, check_in_time, was_overridden, registered_by)
            VALUES (?, ?, ?, 0, 'Recepción')
          `).run(crypto.randomUUID(), clientId, `${histDate} 09:15:00`);
        }
      }
    }
  }

  console.log('[SEED] Poblado completado con éxito.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed();
}
