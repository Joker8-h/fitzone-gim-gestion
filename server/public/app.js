// ========================================================
// FITZONE — Sistema de Gestión para Gimnasio (Fase 1)
// ========================================================

let state = {
  activeTab: 'dashboard',
  clients: [],
  plans: [],
  financeCategories: [],
  waStatus: 'DISCONNECTED',
  pendingOverrideDoc: null,
  dashMemberFilter: 'ALL',
  soundEnabled: localStorage.getItem('gim_sound') !== 'false',
};

function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(num || 0);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name) {
  if (!name) return 'FZ';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    'bg-emerald-100 text-emerald-800',
    'bg-sky-100 text-sky-800',
    'bg-amber-100 text-amber-800',
    'bg-purple-100 text-purple-800',
    'bg-rose-100 text-rose-800',
    'bg-teal-100 text-teal-800'
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTimeAMPM(dateTimeStr) {
  if (!dateTimeStr) return 'Sin registro';
  const d = new Date(dateTimeStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateTimeStr;
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatLastAccess(dateTimeStr) {
  if (!dateTimeStr) return 'Sin ingresos';
  const today = new Date().toISOString().split('T')[0];
  const datePart = dateTimeStr.split(' ')[0];
  const timePart = formatTimeAMPM(dateTimeStr);
  if (datePart === today) {
    return `Hoy, ${timePart}`;
  }
  return `${datePart}, ${timePart}`;
}

// ========================================================
// SINTETIZADOR DE AUDIO RECEPCIÓN
// ========================================================

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playSuccessChime() {
  if (!state.soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
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
  } catch (e) {}
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
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {}
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem('gim_sound', state.soundEnabled ? 'true' : 'false');
  updateSoundIcon();
  showToast(state.soundEnabled ? 'Sonidos de recepción activados' : 'Sonidos silenciados', 'info');
}

function updateSoundIcon() {
  const icon = document.getElementById('icon-sound');
  if (icon) {
    icon.setAttribute('data-lucide', state.soundEnabled ? 'volume-2' : 'volume-x');
    icon.className = state.soundEnabled ? 'w-5 h-5 text-[#1f8e55]' : 'w-5 h-5 text-slate-400';
    lucide.createIcons();
  }
}

// ========================================================
// NOTIFICACIONES TOAST
// ========================================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl border text-sm font-semibold transition-all duration-300 transform translate-y-2 opacity-0 bg-white ${
    type === 'success'
      ? 'border-emerald-200 text-[#15803d]'
      : type === 'error'
      ? 'border-rose-200 text-rose-700'
      : 'border-slate-200 text-slate-700'
  }`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';

  toast.innerHTML = `
    <div class="shrink-0">
      <i data-lucide="${iconName}" class="w-5 h-5"></i>
    </div>
    <div class="flex-1 text-slate-800 text-xs">${escapeHTML(message)}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-700 shrink-0 ml-2">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ========================================================
// INICIALIZACIÓN
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  initClockAndDate();
  updateSoundIcon();
  lucide.createIcons();

  // Cargar datos iniciales
  loadDashboardMetrics();
  loadClients();
  loadPlans();
  loadFinanceCategories();
  loadFinancesSummary();
  loadTodayAttendances();
  checkWhatsAppStatus();
  loadWhatsAppCandidates();

  setInterval(checkWhatsAppStatus, 5000);
});

