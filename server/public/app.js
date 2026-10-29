// ========================================================
// GIM - Sistema de Gestión para Gimnasio (Fase 1) - Frontend "1A"
// ========================================================

let state = {
  activeTab: 'checkin',
  clients: [],
  plans: [],
  financeCategories: [],
  waStatus: 'DISCONNECTED',
  pendingOverrideDoc: null,
  soundEnabled: localStorage.getItem('gim_sound') !== 'false',
};

// Formato de moneda COP
function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(num || 0);
}

// Sanitizador para evitar inyección en renderizado HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ========================================================
// SISTEMA DE AUDIO FEEDBACK (Sintetizador Web Audio API)
// ========================================================

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playSuccessChime() {
  if (!state.soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Tono 1: 587.33 Hz (Re5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.35);

    // Tono 2: 880 Hz (La5) poco después
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.2, audioCtx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.12);
    osc2.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.warn('Audio no disponible:', e);
  }
}

function playDeniedTone() {
  if (!state.soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.warn('Audio no disponible:', e);
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem('gim_sound', state.soundEnabled ? 'true' : 'false');
  updateSoundIcon();
  showToast(state.soundEnabled ? 'Sonidos de asistencia activados' : 'Sonidos silenciados', 'info');
}

function updateSoundIcon() {
  const icon = document.getElementById('icon-sound');
  if (icon) {
    if (state.soundEnabled) {
      icon.setAttribute('data-lucide', 'volume-2');
      icon.className = 'w-4 h-4 text-emerald-400';
    } else {
      icon.setAttribute('data-lucide', 'volume-x');
      icon.className = 'w-4 h-4 text-slate-500';
    }
    lucide.createIcons();
  }
}

// ========================================================
// SISTEMA DE TOAST NOTIFICATIONS (Reemplazo de alerts)
// ========================================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${
    type === 'success'
      ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
      : type === 'error'
      ? 'bg-slate-900 border-rose-500/40 text-rose-300'
      : 'bg-slate-900 border-sky-500/40 text-sky-300'
  }`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';

  toast.innerHTML = `
    <div class="shrink-0">
      <i data-lucide="${iconName}" class="w-5 h-5"></i>
    </div>
    <div class="flex-1 text-slate-200">${escapeHTML(message)}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white shrink-0 ml-2">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Animación de entrada
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto eliminación
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ========================================================
// INICIALIZACIÓN
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  updateSoundIcon();
  lucide.createIcons();
  
  // Cargas iniciales
  loadTodayAttendances();
  loadClients();
  loadPlans();
  loadFinanceCategories();
  loadFinancesSummary();
  checkWhatsAppStatus();
  loadDashboardMetrics();

  // Polling ligero para estado de WhatsApp (cada 4s)
  setInterval(checkWhatsAppStatus, 4000);
});

// Reloj digital en vivo
function initClock() {
  const clockEl = document.getElementById('current-clock');
  function update() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('es-CO');
    }
  }
  update();
  setInterval(update, 1000);
}

// Navegación entre pestañas
function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('block');
  });

  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('block');
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-emerald-600', 'text-white', 'shadow-md', 'shadow-emerald-950');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-emerald-600', 'text-white', 'shadow-md', 'shadow-emerald-950');
    activeBtn.classList.remove('text-slate-400');
  }

  // Refrescar datos según la pestaña activa
  if (tabId === 'checkin') {
    loadTodayAttendances();
    document.getElementById('checkin-doc')?.focus();
  } else if (tabId === 'clients') {
    loadClients();
  } else if (tabId === 'memberships') {
    loadPlans();
    populateClientSelect();
  } else if (tabId === 'finances') {
    loadFinancesSummary();
    loadTransactions();
  } else if (tabId === 'whatsapp') {
    checkWhatsAppStatus();
    loadWhatsAppCandidates();
  } else if (tabId === 'dashboard') {
    loadDashboardMetrics();
  }

  lucide.createIcons();
}

// ========================================================
// 1. MÓDULO ASISTENCIA & MOSTRADOR
// ========================================================

