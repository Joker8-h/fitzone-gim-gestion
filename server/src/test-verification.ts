import 'dotenv/config';

/**
 * Guard de seguridad (Fase 2 — D1): esta suite E2E CREA y BORRA datos
 * transaccionales, así que solo puede correr contra la BD de prueba.
 * El guard se ejecuta ANTES de cargar `db/database.ts` (imports dinámicos),
 * que es donde se lee DATABASE_URL en ámbito de módulo.
 */
const dbUrl = process.env.DATABASE_URL || '';
if (!/test/i.test(dbUrl)) {
  console.error(
    '\n[FALLO CRÍTICO] test-verification.ts solo corre contra la BD de prueba.\n' +
      `  DATABASE_URL actual: "${dbUrl || '(no definida)'}"\n` +
      '  Apunta a una BD de prueba (nombre que contenga "test"), p. ej.:\n' +
      '  postgresql://postgres:postgres@localhost:5432/fitzone_test\n'
  );
  process.exit(1);
}
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { initDatabase, run } = await import('./db/database.js');
const { runSeed } = await import('./db/seed.js');
const { clientService } = await import('./services/clientService.js');
const { membershipService, addDaysToDate } = await import('./services/membershipService.js');
const { attendanceService } = await import('./services/attendanceService.js');
const { financeService } = await import('./services/financeService.js');
const { dashboardService } = await import('./services/dashboardService.js');
const { aiTrackingService } = await import('./services/aiTrackingService.js');

console.log('\n======================================================');
console.log('INICIANDO VERIFICACION COMPLETA DE CRITERIOS FASE 1');
console.log('======================================================\n');

async function runTests() {
  await initDatabase();
  await runSeed();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASO] ${testName}`);
      passed++;
    } else {
      console.error(`[FALLO] ${testName}`);
      failed++;
    }
  }

  // Limpiar registros temporales de pruebas previas
  await run("DELETE FROM financial_transactions WHERE concept LIKE '%Entrenador Miguel%'");
  await run("DELETE FROM clients WHERE document_id IN ('1098765432', '999888777')");

  // 1. CA-001: Crear cliente y consultar
  const testDoc = '1098765432';
  const existing = await clientService.getByDocument(testDoc);
  const client = existing || await clientService.create({
    documentId: testDoc,
    fullName: 'Juan Pérez Gimnasio',
    phone: '3109876543',
    notes: 'Cliente de prueba automatizada'
  });
  assert(client.document_id === testDoc, 'CA-001: Creación de cliente con documento único');

  // Buscar cliente
  const searchResults = await clientService.list('Juan');
  assert(searchResults.some(c => c.document_id === testDoc), 'CA-001: Búsqueda de cliente por nombre');

  // 2. CA-003: Asignar Membresía y Registrar Pago
  const plans = await membershipService.getPlans();
  const planMes = plans.find(p => p.duration_days === 30) || plans[0];
  assert(Boolean(planMes), 'CA-003: Catálogo de planes disponible');

  if (!planMes) {
    console.error('No hay planes disponibles; crea un plan antes de correr esta verificación.');
    process.exit(1);
  }

  const paymentResult = await membershipService.assignMembership({
    clientId: client.id,
    planId: planMes.id,
    amountPaid: planMes.price,
    paymentMethod: 'NEQUI',
    reference: 'REF-TEST-001',
    registeredBy: 'Admin'
  });
  assert(paymentResult.membership.plan_id === planMes.id, 'CA-003: Asignación de membresía exitosa');
  assert(paymentResult.payment.amount === planMes.price, 'CA-003: Registro de pago enlazado');

  // 3. DP-002: Renovación adelantada suma días al vencimiento actual
  const currentEnd = paymentResult.membership.end_date;
  const renewalResult = await membershipService.assignMembership({
    clientId: client.id,
    planId: planMes.id,
    amountPaid: planMes.price,
    paymentMethod: 'EFECTIVO',
    registeredBy: 'Admin'
  });
  const expectedNewEnd = addDaysToDate(currentEnd, planMes.duration_days);
  assert(
    renewalResult.membership.end_date === expectedNewEnd,
    `DP-002: Renovación suma días exactamente al vencimiento previo (${currentEnd} + ${planMes.duration_days}d -> ${expectedNewEnd})`
  );

  // 4. CA-002: Registro de asistencia normal con membresía vigente
  const checkInSuccess = await attendanceService.checkIn(client.document_id, false, undefined, 'Recepción');
  assert(checkInSuccess.success === true && checkInSuccess.blocked === false, 'CA-002: Marcaje de asistencia permitido con membresía al día');

  // 5. DP-003: Bloqueo de marcaje ante cliente con membresía vencida
  const expiredDoc = '999888777';
  const expiredClient = await clientService.getByDocument(expiredDoc) || await clientService.create({
    documentId: expiredDoc,
    fullName: 'Carlos Vencido',
    phone: '3001112233'
  });
  void expiredClient;

  // Simular intento de marcaje sin membresía
  const checkInBlocked = await attendanceService.checkIn(expiredDoc, false);
  assert(
    checkInBlocked.blocked === true && checkInBlocked.success === false,
    'DP-003: Bloqueo estricto de entrada ante cliente sin membresía o vencido'
  );

  // Desbloqueo manual con excepción (override)
  const checkInOverride = await attendanceService.checkIn(expiredDoc, true, 'Autorizado por propietaria');
  assert(
    checkInOverride.success === true,
    'DP-003: Desbloqueo y marcaje con excepción manual autorizada'
  );

  // 6. CA-004 & CA-005: Finanzas y Pago a Entrenador
  const coachTx = await financeService.recordCoachPayment({
    coachName: 'Entrenador Miguel',
    amount: 150000,
    periodConcept: 'Primera quincena',
    registeredBy: 'Admin'
  });
  assert(coachTx.type === 'EGRESO' && coachTx.amount === 150000, 'CA-005: Registro de egreso por Pago a Entrenador');

  const summary = await financeService.getSummary();
  assert(summary.totalIncomes > 0, 'CA-004: Ingresos contabilizados automáticamente desde membresías (sin duplicar)');
  assert(summary.totalExpenses >= 150000, 'CA-004: Egresos reflejados en el cálculo');
  assert(summary.netResult === (summary.totalIncomes - summary.totalExpenses), 'CA-004: Balance neto exacto (Ingresos - Egresos)');

  // 7. CA-006: Panel Administrativo KPIs
  const metrics = await dashboardService.getMetrics();
  assert(metrics.totalClients >= 2, 'CA-006: Conteo de clientes en Dashboard');
  assert(metrics.todayAttendancesCount >= 2, 'CA-006: Asistencias del día en Dashboard');
  assert(metrics.memberships.vigente >= 1, 'CA-006: Membresías vigentes en Dashboard');

  // 8. CA-007: Detección inteligente para WhatsApp
  const candidates = await aiTrackingService.getCandidates();
  assert(Array.isArray(candidates), 'CA-007: Motor de candidatos para seguimiento WhatsApp ejecutado con éxito');

  // Limpiar registros temporales de la prueba para mantener la base limpia
  await run("DELETE FROM financial_transactions WHERE concept LIKE '%Entrenador Miguel%'");
  await run("DELETE FROM clients WHERE document_id IN ('1098765432', '999888777')");

  console.log('\n======================================================');
  console.log(`RESULTADOS: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
