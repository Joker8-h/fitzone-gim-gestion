import { initDatabase } from './db/database.js';
import { runSeed } from './db/seed.js';
import { clientService } from './services/clientService.js';
import { membershipService, addDaysToDate, getTodayString } from './services/membershipService.js';
import { attendanceService } from './services/attendanceService.js';
import { financeService } from './services/financeService.js';
import { dashboardService } from './services/dashboardService.js';
import { aiTrackingService } from './services/aiTrackingService.js';

console.log('\n======================================================');
console.log('🧪 INICIANDO VERIFICACIÓN COMPLETA DE CRITERIOS FASE 1');
console.log('======================================================\n');

initDatabase();
runSeed();

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASÓ] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FALLÓ] ${testName}`);
      failed++;
    }
  }

  // Limpiar registros temporales de pruebas previas
  const { db } = await import('./db/database.js');
  db.prepare("DELETE FROM clients WHERE document_id IN ('1098765432', '999888777')").run();

  // 1. CA-001: Crear cliente y consultar
  const testDoc = '1098765432';
  // Limpiar si ya existía de pruebas previas
  const existing = clientService.getByDocument(testDoc);
  const client = existing || clientService.create({
    documentId: testDoc,
    fullName: 'Juan Pérez Gimnasio',
    phone: '3109876543',
    notes: 'Cliente de prueba automatizada'
  });
  assert(client.document_id === testDoc, 'CA-001: Creación de cliente con documento único');

  // Buscar cliente
  const searchResults = clientService.list('Juan');
  assert(searchResults.some(c => c.document_id === testDoc), 'CA-001: Búsqueda de cliente por nombre');

  // 2. CA-003: Asignar Membresía y Registrar Pago
  const plans = membershipService.getPlans();
  const planMes = plans.find(p => p.duration_days === 30) || plans[0];
  assert(Boolean(planMes), 'CA-003: Catálogo de planes disponible');

  const paymentResult = membershipService.assignMembership({
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
  const renewalResult = membershipService.assignMembership({
    clientId: client.id,
    planId: planMes.id,
    amountPaid: planMes.price,
    paymentMethod: 'EFECTIVO',
    registeredBy: 'Admin'
  });
  const expectedNewEnd = addDaysToDate(currentEnd, planMes.duration_days);
  assert(
    renewalResult.membership.end_date === expectedNewEnd,
    `DP-002: Renovación suma días exactamente al vencimiento previo (${currentEnd} + 30d -> ${expectedNewEnd})`
  );

  // 4. CA-002: Registro de asistencia normal con membresía vigente
  const checkInSuccess = attendanceService.checkIn(client.document_id, false, undefined, 'Recepción');
  assert(checkInSuccess.success === true && checkInSuccess.blocked === false, 'CA-002: Marcaje de asistencia permitido con membresía al día');

  // 5. DP-003: Bloqueo de marcaje ante cliente con membresía vencida
  const expiredDoc = '999888777';
  const expiredClient = clientService.getByDocument(expiredDoc) || clientService.create({
    documentId: expiredDoc,
    fullName: 'Carlos Vencido',
    phone: '3001112233'
  });

  // Simular intento de marcaje sin membresía
  const checkInBlocked = attendanceService.checkIn(expiredDoc, false);
  assert(
    checkInBlocked.blocked === true && checkInBlocked.success === false,
    'DP-003: Bloqueo estricto de entrada ante cliente sin membresía o vencido'
  );

  // Desbloqueo manual con excepción (override)
  const checkInOverride = attendanceService.checkIn(expiredDoc, true, 'Autorizado por propietaria');
  assert(
    checkInOverride.success === true,
    'DP-003: Desbloqueo y marcaje con excepción manual autorizada'
  );

  // 6. CA-004 & CA-005: Finanzas y Pago a Entrenador
  const coachTx = financeService.recordCoachPayment({
    coachName: 'Entrenador Miguel',
    amount: 150000,
    periodConcept: 'Primera quincena',
    registeredBy: 'Admin'
  });
  assert(coachTx.type === 'EGRESO' && coachTx.amount === 150000, 'CA-005: Registro de egreso por Pago a Entrenador');

  const summary = financeService.getSummary();
  assert(summary.totalIncomes > 0, 'CA-004: Ingresos contabilizados automáticamente desde membresías (sin duplicar)');
  assert(summary.totalExpenses >= 150000, 'CA-004: Egresos reflejados en el cálculo');
  assert(summary.netResult === (summary.totalIncomes - summary.totalExpenses), 'CA-004: Balance neto exacto (Ingresos - Egresos)');

  // 7. CA-006: Panel Administrativo KPIs
  const metrics = dashboardService.getMetrics();
  assert(metrics.totalClients >= 2, 'CA-006: Conteo de clientes en Dashboard');
  assert(metrics.todayAttendancesCount >= 2, 'CA-006: Asistencias del día en Dashboard');
  assert(metrics.memberships.vigente >= 1, 'CA-006: Membresías vigentes en Dashboard');

  // 8. CA-007: Detección inteligente para WhatsApp
  const candidates = await aiTrackingService.getCandidates();
  assert(Array.isArray(candidates), 'CA-007: Motor de candidatos para seguimiento WhatsApp ejecutado con éxito');

  // Limpiar registros temporales de la prueba para mantener la base limpia
  db.prepare("DELETE FROM clients WHERE document_id IN ('1098765432', '999888777')").run();
  db.prepare("DELETE FROM financial_transactions WHERE concept LIKE '%Entrenador Miguel%'").run();

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
