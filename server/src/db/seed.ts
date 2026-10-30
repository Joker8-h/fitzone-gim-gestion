import { db, initDatabase } from './database.js';
import crypto from 'crypto';
import { authService } from '../services/authService.js';

export function runSeed() {
  initDatabase();
  console.log('[SEED] Inicializando sistema FITZONE en blanco (desde cero)...');

  // 1. Asegurar únicamente el usuario Administrador para poder iniciar sesión
  authService.ensureDefaultUsers();

  // 2. Categorías base del sistema (requeridas para clasificar pagos de membresías y egresos sin datos de prueba)
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

  // 3. Configuración base de las 2 reglas de IA (sin candidatos ni envíos de prueba)
  const rules = [
    {
      rule_type: 'INACTIVITY',
      threshold_days: 5,
      is_enabled: 1,
      message_template:
        'Hola {nombre}, te saludamos desde FITZONE. Notamos que hace {dias} días no registras asistencia. Te invitamos a retomar tus entrenamientos esta semana.',
    },
    {
      rule_type: 'EXPIRING_MEMBERSHIP',
      threshold_days: 3,
      is_enabled: 1,
      message_template:
        'Hola {nombre}, te recordamos que tu membresía en FITZONE vencerá el {fecha_vence} (en {dias} días). Te invitamos a realizar tu renovación a tiempo en recepción.',
    },
  ];

  for (const rule of rules) {
    const existing = db.prepare('SELECT id FROM tracking_rules WHERE rule_type = ?').get(rule.rule_type);
    if (!existing) {
      db.prepare(`
        INSERT INTO tracking_rules (id, rule_type, threshold_days, is_enabled, message_template)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        rule.rule_type,
        rule.threshold_days,
        rule.is_enabled,
        rule.message_template
      );
    } else {
      db.prepare(`
        UPDATE tracking_rules SET message_template = ? WHERE rule_type = ?
      `).run(rule.message_template, rule.rule_type);
    }
  }

  console.log('[SEED] Sistema listo y en blanco (0 miembros, 0 pagos, 0 clases, 0 equipos).');
}

export function clearAllDataToZero() {
  initDatabase();
  db.exec(`
    DELETE FROM communication_logs;
    DELETE FROM audit_logs;
    DELETE FROM financial_transactions;
    DELETE FROM payments;
    DELETE FROM attendances;
    DELETE FROM client_memberships;
    DELETE FROM clients;
    DELETE FROM membership_plans;
    DELETE FROM gym_classes;
    DELETE FROM gym_events;
    DELETE FROM employees;
    DELETE FROM equipment;
  `);
  runSeed();
  console.log('[RESET] Base de datos limpiada completamente a cero.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  clearAllDataToZero();
}
