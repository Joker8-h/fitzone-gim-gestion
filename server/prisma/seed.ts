import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Iniciando poblado de base de datos...');

  // 1. Usuario Admin por defecto
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gimnasio.com' },
    update: {},
    create: {
      name: 'Propietaria Administradora',
      email: 'admin@gimnasio.com',
      password: 'admin123_hash_placeholder',
      role: 'ADMIN',
    },
  });
  console.log('[SEED] Usuario Admin verificado:', admin.email);

  // 2. Planes de Membresía iniciales
  const plans = [
    { name: 'Mensualidad Completa', durationDays: 30, price: 90000, description: 'Acceso ilimitado por 30 días calendario' },
    { name: 'Quincena', durationDays: 15, price: 50000, description: 'Acceso por 15 días calendario' },
    { name: 'Tiquetera 10 Días', durationDays: 45, price: 70000, description: 'Válido por 45 días calendario' },
    { name: 'Día Individual', durationDays: 1, price: 10000, description: 'Pase de un solo día' },
    { name: 'Trimestre', durationDays: 90, price: 240000, description: '3 meses con descuento' }
  ];

  for (const plan of plans) {
    const existing = await prisma.membershipPlan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.membershipPlan.create({ data: plan });
    }
  }
  console.log('[SEED] Planes de membresía creados.');

  // 3. Categorías Financieras
  const categories = [
    { name: 'Membresías', type: 'INGRESO', isSystem: true },
    { name: 'Venta de Bebidas / Suplementos', type: 'INGRESO', isSystem: false },
    { name: 'Otros Ingresos', type: 'INGRESO', isSystem: false },
    { name: 'Pago a Entrenadores', type: 'EGRESO', isSystem: true },
    { name: 'Arriendo Local', type: 'EGRESO', isSystem: false },
    { name: 'Servicios Públicos (Luz/Agua/Internet)', type: 'EGRESO', isSystem: false },
    { name: 'Mantenimiento y Reparaciones', type: 'EGRESO', isSystem: false },
    { name: 'Insumos de Limpieza', type: 'EGRESO', isSystem: false },
    { name: 'Otros Gastos', type: 'EGRESO', isSystem: false },
  ];

  for (const cat of categories) {
    const existing = await prisma.financialCategory.findFirst({ where: { name: cat.name } });
    if (!existing) {
      await prisma.financialCategory.create({ data: cat });
    }
  }
  console.log('[SEED] Categorías financieras creadas.');

  // 4. Reglas de Seguimiento Inteligente
  const rules = [
    {
      ruleType: 'INACTIVITY',
      thresholdDays: 5,
      isEnabled: true,
      messageTemplate: '¡Hola {nombre}! Te extrañamos en el gimnasio. Notamos que hace {dias} días no vienes a entrenar. ¡Recuerda que la constancia es la clave para alcanzar tus metas! 💪 Te esperamos hoy.',
    },
    {
      ruleType: 'EXPIRING_MEMBERSHIP',
      thresholdDays: 3,
      isEnabled: true,
      messageTemplate: 'Hola {nombre}, te recordamos que tu membresía en el gimnasio está próxima a vencer el {fecha_vence} (en {dias} días). Recuerda renovar a tiempo para que no pierdas ningún día de entrenamiento. 🏋️‍♂️',
    },
  ];

  for (const rule of rules) {
    await prisma.trackingRule.upsert({
      where: { ruleType: rule.ruleType },
      update: {},
      create: rule,
    });
  }
  console.log('[SEED] Reglas de seguimiento configuradas.');

  console.log('[SEED] Base de datos inicializada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
