import { db, initDatabase } from './database.js';
import crypto from 'crypto';

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
    console.log('[SEED] Usuario admin creado: admin@gimnasio.com');
  }

  // 2. Planes iniciales
  const plans = [
    { name: 'Mensualidad Completa', duration_days: 30, price: 90000, description: 'Acceso ilimitado por 30 días calendario' },
    { name: 'Quincena', duration_days: 15, price: 50000, description: 'Acceso por 15 días calendario' },
    { name: 'Tiquetera 10 Días', duration_days: 45, price: 70000, description: 'Válido por 45 días calendario' },
    { name: 'Día Individual', duration_days: 1, price: 10000, description: 'Pase de un solo día' },
    { name: 'Trimestre', duration_days: 90, price: 240000, description: '3 meses con descuento' }
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
  console.log('[SEED] Planes de membresía listos.');

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
  console.log('[SEED] Categorías financieras listas.');

  // 4. Reglas de seguimiento inteligente
  const rules = [
    {
      rule_type: 'INACTIVITY',
      threshold_days: 5,
      is_enabled: 1,
      message_template: '¡Hola {nombre}! 💪 Te extrañamos en el gimnasio. Notamos que hace {dias} días no vienes a entrenar. ¡Recuerda que la constancia es la clave para alcanzar tus metas! Te esperamos hoy.'
    },
    {
      rule_type: 'EXPIRING_MEMBERSHIP',
      threshold_days: 3,
      is_enabled: 1,
      message_template: 'Hola {nombre} 👋 te recordamos que tu membresía en el gimnasio vencerá el {fecha_vence} (en {dias} días). Recuerda renovar con tiempo para continuar tus entrenamientos sin interrupciones. 🏋️'
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
  console.log('[SEED] Reglas de seguimiento configuradas.');
  console.log('[SEED] Poblado completado con éxito.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed();
}