function initClockAndDate() {
  const clockEl = document.getElementById('current-clock');
  const dateEl = document.getElementById('current-date-display');

  const now = new Date();
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function updateClock() {
    const t = new Date();
    if (clockEl) clockEl.textContent = t.toLocaleTimeString('es-CO');
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// Navegación entre vistas
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

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-[#345e4f]', 'text-white', 'shadow-sm');
    btn.classList.add('text-slate-300');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-[#345e4f]', 'text-white', 'shadow-sm');
    activeBtn.classList.remove('text-slate-300');
  }

  if (tabId === 'dashboard') {
    loadDashboardMetrics();
    loadClients();
    loadWhatsAppCandidates();
  } else if (tabId === 'checkin') {
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
  }

  lucide.createIcons();
}

function handleGlobalSearch(query) {
  if (!query || query.trim() === '') return;
  if (state.activeTab !== 'clients') {
    switchTab('clients');
  }
  const input = document.getElementById('clients-search-input');
  if (input) {
    input.value = query;
    filterClients();
  }
}

// ========================================================
// 1. DASHBOARD FITZONE (INICIO)
// ========================================================

async function loadDashboardMetrics() {
  try {
    const res = await fetch('/api/dashboard/metrics');
    const data = await res.json();

    // 4 KPIs Superiores
    document.getElementById('kpi-active-members').textContent = data.activeClients;
    document.getElementById('kpi-total-members-sub').textContent = `↑ ${data.totalClients} registrados en total`;

    document.getElementById('kpi-today-incomes').textContent = formatCOP(data.todayIncomes || data.financesMonth.totalIncomes);
    document.getElementById('kpi-month-incomes-sub').textContent = `↑ Mes: ${formatCOP(data.financesMonth.totalIncomes)}`;

    document.getElementById('kpi-vigentes').textContent = data.memberships.vigente;
    document.getElementById('kpi-por-vencer-sub').textContent = `${data.memberships.porVencer} próximas a vencer`;

    document.getElementById('kpi-attendance-today').textContent = `${data.todayAttendancesCount}`;
    document.getElementById('kpi-attendance-sub').textContent = `↑ ${data.attendancePercentage}% de miembros activos hoy`;

    // Barras de estado de membresías
    const totalMem = Math.max(1, data.memberships.vigente + data.memberships.porVencer + data.memberships.vencida);
    document.getElementById('bar-label-vigentes').textContent = `${data.memberships.vigente} socios`;
    document.getElementById('bar-fill-vigentes').style.width = `${Math.round((data.memberships.vigente / totalMem) * 100)}%`;

    document.getElementById('bar-label-porvencer').textContent = `${data.memberships.porVencer} socios`;
    document.getElementById('bar-fill-porvencer').style.width = `${Math.round((data.memberships.porVencer / totalMem) * 100)}%`;

    document.getElementById('bar-label-vencidas').textContent = `${data.memberships.vencida} socios`;
    document.getElementById('bar-fill-vencidas').style.width = `${Math.round((data.memberships.vencida / totalMem) * 100)}%`;

    // Gráfica de línea 7 días
    renderAttendance7DaysChart(data.attendanceLast7Days || []);

    // Miembros recientes (Entradas)
    renderDashRecentAttendances(data.recentAttendances || []);

    // Ingresos mensuales abajo
    document.getElementById('dash-bottom-month-income').textContent = formatCOP(data.financesMonth.totalIncomes);
    document.getElementById('dash-bottom-net-sub').textContent = `Balance neto: ${formatCOP(data.financesMonth.netResult)}`;

    // Gráfica de Dona (Membresías más comunes)
    renderPlanDonutChart(data.planDistribution || []);

    // Últimos pagos abajo
    renderDashRecentPayments(data.recentPayments || []);

  } catch (err) {
    console.error('Error cargando métricas del dashboard:', err);
  }
}

function renderAttendance7DaysChart(daysData) {
  const container = document.getElementById('chart-attendance-7d');
  if (!container || daysData.length === 0) return;

  const width = 460;
  const height = 185;
  const padLeft = 28;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(8, ...daysData.map(d => d.count));

  const points = daysData.map((d, idx) => {
    const x = padLeft + (idx / Math.max(1, daysData.length - 1)) * plotW;
    const y = padTop + plotH - (d.count / maxVal) * plotH;
    return { x, y, label: d.label, count: d.count };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${padTop + plotH} ${polylinePoints} ${points[points.length - 1].x},${padTop + plotH}`;

  const gridLines = [0, 0.5, 1].map(r => {
    const y = padTop + plotH * (1 - r);
    const val = Math.round(maxVal * r);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
      <text x="${padLeft - 6}" y="${y + 3}" text-anchor="end" font-size="10" fill="#94a3b8">${val}</text>
    `;
  }).join('');

  const dotsAndLabels = points.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="4" fill="#1f8e55" stroke="#ffffff" stroke-width="2" />
    <text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#64748b">${p.label}</text>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1f8e55" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#1f8e55" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <polygon points="${areaPoints}" fill="url(#greenGrad)" />
      <polyline fill="none" stroke="#1f8e55" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
      ${dotsAndLabels}
    </svg>
  `;
}

function renderDashRecentAttendances(list) {
  const container = document.getElementById('dash-recent-attendances');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">Sin ingresos recientes.</p>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="flex items-center justify-between py-1">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-full ${getAvatarColor(item.full_name)} flex items-center justify-center font-bold text-xs shrink-0">
          ${getInitials(item.full_name)}
        </div>
        <div>
          <p class="font-bold text-xs text-slate-800 leading-tight">${escapeHTML(item.full_name)}</p>
          <p class="text-[11px] text-slate-400">${escapeHTML(item.plan_name ? 'Plan ' + item.plan_name.toLowerCase() : 'Miembro')}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#dcfce7] text-[#15803d]">Entrada</span>
        <span class="text-[11px] text-slate-400 font-medium">${formatTimeAMPM(item.check_in_time)}</span>
      </div>
    </div>
  `).join('');
}

function renderPlanDonutChart(dist) {
  const container = document.getElementById('dash-donut-container');
  if (!container) return;

  const colors = ['#1f8e55', '#64748b', '#eab308', '#0ea5e9', '#8b5cf6'];
  const items = dist.length > 0 ? dist : [{ name: 'Mensual', percentage: 100 }];

  // Construir segmentos SVG de dona
  let cumulativePercent = 0;
  const radius = 15.9155; // Circunferencia = 100

  const circles = items.map((item, i) => {
    const color = colors[i % colors.length];
    const dashArray = `${item.percentage} ${100 - item.percentage}`;
    const dashOffset = 100 - cumulativePercent + 25;
    cumulativePercent += item.percentage;
    return `<circle cx="21" cy="21" r="${radius}" fill="transparent" stroke="${color}" stroke-width="6" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}"></circle>`;
  }).join('');

  const legend = items.map((item, i) => {
    const color = colors[i % colors.length];
    return `
      <div class="flex items-center justify-between gap-6 text-xs">
        <span class="flex items-center gap-2 text-slate-600">
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
          ${escapeHTML(item.name)}
        </span>
        <span class="font-bold text-slate-800">${item.percentage}%</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="w-28 h-28 shrink-0">
      <svg viewBox="0 0 42 42" class="w-full h-full">
        <circle cx="21" cy="21" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="6"></circle>
        ${circles}
      </svg>
    </div>
    <div class="space-y-2 flex-1 max-w-[160px]">
      ${legend}
    </div>
  `;
}

function renderDashRecentPayments(list) {
  const tbody = document.getElementById('dash-recent-payments-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400">Sin pagos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.slice(0, 4).map(p => {
    const dateStr = (p.created_at || '').split(' ')[0];
    return `
      <tr class="hover:bg-slate-50">
        <td class="py-2.5 flex items-center gap-2">
          <div class="w-6 h-6 rounded-full ${getAvatarColor(p.full_name)} flex items-center justify-center font-bold text-[10px] shrink-0">
            ${getInitials(p.full_name)}
          </div>
          <span class="font-semibold text-slate-800 truncate max-w-[110px]">${escapeHTML(p.full_name)}</span>
        </td>
        <td class="py-2.5 text-slate-500">${escapeHTML(p.plan_name)}</td>
        <td class="py-2.5 font-bold text-slate-800">${formatCOP(p.amount)}</td>
        <td class="py-2.5 text-right text-slate-400">${dateStr}</td>
      </tr>
    `;
  }).join('');
}

// ========================================================
// TABLA DE MIEMBROS EN EL DASHBOARD Y DIRECTORIO
// ========================================================

async function loadClients() {
  try {
    const res = await fetch('/api/clients');
    state.clients = await res.json();
    renderDashboardMembers();
    renderClientsTable(state.clients);
    populateClientSelect();
  } catch (err) {
    console.error('Error cargando clientes:', err);
  }
}

function setDashMemberFilter(filter) {
  state.dashMemberFilter = filter;

  const btnAll = document.getElementById('pill-filter-all');
  const btnAct = document.getElementById('pill-filter-active');
  const btnInact = document.getElementById('pill-filter-inactive');

  [btnAll, btnAct, btnInact].forEach(b => {
    if (!b) return;
    b.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
  });

  const activeBtn = filter === 'ALL' ? btnAll : filter === 'ACTIVO' ? btnAct : btnInact;
  if (activeBtn) {
    activeBtn.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-[#1f8e55] text-white transition';
  }

  renderDashboardMembers();
}

function renderDashboardMembers() {
  const tbody = document.getElementById('dash-members-tbody');
  if (!tbody) return;

  const allCount = state.clients.length;
  const activeCount = state.clients.filter(c => c.status === 'ACTIVO').length;
  const inactiveCount = state.clients.filter(c => c.status === 'INACTIVO').length;

  const elAll = document.getElementById('count-pill-all');
  const elAct = document.getElementById('count-pill-active');
  const elInact = document.getElementById('count-pill-inactive');
  if (elAll) elAll.textContent = allCount;
  if (elAct) elAct.textContent = activeCount;
  if (elInact) elInact.textContent = inactiveCount;

  const search = (document.getElementById('dash-member-search')?.value || '').toLowerCase();

  const filtered = state.clients.filter(c => {
    const matchStatus = state.dashMemberFilter === 'ALL' || c.status === state.dashMemberFilter;
    const matchSearch = c.full_name.toLowerCase().includes(search) ||
                        c.document_id.includes(search) ||
                        c.phone.includes(search);
    return matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400">No se encontraron miembros.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice(0, 6).map(c => {
    const isMemActive = c.membership_status === 'VIGENTE' || c.membership_status === 'POR_VENCER';
    const badgeClass = c.status === 'INACTIVO'
      ? 'bg-slate-100 text-slate-500'
      : isMemActive
      ? 'bg-[#dcfce7] text-[#15803d]'
      : 'bg-rose-100 text-rose-700';

    const badgeLabel = c.status === 'INACTIVO'
      ? 'Inactivo'
      : c.membership_status === 'VIGENTE'
      ? 'Activo'
      : c.membership_status === 'POR_VENCER'
      ? 'Por vencer'
      : 'Vencido';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-2.5 pl-1 flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full ${getAvatarColor(c.full_name)} flex items-center justify-center font-bold text-xs shrink-0">
            ${getInitials(c.full_name)}
          </div>
          <div>
            <span class="font-bold text-slate-800 block leading-tight">${escapeHTML(c.full_name)}</span>
            <span class="text-[10px] text-slate-400 font-mono">CC: ${escapeHTML(c.document_id)}</span>
          </div>
        </td>
        <td class="py-2.5 text-slate-600 font-medium">${escapeHTML(c.plan_name || 'Sin plan')}</td>
        <td class="py-2.5">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}">
            ${badgeLabel}
          </span>
        </td>
        <td class="py-2.5 text-slate-500">${formatLastAccess(c.last_access)}</td>
        <td class="py-2.5 text-right pr-1">
          <div class="inline-flex items-center gap-1">
            <button onclick="viewClientDetail('${c.id}')" title="Ver Ficha 360" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800">
              <i data-lucide="id-card" class="w-4 h-4"></i>
            </button>
            <button onclick="quickRenewMembership('${c.id}')" title="Renovar Membresía" class="p-1.5 rounded-lg hover:bg-[#e6f4ea] text-slate-500 hover:text-[#1f8e55]">
              <i data-lucide="credit-card" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function renderClientsTable(list) {
  const tbody = document.getElementById('clients-table-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">No se encontraron miembros.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => {
    const isMemActive = c.membership_status === 'VIGENTE' || c.membership_status === 'POR_VENCER';
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${getAvatarColor(c.full_name)} flex items-center justify-center font-bold text-xs shrink-0">
            ${getInitials(c.full_name)}
          </div>
          <span class="font-bold text-slate-800">${escapeHTML(c.full_name)}</span>
        </td>
        <td class="py-3 px-4 font-mono text-slate-600 text-xs">${escapeHTML(c.document_id)}</td>
        <td class="py-3 px-4 font-mono text-slate-600 text-xs">${escapeHTML(c.phone)}</td>
        <td class="py-3 px-4 text-slate-700 font-medium text-xs">${escapeHTML(c.plan_name || 'Sin plan')}</td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${isMemActive ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-rose-100 text-rose-700'}">
            ${c.membership_status === 'VIGENTE' ? 'Vigente' : c.membership_status === 'POR_VENCER' ? 'Por vencer' : 'Vencido'}
          </span>
        </td>
        <td class="py-3 px-4 text-right space-x-1">
          <button onclick="viewClientDetail('${c.id}')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition">
            Ver Ficha
          </button>
          <button onclick="quickRenewMembership('${c.id}')" class="text-xs bg-[#e6f4ea] hover:bg-emerald-200 text-[#15803d] font-semibold px-3 py-1.5 rounded-lg transition">
            Renovar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterClients() {
  const search = (document.getElementById('clients-search-input')?.value || '').toLowerCase();
  const status = document.getElementById('clients-filter-status')?.value || '';

  const filtered = state.clients.filter(c => {
    const matchSearch = c.full_name.toLowerCase().includes(search) ||
                        c.document_id.includes(search) ||
                        c.phone.includes(search);
    const matchStatus = !status || c.status === status;
    return matchSearch && matchStatus;
  });

  renderClientsTable(filtered);
}

// ========================================================
// 2. MARCAJE DE ASISTENCIA (PORTERÍA Y RÁPIDO)
// ========================================================

async function handleQuickDashboardCheckIn(event) {
  event.preventDefault();
  const input = document.getElementById('quick-checkin-doc');
  const doc = input.value.trim();
  if (!doc) return;

  const box = document.getElementById('quick-checkin-result');
  box.classList.remove('hidden');

  try {
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc, registeredBy: 'Recepción' })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      playSuccessChime();
      box.className = 'mt-3 p-3 rounded-xl border bg-[#dcfce7] border-emerald-300 text-[#15803d] text-xs';
      box.innerHTML = `<strong>¡Entrada registrada!</strong> ${escapeHTML(data.client.full_name)} — Vence: ${data.membership?.end_date || ''}`;
      input.value = '';
      loadDashboardMetrics();
      loadClients();
    } else if (res.status === 403 && data.blocked) {
      playDeniedTone();
      state.pendingOverrideDoc = doc;
      box.className = 'mt-3 p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-700 text-xs';
      box.innerHTML = `
        <div class="font-bold">⛔ ACCESO BLOQUEADO</div>
        <div class="mt-0.5">${escapeHTML(data.message)}</div>
        <div class="mt-2 flex gap-2">
          <button type="button" onclick="openOverrideModal()" class="bg-rose-600 text-white px-2.5 py-1 rounded-lg font-semibold text-[11px]">Autorizar Excepción</button>
          ${data.client ? `<button type="button" onclick="quickRenewMembership('${data.client.id}')" class="bg-[#1f8e55] text-white px-2.5 py-1 rounded-lg font-semibold text-[11px]">Renovar Plan</button>` : ''}
        </div>
      `;
    } else {
      box.className = 'mt-3 p-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 text-xs';
      box.innerHTML = escapeHTML(data.message || data.error);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCheckIn(event, override = false, overrideReason = '') {
  if (event) event.preventDefault();

  const docInput = document.getElementById('checkin-doc');
  const documentId = override ? state.pendingOverrideDoc : docInput.value.trim();
  if (!documentId) return;

  const feedback = document.getElementById('checkin-feedback');
  feedback.classList.remove('hidden');

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
      playSuccessChime();
      feedback.className = 'mt-6 p-5 rounded-2xl border bg-[#e6f4ea] border-emerald-300 text-[#15803d]';
      feedback.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-[#1f8e55] text-white flex items-center justify-center shrink-0">
            <i data-lucide="check-circle" class="w-7 h-7"></i>
          </div>
          <div>
            <h4 class="text-lg font-extrabold">¡ACCESO CONCEDIDO!</h4>
            <p class="font-bold text-base text-slate-900">${escapeHTML(data.client.full_name)}</p>
            <p class="text-sm mt-0.5">${escapeHTML(data.message)}</p>
            ${data.membership ? `<p class="text-xs font-mono mt-2 bg-white/80 px-3 py-1 rounded-lg inline-block">Plan: ${escapeHTML(data.membership.plan_name)} | Vence: ${data.membership.end_date}</p>` : ''}
          </div>
        </div>
      `;
      if (docInput) docInput.value = '';
      state.pendingOverrideDoc = null;
      loadTodayAttendances();
      loadDashboardMetrics();
    } else if (res.status === 403 && data.blocked) {
      playDeniedTone();
      state.pendingOverrideDoc = documentId;
      feedback.className = 'mt-6 p-5 rounded-2xl border bg-rose-50 border-rose-200 text-rose-800';
      feedback.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <i data-lucide="shield-alert" class="w-7 h-7"></i>
          </div>
          <div>
            <h4 class="text-lg font-extrabold text-rose-700">ACCESO DENEGADO — MEMBRESÍA VENCIDA</h4>
            <p class="font-bold text-slate-900">${data.client ? escapeHTML(data.client.full_name) : 'Documento: ' + escapeHTML(documentId)}</p>
            <p class="text-sm text-rose-700 mt-1">${escapeHTML(data.message)}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button onclick="openOverrideModal()" class="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition">
                Autorizar Excepción Manual
              </button>
              ${data.client ? `
                <button onclick="quickRenewMembership('${data.client.id}')" class="bg-[#1f8e55] hover:bg-[#187544] text-white font-semibold text-xs py-2 px-4 rounded-xl transition">
                  Renovar Membresía Ahora
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    } else {
      feedback.className = 'mt-6 p-5 rounded-2xl border bg-amber-50 border-amber-200 text-amber-800';
      feedback.innerHTML = `<p class="font-semibold text-sm">${escapeHTML(data.message || data.error)}</p>`;
    }
  } catch (err) {
    showToast(err.message, 'error');
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
  handleCheckIn(null, true, reason || 'Autorizado manualmente');
}

async function loadTodayAttendances() {
  const listEl = document.getElementById('today-attendances-list');
  const badgeEl = document.getElementById('today-count-badge');
  if (!listEl) return;

  try {
    const res = await fetch('/api/attendance/today');
    const list = await res.json();
    if (badgeEl) badgeEl.textContent = `${list.length} entradas`;

    if (list.length === 0) {
      listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">Sin entradas registradas hoy.</p>`;
      return;
    }

    listEl.innerHTML = list.map(item => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-[#f3f6f8] border border-slate-200/60">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${getAvatarColor(item.full_name)} flex items-center justify-center font-bold text-xs">
            ${getInitials(item.full_name)}
          </div>
          <div>
            <p class="font-bold text-xs text-slate-800">${escapeHTML(item.full_name)}</p>
            <p class="text-[10px] text-slate-500 font-mono">CC: ${escapeHTML(item.document_id)}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.was_overridden ? 'bg-amber-100 text-amber-800' : 'bg-[#dcfce7] text-[#15803d]'}">
            ${item.was_overridden ? 'Excepción' : 'Entrada'}
          </span>
          <span class="block text-[11px] text-slate-400 mt-0.5">${formatTimeAMPM(item.check_in_time)}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {}
}

// ========================================================
// 3. CREACIÓN DE MIEMBROS Y FICHA 360
// ========================================================

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

    showToast(`¡Miembro ${fullName} registrado con éxito!`, 'success');
    closeModal('modal-new-client');
    document.getElementById('new-client-doc').value = '';
    document.getElementById('new-client-name').value = '';
    document.getElementById('new-client-phone').value = '';
    document.getElementById('new-client-notes').value = '';
    loadClients();
    loadDashboardMetrics();
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
    document.getElementById('detail-client-meta').textContent = `Documento: ${data.client.document_id} | WhatsApp: ${data.client.phone} | Estado: ${data.client.status}`;

    const banner = document.getElementById('detail-membership-banner');
    if (data.latestMembership) {
      const m = data.latestMembership;
      const isExpired = m.status === 'VENCIDA';
      banner.className = `mb-5 p-4 rounded-xl border ${isExpired ? 'bg-rose-50 border-rose-200' : 'bg-[#e6f4ea] border-emerald-200'}`;
      banner.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase ${isExpired ? 'text-rose-600' : 'text-[#15803d]'}">${m.status}</span>
            <h5 class="text-base font-extrabold text-slate-900">${escapeHTML(m.plan_name)}</h5>
            <p class="text-xs text-slate-600">Vigencia: ${m.start_date} hasta ${m.end_date}</p>
          </div>
          <button onclick="closeModal('modal-client-detail'); quickRenewMembership('${data.client.id}')" class="bg-[#1f8e55] hover:bg-[#187544] text-white text-xs font-semibold py-2 px-4 rounded-xl transition">
            Renovar Plan
          </button>
        </div>
      `;
    } else {
      banner.className = 'mb-5 p-4 rounded-xl border bg-slate-50 border-slate-200 text-xs text-slate-600 flex items-center justify-between';
      banner.innerHTML = `
        <span>Este miembro aún no tiene un plan activo asignado.</span>
        <button onclick="closeModal('modal-client-detail'); quickRenewMembership('${data.client.id}')" class="bg-[#1f8e55] text-white text-xs font-semibold py-1.5 px-3 rounded-xl">
          Asignar Plan
        </button>
      `;
    }

    const pList = document.getElementById('detail-payments-list');
    pList.innerHTML = (data.payments && data.payments.length > 0)
      ? data.payments.map(p => `
        <div class="flex justify-between items-center p-2.5 rounded-xl bg-[#f3f6f8]">
          <div>
            <span class="font-bold text-slate-800">${escapeHTML(p.plan_name || 'Membresía')}</span>
            <span class="text-slate-500 ml-2">${(p.created_at || '').split(' ')[0]} (${p.payment_method})</span>
          </div>
          <span class="font-mono font-bold text-[#1f8e55]">${formatCOP(p.amount)}</span>
        </div>
      `).join('')
      : '<p class="text-slate-400">Sin pagos registrados.</p>';

    const aList = document.getElementById('detail-attendances-list');
    aList.innerHTML = (data.attendances && data.attendances.length > 0)
      ? data.attendances.map(a => `
        <div class="flex justify-between items-center p-2.5 rounded-xl bg-[#f3f6f8]">
          <span class="font-mono text-slate-700">${a.check_in_time}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${a.was_overridden ? 'bg-amber-100 text-amber-800' : 'bg-[#dcfce7] text-[#15803d]'}">
            ${a.was_overridden ? 'Excepción manual' : 'Entrada normal'}
          </span>
        </div>
      `).join('')
      : '<p class="text-slate-400">Sin asistencias registradas.</p>';

    openModal('modal-client-detail');
  } catch (err) {
    showToast(err.message, 'error');
  }
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

// ========================================================
// 4. MEMBRESÍAS Y PAGOS
// ========================================================

async function loadPlans() {
  try {
    const res = await fetch('/api/memberships/plans');
    state.plans = await res.json();
    renderPlansGrid(state.plans);
    populatePlanSelect();
  } catch (err) {}
}

function renderPlansGrid(plans) {
  const grid = document.getElementById('plans-grid');
  if (!grid) return;

  grid.innerHTML = plans.map(p => `
    <div class="bg-[#f3f6f8] border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-[#1f8e55] transition">
      <div>
        <div class="flex justify-between items-start">
          <h4 class="font-extrabold text-slate-900 text-base">${escapeHTML(p.name)}</h4>
          <span class="text-xs bg-[#dcfce7] text-[#15803d] px-2.5 py-0.5 rounded-full font-bold">${p.duration_days} días</span>
        </div>
        <p class="text-xs text-slate-500 mt-1.5">${escapeHTML(p.description || 'Acceso completo a instalaciones')}</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
        <span class="text-lg font-extrabold text-[#1f8e55] font-mono">${formatCOP(p.price)}</span>
      </div>
    </div>
  `).join('');
}

function populatePlanSelect() {
  const sel = document.getElementById('assign-plan-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona un plan...</option>' + state.plans.map(p => `
    <option value="${p.id}" data-price="${p.price}">${escapeHTML(p.name)} — ${formatCOP(p.price)} (${p.duration_days} días)</option>
  `).join('');
}

function populateClientSelect() {
  const sel = document.getElementById('assign-client-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona un miembro...</option>' + state.clients.map(c => `
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
        <strong>Plan actual:</strong> ${escapeHTML(m.plan_name)} | Vence: <strong>${m.end_date}</strong> (${m.status}).<br>
        <span>✨ Los días del nuevo plan se sumarán a partir de su vencimiento actual.</span>
      `;
    } else {
      preview.innerHTML = `Sin membresía activa previa. La vigencia iniciará el día de hoy.`;
    }
  } catch (err) {}
}

function handlePlanChange() {
  const sel = document.getElementById('assign-plan-select');
  const opt = sel.options[sel.selectedIndex];
  const price = opt?.getAttribute('data-price');
  if (price) document.getElementById('assign-amount').value = price;
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
      body: JSON.stringify({ clientId, planId, amountPaid, paymentMethod, reference })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`¡Membresía activada y pago de ${formatCOP(amountPaid)} registrado!`, 'success');
    document.getElementById('form-assign-membership').reset();
    document.getElementById('assign-client-preview').classList.add('hidden');
    loadClients();
    loadDashboardMetrics();
    loadFinancesSummary();
    switchTab('dashboard');
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

    showToast(`Plan "${name}" creado correctamente`, 'success');
    closeModal('modal-new-plan');
    loadPlans();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================================================
// 5. FINANZAS Y CAJA
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
  } catch (err) {}
}

async function loadFinancesSummary() {
  try {
    const res = await fetch('/api/finances/summary');
    const data = await res.json();
    document.getElementById('fin-total-incomes').textContent = formatCOP(data.totalIncomes);
    document.getElementById('fin-total-expenses').textContent = formatCOP(data.totalExpenses);
    document.getElementById('fin-net-result').textContent = formatCOP(data.netResult);
  } catch (err) {}
}

async function loadTransactions() {
  const tbody = document.getElementById('finances-table-body');
  if (!tbody) return;
  try {
    const res = await fetch('/api/finances/transactions');
    const list = await res.json();

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">Sin movimientos financieros.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(tx => {
      const isInc = tx.type === 'INGRESO';
      return `
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4 font-mono text-xs text-slate-500">${escapeHTML(tx.date)}</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${isInc ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-rose-100 text-rose-700'}">
              ${tx.type}
            </span>
          </td>
          <td class="py-3 px-4 text-xs text-slate-600">${escapeHTML(tx.category_name || 'General')}</td>
          <td class="py-3 px-4 font-semibold text-slate-800 text-xs">${escapeHTML(tx.concept)}</td>
          <td class="py-3 px-4 text-right font-mono font-bold ${isInc ? 'text-[#1f8e55]' : 'text-rose-600'}">
            ${isInc ? '+' : '-'}${formatCOP(tx.amount)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {}
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
      body: JSON.stringify({ type: 'EGRESO', categoryId, concept, amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Gasto registrado en el libro financiero', 'success');
    closeModal('modal-new-expense');
    document.getElementById('expense-concept').value = '';
    document.getElementById('expense-amount').value = '';
    loadFinancesSummary();
    loadTransactions();
    loadDashboardMetrics();
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
      body: JSON.stringify({ type: 'INGRESO', concept, amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Ingreso extra registrado exitosamente', 'success');
    closeModal('modal-new-income');
    document.getElementById('income-concept').value = '';
    document.getElementById('income-amount').value = '';
    loadFinancesSummary();
    loadTransactions();
    loadDashboardMetrics();
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

    showToast(`Pago registrado al entrenador ${coachName}`, 'success');
    closeModal('modal-coach-payment');
    document.getElementById('coach-name').value = '';
    document.getElementById('coach-period').value = '';
    document.getElementById('coach-amount').value = '';
    loadFinancesSummary();
    loadTransactions();
    loadDashboardMetrics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================================================
// 6. WHATSAPP BOT (BAILEYS + GEMINI IA)
// ========================================================

async function checkWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp/status');
    const data = await res.json();
    state.waStatus = data.status;

    const sideDot = document.getElementById('sidebar-wa-dot');
    const dashDot = document.getElementById('dash-wa-dot');
    const dashLabel = document.getElementById('dash-wa-status-label');
    const qrContainer = document.getElementById('wa-qr-container');
    const qrImage = document.getElementById('wa-qr-image');
    const connectedContainer = document.getElementById('wa-connected-container');
    const btnConnect = document.getElementById('btn-wa-connect');
    const btnDisconnect = document.getElementById('btn-wa-disconnect');

    if (data.status === 'CONNECTED') {
      if (sideDot) sideDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      if (dashDot) dashDot.className = 'w-2.5 h-2.5 rounded-full bg-[#1f8e55]';
      if (dashLabel) dashLabel.textContent = `WhatsApp: Conectado (+${data.userPhone})`;
      if (qrContainer) qrContainer.classList.add('hidden');
      if (connectedContainer) {
        connectedContainer.classList.remove('hidden');
        document.getElementById('wa-connected-phone').textContent = `Sesión activa en +${data.userPhone}`;
      }
      if (btnConnect) btnConnect.classList.add('hidden');
      if (btnDisconnect) btnDisconnect.classList.remove('hidden');
    } else if (data.status === 'SCAN_QR') {
      if (sideDot) sideDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping';
      if (dashDot) dashDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping';
      if (dashLabel) dashLabel.textContent = 'WhatsApp: Esperando escaneo QR';
      if (qrContainer) {
        qrContainer.classList.remove('hidden');
        if (data.qrCodeDataUrl) qrImage.src = data.qrCodeDataUrl;
      }
      if (connectedContainer) connectedContainer.classList.add('hidden');
    } else {
      if (sideDot) sideDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
      if (dashDot) dashDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
      if (dashLabel) dashLabel.textContent = 'WhatsApp: Desconectado';
      if (qrContainer) qrContainer.classList.add('hidden');
      if (connectedContainer) connectedContainer.classList.add('hidden');
      if (btnConnect) btnConnect.classList.remove('hidden');
      if (btnDisconnect) btnDisconnect.classList.add('hidden');
    }
  } catch (err) {}
}

async function connectWhatsApp() {
  try {
    const btn = document.getElementById('btn-wa-connect');
    if (btn) btn.innerHTML = `Generando QR...`;
    await fetch('/api/whatsapp/connect', { method: 'POST' });
    showToast('Generando código QR de WhatsApp...', 'info');
    setTimeout(checkWhatsAppStatus, 1500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function confirmDisconnectWhatsApp() {
  if (confirm('¿Deseas cerrar y desvincular la sesión de WhatsApp?')) {
    fetch('/api/whatsapp/disconnect', { method: 'POST' }).then(() => {
      showToast('WhatsApp desvinculado', 'info');
      checkWhatsAppStatus();
    });
  }
}

async function loadWhatsAppCandidates() {
  const dashBox = document.getElementById('dash-wa-candidates');
  const fullBox = document.getElementById('wa-candidates-list');
  const badge = document.getElementById('top-notif-badge');

  try {
    const res = await fetch('/api/whatsapp/candidates');
    const candidates = await res.json();
    window._candidates = candidates || [];

    if (badge) {
      if (candidates.length > 0) {
        badge.textContent = candidates.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Render en tarjeta del Dashboard
    if (dashBox) {
      if (candidates.length === 0) {
        dashBox.innerHTML = `<div class="p-4 rounded-xl bg-[#f3f6f8] text-xs text-slate-500 text-center">Todos los miembros están al día y activos.</div>`;
      } else {
        dashBox.innerHTML = candidates.map((c, idx) => {
          const isInact = c.reason === 'INACTIVITY';
          return `
            <div class="p-3 rounded-xl bg-[#f3f6f8] border border-slate-200/70 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl ${isInact ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'} flex flex-col items-center justify-center shrink-0 font-bold text-[10px] leading-none">
                  <span>${c.daysInfo}d</span>
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-xs text-slate-800 truncate">${escapeHTML(c.fullName)}</p>
                  <p class="text-[11px] text-slate-500 truncate">${isInact ? `${c.daysInfo} días sin asistir` : `Vence el ${c.endDate}`}</p>
                </div>
              </div>
              <button onclick="sendCandidateMessage('${c.clientId}', '${c.reason}', ${idx})" class="bg-[#1f8e55] hover:bg-[#187544] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shrink-0 transition">
                Enviar WA
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // Render en pestaña completa de WhatsApp
    if (fullBox) {
      if (candidates.length === 0) {
        fullBox.innerHTML = `<p class="text-sm text-slate-400 text-center py-6">No hay alertas pendientes hoy.</p>`;
      } else {
        fullBox.innerHTML = candidates.map((c, idx) => {
          const isInact = c.reason === 'INACTIVITY';
          return `
            <div class="p-4 rounded-2xl bg-[#f3f6f8] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isInact ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}">
                    ${isInact ? `Inactivo (${c.daysInfo} días)` : `Por vencer (${c.daysInfo} días)`}
                  </span>
                  <span class="font-bold text-sm text-slate-900">${escapeHTML(c.fullName)}</span>
                  <span class="text-xs text-slate-500 font-mono">(${escapeHTML(c.phone)})</span>
                </div>
                <p class="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 italic mt-2">"${escapeHTML(c.suggestedMessage)}"</p>
              </div>
              <button onclick="sendCandidateMessage('${c.clientId}', '${c.reason}', ${idx})" id="btn-send-${idx}" class="bg-[#1f8e55] hover:bg-[#187544] text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition shrink-0 shadow-sm">
                Enviar por WhatsApp
              </button>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {}
}

async function sendCandidateMessage(clientId, ruleType, index) {
  if (state.waStatus !== 'CONNECTED') {
    showToast('Primero vincula el WhatsApp del gimnasio escaneando el código QR.', 'error');
    switchTab('whatsapp');
    return;
  }

  const cand = window._candidates[index];
  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, ruleType, message: cand.suggestedMessage })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`¡Mensaje enviado por WhatsApp a ${cand.fullName}!`, 'success');
    loadWhatsAppCandidates();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========================================================
// MODALES
// ========================================================

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function openNewClientModal() {
  openModal('modal-new-client');
  document.getElementById('new-client-doc')?.focus();
}