async function handleCheckIn(event, override = false, overrideReason = '') {
  if (event) event.preventDefault();

  const docInput = document.getElementById('checkin-doc');
  const documentId = override ? state.pendingOverrideDoc : docInput.value.trim();

  if (!documentId) return;

  const feedback = document.getElementById('checkin-feedback');
  feedback.classList.remove('hidden', 'bg-emerald-950/40', 'border-emerald-500/50', 'bg-rose-950/40', 'border-rose-500/50', 'bg-amber-950/40', 'border-amber-500/50');

  try {
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        override,
        overrideReason: overrideReason || 'Ingreso manual autorizado',
        registeredBy: 'Recepción'
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // ACCESO CONCEDIDO (VERDE)
      playSuccessChime();
      feedback.classList.add('bg-emerald-950/40', 'border-emerald-500/50');
      feedback.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <i data-lucide="check-circle" class="w-7 h-7"></i>
          </div>
          <div class="flex-1">
            <h4 class="text-xl font-bold text-emerald-300">¡ACCESO CONCEDIDO!</h4>
            <p class="text-white font-semibold text-lg mt-0.5">${escapeHTML(data.client.full_name)}</p>
            <p class="text-slate-300 text-sm mt-1">${escapeHTML(data.message)}</p>
            ${data.membership ? `
              <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/40 rounded-xl text-xs font-mono text-emerald-300 border border-emerald-500/20">
                <span>Plan: ${escapeHTML(data.membership.plan_name)}</span> |
                <span>Vence: ${escapeHTML(data.membership.end_date)}</span>
                ${data.membership.daysRemaining !== undefined ? `(${data.membership.daysRemaining} días restantes)` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
      docInput.value = '';
      docInput.focus();
      state.pendingOverrideDoc = null;
      loadTodayAttendances();
    } else if (res.status === 403 && data.blocked) {
      // ACCESO DENEGADO / VENCIDO (ROJO BLOQUEADO)
      playDeniedTone();
      state.pendingOverrideDoc = documentId;
      feedback.classList.add('bg-rose-950/40', 'border-rose-500/50');
      feedback.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <i data-lucide="shield-alert" class="w-7 h-7"></i>
          </div>
          <div class="flex-1">
            <h4 class="text-xl font-bold text-rose-400">ACCESO DENEGADO — BLOQUEADO</h4>
            <p class="text-white font-semibold text-base mt-0.5">${data.client ? escapeHTML(data.client.full_name) : 'Documento: ' + escapeHTML(documentId)}</p>
            <p class="text-rose-300 text-sm mt-1">${escapeHTML(data.message)}</p>
            
            <div class="mt-4 flex flex-wrap gap-2">
              <button onclick="openOverrideModal()" class="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-950">
                <i data-lucide="unlock" class="w-4 h-4"></i> Autorizar Excepción Manual
              </button>
              ${data.client ? `
                <button onclick="quickRenewMembership('${data.client.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-950">
                  <i data-lucide="credit-card" class="w-4 h-4"></i> Renovar Membresía Ahora
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    } else {
      // AVISO / DUPLICADO / ERROR
      feedback.classList.add('bg-amber-950/40', 'border-amber-500/50');
      feedback.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <i data-lucide="alert-triangle" class="w-7 h-7"></i>
          </div>
          <div>
            <h4 class="text-lg font-bold text-amber-400">Atención</h4>
            <p class="text-slate-200 text-sm mt-1">${escapeHTML(data.message || data.error)}</p>
          </div>
        </div>
      `;
    }
  } catch (err) {
    feedback.classList.add('bg-rose-950/40', 'border-rose-500/50');
    feedback.innerHTML = `<p class="text-rose-400 text-sm">Error de comunicación con el servidor: ${escapeHTML(err.message)}</p>`;
  }

  lucide.createIcons();
}

function openOverrideModal() {
  document.getElementById('override-reason-input').value = '';
  openModal('modal-override-checkin');
}

function setOverridePreset(text) {
  document.getElementById('override-reason-input').value = text;
}

function confirmOverrideCheckIn() {
  const reason = document.getElementById('override-reason-input').value.trim();
  closeModal('modal-override-checkin');
  handleCheckIn(null, true, reason || 'Autorizado por recepción');
}

function quickRenewMembership(clientId) {
  switchTab('memberships');
  setTimeout(() => {
    const sel = document.getElementById('assign-client-select');
    if (sel) {
      sel.value = clientId;
      handleSelectClientForPlan();
    }
  }, 100);
}

async function loadTodayAttendances() {
  const listEl = document.getElementById('today-attendances-list');
  const badgeEl = document.getElementById('today-count-badge');
  try {
    const res = await fetch('/api/attendance/today');
    const list = await res.json();

    if (badgeEl) badgeEl.textContent = `${list.length} entradas`;

    if (!list || list.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-12 text-slate-500">
          <i data-lucide="calendar" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
          <p class="text-sm">Aún no hay asistencias registradas hoy.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    listEl.innerHTML = list.map(item => {
      const time = new Date(item.check_in_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              ${escapeHTML(item.full_name.substring(0, 2).toUpperCase())}
            </div>
            <div>
              <p class="font-semibold text-sm text-slate-200 leading-tight">${escapeHTML(item.full_name)}</p>
              <p class="text-xs text-slate-500 font-mono">CC: ${escapeHTML(item.document_id)}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-mono font-bold text-slate-300">${time}</span>
            ${item.was_overridden ? `<span class="block text-[10px] text-amber-400 font-semibold">Excepción</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    listEl.innerHTML = `<p class="text-rose-400 text-xs">Error cargando asistencias.</p>`;
  }
}

// ========================================================
// 2. MÓDULO CLIENTES
// ========================================================

async function loadClients() {
  const tbody = document.getElementById('clients-table-body');
  try {
    const res = await fetch('/api/clients');
    state.clients = await res.json();
    renderClientsTable(state.clients);
    populateClientSelect();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-rose-400 text-xs">Error cargando clientes</td></tr>`;
  }
}

function renderClientsTable(list) {
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-500 text-sm">No se encontraron clientes registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(client => `
    <tr class="hover:bg-slate-800/40 transition">
      <td class="py-3 px-4 font-mono font-medium text-slate-300">${escapeHTML(client.document_id)}</td>
      <td class="py-3 px-4 font-semibold text-white">${escapeHTML(client.full_name)}</td>
      <td class="py-3 px-4 text-slate-300 font-mono">${escapeHTML(client.phone)}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${client.status === 'ACTIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
          ${client.status}
        </span>
      </td>
      <td class="py-3 px-4 text-slate-400 text-xs">${escapeHTML(client.registration_date)}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="viewClientDetail('${client.id}')" class="text-xs bg-slate-950 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 transition">
          Ver Ficha
        </button>
      </td>
    </tr>
  `).join('');
}

function filterClients() {
  const search = document.getElementById('clients-search-input')?.value.toLowerCase() || '';
  const status = document.getElementById('clients-filter-status')?.value || '';

  const filtered = state.clients.filter(c => {
    const matchesSearch = c.full_name.toLowerCase().includes(search) ||
                          c.document_id.includes(search) ||
                          c.phone.includes(search);
    const matchesStatus = !status || c.status === status;
    return matchesSearch && matchesStatus;
  });

  renderClientsTable(filtered);
}

async function handleCreateClient(event) {
  event.preventDefault();
  const documentId = document.getElementById('new-client-doc').value.trim();
  const fullName = document.getElementById('new-client-name').value.trim();
  const phone = document.getElementById('new-client-phone').value.trim();
  const notes = document.getElementById('new-client-notes').value.trim();

  try {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, fullName, phone, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`¡Cliente ${fullName} registrado con éxito!`, 'success');
    closeModal('modal-new-client');
    document.getElementById('new-client-doc').value = '';
    document.getElementById('new-client-name').value = '';
    document.getElementById('new-client-phone').value = '';
    document.getElementById('new-client-notes').value = '';
    loadClients();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewClientDetail(clientId) {
  try {
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('detail-client-name').textContent = data.client.full_name;
    document.getElementById('detail-client-meta').textContent = `Cédula: ${data.client.document_id} | WhatsApp: ${data.client.phone} | Estado: ${data.client.status}`;

    // Membresía actual
    const banner = document.getElementById('detail-membership-banner');
    if (data.latestMembership) {
      const m = data.latestMembership;
      const isExpired = m.status === 'VENCIDA';
      banner.className = `p-4 rounded-2xl border ${isExpired ? 'bg-rose-950/30 border-rose-500/40' : 'bg-emerald-950/30 border-emerald-500/40'}`;
      banner.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase ${isExpired ? 'text-rose-400' : 'text-emerald-400'}">${m.status}</span>
            <h5 class="text-base font-bold text-white">${escapeHTML(m.plan_name)}</h5>
            <p class="text-xs text-slate-300">Vigencia: ${m.start_date} al ${m.end_date}</p>
          </div>
          <button onclick="closeModal('modal-client-detail'); quickRenewMembership('${data.client.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-xl transition shadow-md shadow-emerald-950">
            Renovar
          </button>
        </div>
      `;
    } else {
      banner.className = 'p-4 rounded-2xl border bg-slate-950 border-slate-800 text-slate-400 text-xs';
      banner.innerHTML = `
        <div class="flex items-center justify-between">
          <span>Este cliente no tiene membresías registradas aún.</span>
          <button onclick="closeModal('modal-client-detail'); quickRenewMembership('${data.client.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition shadow-md shadow-emerald-950">
            Asignar Membresía
          </button>
        </div>
      `;
    }

    // Historial de pagos
    const pList = document.getElementById('detail-payments-list');
    pList.innerHTML = (data.payments && data.payments.length > 0)
      ? data.payments.map(p => `
        <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <div>
            <span class="font-semibold text-slate-200">${escapeHTML(p.plan_name || 'Pago')}</span>
            <span class="text-slate-500 ml-2">${p.created_at.split(' ')[0]} (${p.payment_method})</span>
          </div>
          <span class="font-mono text-emerald-400 font-bold">${formatCOP(p.amount)}</span>
        </div>
      `).join('')
      : '<p class="text-slate-500">Sin pagos registrados.</p>';

    // Historial de asistencias
    const aList = document.getElementById('detail-attendances-list');
    aList.innerHTML = (data.attendances && data.attendances.length > 0)
      ? data.attendances.map(a => `
        <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <span class="text-slate-300 font-mono">${a.check_in_time}</span>
          ${a.was_overridden ? '<span class="text-amber-400 font-semibold text-[10px]">Autorizado manual</span>' : '<span class="text-emerald-400 text-[10px]">Normal</span>'}
        </div>
      `).join('')
      : '<p class="text-slate-500">Sin asistencias registradas.</p>';

    openModal('modal-client-detail');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================================================
// 3. MÓDULO MEMBRESÍAS & PAGOS
// ========================================================

async function loadPlans() {
  try {
    const res = await fetch('/api/memberships/plans');
    state.plans = await res.json();
    renderPlansGrid(state.plans);
    populatePlanSelect();
  } catch (err) {
    console.error('Error cargando planes:', err);
  }
}

function renderPlansGrid(plans) {
  const grid = document.getElementById('plans-grid');
  if (!grid) return;

  grid.innerHTML = plans.map(p => `
    <div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
      <div>
        <div class="flex justify-between items-start">
          <h4 class="font-bold text-white text-base">${escapeHTML(p.name)}</h4>
          <span class="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">${p.duration_days} días</span>
        </div>
        <p class="text-xs text-slate-400 mt-2">${escapeHTML(p.description || 'Acceso general al gimnasio')}</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span class="text-lg font-extrabold text-emerald-400 font-mono">${formatCOP(p.price)}</span>
      </div>
    </div>
  `).join('');
}

function populatePlanSelect() {
  const sel = document.getElementById('assign-plan-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona un plan...</option>' + state.plans.map(p => `
    <option value="${p.id}" data-price="${p.price}" data-days="${p.duration_days}">${escapeHTML(p.name)} — ${formatCOP(p.price)} (${p.duration_days} días)</option>
  `).join('');
}

function populateClientSelect() {
  const sel = document.getElementById('assign-client-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona un cliente...</option>' + state.clients.map(c => `
    <option value="${c.id}">${escapeHTML(c.full_name)} (CC: ${escapeHTML(c.document_id)})</option>
  `).join('');
}

async function handleSelectClientForPlan() {
  const clientId = document.getElementById('assign-client-select').value;
  const preview = document.getElementById('assign-client-preview');
  if (!clientId) {
    preview.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    preview.classList.remove('hidden');
    if (data.latestMembership) {
      const m = data.latestMembership;
      preview.innerHTML = `
        <strong>Membresía actual:</strong> ${escapeHTML(m.plan_name)} | Vence: <strong>${m.end_date}</strong> (${m.status}).
        <br><span class="text-emerald-400">✨ La nueva vigencia se sumará al final de esta fecha sin perder días.</span>
      `;
    } else {
      preview.innerHTML = `El cliente no tiene membresía activa. La nueva vigencia iniciará <strong>hoy</strong>.`;
    }
  } catch (err) {
    console.error(err);
  }
}

function handlePlanChange() {
  const sel = document.getElementById('assign-plan-select');
  const opt = sel.options[sel.selectedIndex];
  const price = opt?.getAttribute('data-price');
  if (price) {
    document.getElementById('assign-amount').value = price;
  }
}

async function handleAssignMembership(event) {
  event.preventDefault();
  const clientId = document.getElementById('assign-client-select').value;
  const planId = document.getElementById('assign-plan-select').value;
  const amountPaid = document.getElementById('assign-amount').value;
  const paymentMethod = document.getElementById('assign-payment-method').value;
  const reference = document.getElementById('assign-reference').value;

  try {
    const res = await fetch('/api/memberships/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        planId,
        amountPaid,
        paymentMethod,
        reference
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`¡Membresía asignada y pago de ${formatCOP(amountPaid)} registrado en caja!`, 'success');
    document.getElementById('form-assign-membership').reset();
    document.getElementById('assign-client-preview').classList.add('hidden');
    loadFinancesSummary();
    loadDashboardMetrics();
    switchTab('checkin');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreatePlan(event) {
  event.preventDefault();
  const name = document.getElementById('new-plan-name').value.trim();
  const durationDays = document.getElementById('new-plan-days').value;
  const price = document.getElementById('new-plan-price').value;
  const description = document.getElementById('new-plan-desc').value.trim();

  try {
    const res = await fetch('/api/memberships/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, durationDays, price, description })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`Plan "${name}" creado exitosamente`, 'success');
    closeModal('modal-new-plan');
    document.getElementById('new-plan-name').value = '';
    document.getElementById('new-plan-days').value = '';
    document.getElementById('new-plan-price').value = '';
    document.getElementById('new-plan-desc').value = '';
    loadPlans();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================================================
// 4. MÓDULO FINANZAS & CAJA
// ========================================================

async function loadFinanceCategories() {
  try {
    const res = await fetch('/api/finances/categories');
    state.financeCategories = await res.json();

    const expSelect = document.getElementById('expense-category');
    if (expSelect) {
      const expenseCats = state.financeCategories.filter(c => c.type === 'EGRESO');
      expSelect.innerHTML = expenseCats.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadFinancesSummary() {
  try {
    const res = await fetch('/api/finances/summary');
    const data = await res.json();

    document.getElementById('fin-total-incomes').textContent = formatCOP(data.totalIncomes);
    document.getElementById('fin-total-expenses').textContent = formatCOP(data.totalExpenses);
    document.getElementById('fin-net-result').textContent = formatCOP(data.netResult);

    const netEl = document.getElementById('fin-net-result');
    if (data.netResult >= 0) {
      netEl.className = 'text-2xl lg:text-3xl font-extrabold text-emerald-400 font-mono';
    } else {
      netEl.className = 'text-2xl lg:text-3xl font-extrabold text-rose-400 font-mono';
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadTransactions() {
  const tbody = document.getElementById('finances-table-body');
  try {
    const res = await fetch('/api/finances/transactions');
    const list = await res.json();

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500 text-sm">No hay movimientos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(tx => {
      const isIncome = tx.type === 'INGRESO';
      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="py-3 px-4 font-mono text-slate-400 text-xs">${escapeHTML(tx.date)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-xs font-semibold ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
              ${tx.type}
            </span>
          </td>
          <td class="py-3 px-4 text-slate-300 text-sm">${escapeHTML(tx.category_name || 'General')}</td>
          <td class="py-3 px-4 font-medium text-white text-sm">${escapeHTML(tx.concept)}</td>
          <td class="py-3 px-4 text-right font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">
            ${isIncome ? '+' : '-'}${formatCOP(tx.amount)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-rose-400 text-xs">Error cargando movimientos</td></tr>`;
  }
}

async function handleCreateExpense(event) {
  event.preventDefault();
  const categoryId = document.getElementById('expense-category').value;
  const concept = document.getElementById('expense-concept').value.trim();
  const amount = document.getElementById('expense-amount').value;

  try {
    const res = await fetch('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'EGRESO',
        categoryId,
        concept,
        amount
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Gasto registrado exitosamente en caja', 'success');
    closeModal('modal-new-expense');
    document.getElementById('expense-concept').value = '';
    document.getElementById('expense-amount').value = '';
    loadFinancesSummary();
    loadTransactions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateIncome(event) {
  event.preventDefault();
  const concept = document.getElementById('income-concept').value.trim();
  const amount = document.getElementById('income-amount').value;

  try {
    const res = await fetch('/api/finances/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INGRESO',
        concept,
        amount
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`Ingreso registrado: ${formatCOP(amount)}`, 'success');
    closeModal('modal-new-income');
    document.getElementById('income-concept').value = '';
    document.getElementById('income-amount').value = '';
    loadFinancesSummary();
    loadTransactions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCoachPayment(event) {
  event.preventDefault();
  const coachName = document.getElementById('coach-name').value.trim();
  const periodConcept = document.getElementById('coach-period').value.trim();
  const amount = document.getElementById('coach-amount').value;

  try {
    const res = await fetch('/api/finances/coach-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachName, periodConcept, amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`Pago a entrenador registrado: ${coachName}`, 'success');
    closeModal('modal-coach-payment');
    document.getElementById('coach-name').value = '';
    document.getElementById('coach-period').value = '';
    document.getElementById('coach-amount').value = '';
    loadFinancesSummary();
    loadTransactions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================================================
// 5. MÓDULO WHATSAPP BOT & IA (BAILEYS + GEMINI)
// ========================================================

async function checkWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp/status');
    const data = await res.json();
    state.waStatus = data.status;

    const pillText = document.getElementById('wa-status-text');
    const pillDot = document.getElementById('wa-indicator-dot');
    const qrContainer = document.getElementById('wa-qr-container');
    const qrImage = document.getElementById('wa-qr-image');
    const connectedContainer = document.getElementById('wa-connected-container');
    const btnConnect = document.getElementById('btn-wa-connect');
    const btnDisconnect = document.getElementById('btn-wa-disconnect');

    if (data.status === 'CONNECTED') {
      if (pillText) pillText.textContent = `WhatsApp: Conectado (${data.userPhone})`;
      if (pillDot) pillDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-emerald';
      if (qrContainer) qrContainer.classList.add('hidden');
      if (connectedContainer) {
        connectedContainer.classList.remove('hidden');
        document.getElementById('wa-connected-phone').textContent = `Número vinculado: +${data.userPhone}`;
      }
      if (btnConnect) btnConnect.classList.add('hidden');
      if (btnDisconnect) btnDisconnect.classList.remove('hidden');
    } else if (data.status === 'SCAN_QR') {
      if (pillText) pillText.textContent = 'WhatsApp: Escanear QR';
      if (pillDot) pillDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping';
      if (qrContainer) {
        qrContainer.classList.remove('hidden');
        if (data.qrCodeDataUrl) qrImage.src = data.qrCodeDataUrl;
      }
      if (connectedContainer) connectedContainer.classList.add('hidden');
      if (btnConnect) btnConnect.classList.remove('hidden');
      if (btnDisconnect) btnDisconnect.classList.add('hidden');
    } else {
      if (pillText) pillText.textContent = 'WhatsApp: Desconectado';
      if (pillDot) pillDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
      if (qrContainer) qrContainer.classList.add('hidden');
      if (connectedContainer) connectedContainer.classList.add('hidden');
      if (btnConnect) btnConnect.classList.remove('hidden');
      if (btnDisconnect) btnDisconnect.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error revisando WhatsApp:', err);
  }
}

async function connectWhatsApp() {
  try {
    const btn = document.getElementById('btn-wa-connect');
    btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Generando QR...`;
    lucide.createIcons();

    await fetch('/api/whatsapp/connect', { method: 'POST' });
    showToast('Iniciando socket de WhatsApp. Esperando código QR...', 'info');
    setTimeout(checkWhatsAppStatus, 1500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function confirmDisconnectWhatsApp() {
  if (confirm('¿Deseas desvincular la sesión de WhatsApp del gimnasio?')) {
    disconnectWhatsApp();
  }
}

async function disconnectWhatsApp() {
  try {
    await fetch('/api/whatsapp/disconnect', { method: 'POST' });
    showToast('Sesión de WhatsApp desconectada', 'info');
    checkWhatsAppStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadWhatsAppCandidates() {
  const container = document.getElementById('wa-candidates-list');
  if (!container) return;

  container.innerHTML = `<p class="text-slate-400 text-sm py-4"><i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-2 text-purple-400"></i>Analizando socios y redactando mensajes con Gemini IA...</p>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/whatsapp/candidates');
    const candidates = await res.json();

    if (!candidates || candidates.length === 0) {
      container.innerHTML = `
        <div class="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-slate-400 text-sm">
          <i data-lucide="check-circle" class="w-8 h-8 text-emerald-400 mx-auto mb-2"></i>
          ¡Al día! Ningún socio cumple los criterios de inactividad o vencimiento urgente hoy.
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = candidates.map((cand, idx) => {
      const isInactive = cand.reason === 'INACTIVITY';
      return `
        <div class="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold ${isInactive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
                ${isInactive ? `Inactivo (${cand.daysInfo} días sin venir)` : `Vence en ${cand.daysInfo} días`}
              </span>
              <span class="font-bold text-white text-sm">${escapeHTML(cand.fullName)}</span>
              <span class="text-xs text-slate-500 font-mono">(${escapeHTML(cand.phone)})</span>
            </div>
            <div class="p-3 bg-slate-900 rounded-xl border border-slate-800/80 text-xs text-slate-300 mt-2 italic">
              "${escapeHTML(cand.suggestedMessage)}"
            </div>
          </div>
          <button onclick="sendCandidateMessage('${cand.clientId}', '${cand.reason}', ${idx})" id="btn-send-${idx}" class="self-end md:self-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-950">
            <i data-lucide="send" class="w-3.5 h-3.5"></i> Enviar WhatsApp
          </button>
        </div>
      `;
    }).join('');

    window._candidates = candidates;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<p class="text-rose-400 text-xs">Error cargando candidatos: ${escapeHTML(err.message)}</p>`;
  }
}

async function sendCandidateMessage(clientId, ruleType, index) {
  if (state.waStatus !== 'CONNECTED') {
    showToast('WhatsApp no está vinculado. Por favor escanea el código QR primero.', 'error');
    return;
  }

  const cand = window._candidates[index];
  const btn = document.getElementById(`btn-send-${index}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Enviando...`;
    lucide.createIcons();
  }

  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        ruleType,
        message: cand.suggestedMessage
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`¡Mensaje enviado con éxito a ${cand.fullName}!`, 'success');
    loadWhatsAppCandidates();
  } catch (err) {
    showToast(`Fallo de envío: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="send" class="w-3.5 h-3.5"></i> Reintentar`;
      lucide.createIcons();
    }
  }
}

// ========================================================
// 6. MÓDULO PANEL ADMINISTRATIVO (KPIS)
// ========================================================

async function loadDashboardMetrics() {
  try {
    const res = await fetch('/api/dashboard/metrics');
    const data = await res.json();

    document.getElementById('dash-total-clients').textContent = data.totalClients;
    document.getElementById('dash-active-clients').textContent = `${data.activeClients} activos`;
    document.getElementById('dash-active-memberships').textContent = data.memberships.vigente;
    document.getElementById('dash-expiring-memberships').textContent = `${data.memberships.porVencer} por vencer (< 3 días)`;
    document.getElementById('dash-today-attendances').textContent = data.todayAttendancesCount;
    document.getElementById('dash-month-attendances').textContent = `${data.monthAttendancesCount} este mes`;
    document.getElementById('dash-net-finances').textContent = formatCOP(data.financesMonth.netResult);

    document.getElementById('dash-kpi-vigentes').textContent = data.memberships.vigente;
    document.getElementById('dash-kpi-porvencer').textContent = data.memberships.porVencer;
    document.getElementById('dash-kpi-vencidas').textContent = data.memberships.vencida;
  } catch (err) {
    console.error('Error cargando KPIs:', err);
  }
}

// ========================================================
// HELPERS MODALES
// ========================================================

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function openNewClientModal() {
  openModal('modal-new-client');
  document.getElementById('new-client-doc')?.focus();
}
