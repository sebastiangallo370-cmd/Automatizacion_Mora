/* ============================================================
   CONFIGURACIÓN Y CONSTANTES
   ============================================================ */
const CONFIG = {
  USUARIO: 'admin',
  PASSWORD: '1234',
  INTERES_MENSUAL: 0.20,  // 20% mensual fijo
  STORAGE_KEY: 'prestamo_app_data',
  SESSION_KEY: 'prestamo_session'
};

/* ============================================================
   ESTADO DE LA APP
   ============================================================ */
let state = {
  clients: [],
  currentClientId: null,
  editMode: false,
  editId: null
};

/* ============================================================
   ALMACENAMIENTO LOCAL (localStorage)
   ============================================================ */
function saveData() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.clients));
}

function loadData() {
  const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (raw) state.clients = JSON.parse(raw);
}

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */
function checkSession() {
  const session = localStorage.getItem(CONFIG.SESSION_KEY);
  if (session) {
    const s = JSON.parse(session);
    if (s.remember || s.temp) {
      showApp(s.username);
      return true;
    }
  }
  return false;
}

function doLogin() {
  const user = document.getElementById('inp-user').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const remember = document.getElementById('remember-me').checked;
  const errEl = document.getElementById('login-error');

  if (user !== CONFIG.USUARIO || pass !== CONFIG.PASSWORD) {
    errEl.textContent = 'Usuario o contraseña incorrectos. Intenta de nuevo.';
    errEl.classList.remove('hidden');
    setTimeout(() => errEl.classList.add('hidden'), 4000);
    return;
  }

  localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
    username: user,
    remember: remember,
    temp: !remember
  }));

  showApp(user);
}

function doLogout() {
  localStorage.removeItem(CONFIG.SESSION_KEY);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
}

function showApp(username) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebar-username').textContent = username;
  const abbr = username.substring(0, 2).toUpperCase();
  document.getElementById('user-avatar-abbr').textContent = abbr;
  // Sincronizar header y menú móvil
  const mobUserBtn = document.getElementById('mobile-user-btn');
  if (mobUserBtn) mobUserBtn.textContent = abbr;
  const menuUsernameMob = document.getElementById('menu-username-mob');
  if (menuUsernameMob) menuUsernameMob.textContent = username;
  
  loadData();
  showPage('dashboard');
}

/* ============================================================
   NAVEGACIÓN DE PÁGINAS
   ============================================================ */
function showPage(page) {
  ['dashboard-page','clients-page','detail-page','intereses-page'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));

  if (page === 'dashboard') {
    document.getElementById('dashboard-page').classList.remove('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    const bDevTab = document.getElementById('bnav-dashboard');
    if (bDevTab) bDevTab.classList.add('active');
    renderDashboard();
  } else if (page === 'clients') {
    document.getElementById('clients-page').classList.remove('hidden');
    document.getElementById('nav-clients').classList.add('active');
    const bClientsTab = document.getElementById('bnav-clients');
    if (bClientsTab) bClientsTab.classList.add('active');
    renderClients();
  } else if (page === 'detail') {
    document.getElementById('detail-page').classList.remove('hidden');
    document.getElementById('nav-clients').classList.add('active');
    renderDetail();
  } else if (page === 'intereses') {
    document.getElementById('intereses-page').classList.remove('hidden');
    document.getElementById('nav-intereses').classList.add('active');
    const bIntTab = document.getElementById('bnav-intereses');
    if (bIntTab) bIntTab.classList.add('active');
    renderIntereses();
  }
  closeSidebar();
  const userMenu = document.getElementById('mobile-user-menu');
  if (userMenu) userMenu.classList.remove('show');
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('show');
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('show');
}
function toggleUserMenu() {
  const menu = document.getElementById('mobile-user-menu');
  if (menu) menu.classList.toggle('show');
}

/* ============================================================
   CÁLCULO DE INTERESES Y CUOTAS
   ============================================================ */
function calcularPrestamo(monto, numCuotas, fechaInicio, diasFrecuencia) {
  const interesMensual = CONFIG.INTERES_MENSUAL;
  const periodosDias = parseInt(diasFrecuencia) || 30;
  const tasaPeriodo = interesMensual * (periodosDias / 30);
  const interesPorCuota = monto * tasaPeriodo;
  const capitalPorCuota = monto / numCuotas;
  const cuotaFija = capitalPorCuota + interesPorCuota;
  const totalIntereses = interesPorCuota * numCuotas;
  const totalPagar = monto + totalIntereses;

  const cuotas = [];
  let fechaBase = new Date(fechaInicio + 'T00:00:00');
  let saldoRestante = monto;

  for (let i = 1; i <= numCuotas; i++) {
    saldoRestante -= capitalPorCuota;
    const fechaPago = new Date(fechaBase);
    fechaPago.setDate(fechaPago.getDate() + periodosDias * i);

    cuotas.push({
      numero: i,
      fechaPago: fechaPago.toISOString().split('T')[0],
      capital: capitalPorCuota,
      interes: interesPorCuota,
      cuota: cuotaFija,
      saldo: Math.max(0, saldoRestante),
      pagada: false,
      fechaPagada: null
    });
  }
  return { cuotaFija, totalPagar, totalIntereses, cuotas, tasaPeriodo };
}

/* ============================================================
   UTILIDADES DE FORMATEO
   ============================================================ */
function fmt(num) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}
function initials(name) {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function isVencida(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date();
}
function numberWithCommas(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function formatMontoInput(input) {
  const digits = input.value.replace(/[^0-9]/g, '');
  if (digits === '') { input.value = ''; return; }
  input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ============================================================
   MÓDULO DE CLIENTES
   ============================================================ */
function recalcPreview() {
  const montoRaw = document.getElementById('f-monto').value.replace(/[^0-9]/g, '');
  const monto = parseFloat(montoRaw) || 0;
  const cuotas = parseInt(document.getElementById('f-cuotas').value) || 0;
  const frecuencia = document.getElementById('f-frecuencia').value;
  const preview = document.getElementById('calc-preview');

  if (monto > 0 && cuotas > 0) {
    const result = calcularPrestamo(monto, cuotas, new Date().toISOString().split('T')[0], frecuencia);
    document.getElementById('prev-total').textContent = fmt(result.totalPagar);
    document.getElementById('prev-cuota').textContent = fmt(result.cuotaFija);
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}

function openAddModal() {
  state.editMode = false;
  state.editId = null;
  document.getElementById('modal-client-title').textContent = 'Nuevo cliente';
  ['f-nombre','f-tel','f-monto','f-cuotas'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-fecha').valueAsDate = new Date();
  document.getElementById('f-frecuencia').value = '30';
  document.getElementById('calc-preview').classList.add('hidden');
  openModal('modal-client');
}

function saveClient() {
  const nombre = document.getElementById('f-nombre').value.trim();
  const telefono = document.getElementById('f-tel').value.trim();
  const montoRaw = document.getElementById('f-monto').value.replace(/[^0-9]/g, '');
  const monto = parseFloat(montoRaw);
  const numCuotas = parseInt(document.getElementById('f-cuotas').value);
  const fechaPrestamo = document.getElementById('f-fecha').value;
  const frecuencia = document.getElementById('f-frecuencia').value;

  if (!nombre || !monto || !numCuotas || !fechaPrestamo) {
    showToast('Por favor completa todos los campos obligatorios.', 'error');
    return;
  }

  const calc = calcularPrestamo(monto, numCuotas, fechaPrestamo, frecuencia);

  if (state.editMode && state.editId) {
    const idx = state.clients.findIndex(c => c.id === state.editId);
    if (idx !== -1) {
      const oldCuotas = state.clients[idx].cuotas;
      state.clients[idx] = {
        ...state.clients[idx],
        nombre, telefono, monto, numCuotas, fechaPrestamo, frecuencia,
        cuotaFija: calc.cuotaFija,
        totalPagar: calc.totalPagar,
        totalIntereses: calc.totalIntereses,
        cuotas: calc.cuotas.map((c, i) => ({
          ...c,
          pagada: (oldCuotas[i] && oldCuotas[i].pagada) || false,
          fechaPagada: (oldCuotas[i] && oldCuotas[i].fechaPagada) || null
        }))
      };
      showToast('Cliente actualizado correctamente.');
    }
  } else {
    const newClient = {
      id: Date.now().toString(),
      nombre, telefono, monto, numCuotas, fechaPrestamo, frecuencia,
      cuotaFija: calc.cuotaFija,
      totalPagar: calc.totalPagar,
      totalIntereses: calc.totalIntereses,
      cuotas: calc.cuotas,
      creadoEn: new Date().toISOString()
    };
    state.clients.unshift(newClient);
    showToast('Cliente agregado correctamente.');
  }

  saveData();
  closeModal('modal-client');
  if (state.currentClientId) renderDetail();
  if (!document.getElementById('clients-page').classList.contains('hidden')) renderClients();
  renderDashboard();
}

/* ============================================================
   RENDERIZADO
   ============================================================ */
function renderDashboard() {
  const clients = state.clients;
  let totalPrestado = 0, totalCobrar = 0, totalCobrado = 0, clientesActivos = 0;
  let intPactado = 0, intCobrados = 0, intPendientes = 0;

  clients.forEach(c => {
    totalPrestado += c.monto;
    const cuotasPendientes = c.cuotas.filter(q => !q.pagada);
    const cuotasPagadas = c.cuotas.filter(q => q.pagada);
    totalCobrar += cuotasPendientes.reduce((s, q) => s + q.cuota, 0);
    totalCobrado += cuotasPagadas.reduce((s, q) => s + q.cuota, 0);
    if (cuotasPendientes.length > 0) clientesActivos++;
    const intPorCuota = c.totalIntereses / c.numCuotas;
    intPactado += c.totalIntereses;
    intCobrados += cuotasPagadas.length * intPorCuota;
    intPendientes += cuotasPendientes.length * intPorCuota;
  });

  document.getElementById('stat-total-prestado').textContent = fmt(totalPrestado);
  document.getElementById('stat-total-cobrar').textContent = fmt(totalCobrar);
  document.getElementById('stat-clientes').textContent = clientesActivos;
  document.getElementById('stat-cuotas-cobradas').textContent = fmt(totalCobrado);
  document.getElementById('int-total-pactado').textContent = fmt(intPactado);
  document.getElementById('int-cobrados').textContent = fmt(intCobrados);
  document.getElementById('int-pendientes').textContent = fmt(intPendientes);
  document.getElementById('int-promedio').textContent = fmt(clients.length > 0 ? intPactado / clients.length : 0);

  const tbody = document.getElementById('int-tbody-dash');
  if (tbody) {
    if (clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin préstamos registrados</td></tr>`;
    } else {
      tbody.innerHTML = clients.map(c => {
        const intPorCuota = c.totalIntereses / c.numCuotas;
        const pagadas = c.cuotas.filter(q => q.pagada).length;
        const progreso = c.numCuotas > 0 ? Math.round((pagadas / c.numCuotas) * 100) : 0;
        return `<tr>
          <td><div class="flex items-center gap-8"><div class="client-avatar" style="width:32px;height:32px;font-size:12px" onclick="viewClient('${c.id}')">${initials(c.nombre)}</div><div><div class="font-500">${c.nombre}</div><div class="text-xs text-muted">${fmtDate(c.fechaPrestamo)}</div></div></div></td>
          <td class="font-500">${fmt(c.monto)}</td>
          <td style="color:var(--gold)">${fmt(intPorCuota)}</td>
          <td class="font-600">${fmt(c.totalIntereses)}</td>
          <td style="color:var(--success)">${fmt(pagadas * intPorCuota)}</td>
          <td style="color:var(--gold)">${fmt((c.numCuotas - pagadas) * intPorCuota)}</td>
          <td><div class="flex items-center gap-8"><div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${progreso}%"></div></div><span class="text-xs">${progreso}%</span></div></td>
        </tr>`;
      }).join('');
    }
  }

  const dashList = document.getElementById('dashboard-list');
  if (dashList) {
    const recent = clients.slice(0, 5);
    dashList.innerHTML = recent.length ? recent.map(c => clientRowHTML(c)).join('') : '<div class="empty-state">No hay préstamos recientes</div>';
  }
}

function renderClients() {
  const search = (document.getElementById('search-input').value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-status').value;

  const clients = state.clients.filter(c => {
    const matchSearch = c.nombre.toLowerCase().includes(search) || (c.telefono || '').toLowerCase().includes(search);
    const cuotasPendientes = c.cuotas.filter(q => !q.pagada).length;
    const matchStatus = !filterStatus || (filterStatus === 'activo' && cuotasPendientes > 0) || (filterStatus === 'completo' && cuotasPendientes === 0);
    return matchSearch && matchStatus;
  });

  const listEl = document.getElementById('clients-list');
  if (listEl) {
    listEl.innerHTML = clients.length ? clients.map(c => clientRowHTML(c)).join('') : '<div class="empty-state">No se encontraron clientes</div>';
  }
}

function clientRowHTML(c) {
  const cuotasPagadas = c.cuotas.filter(q => q.pagada).length;
  const progreso = Math.round((cuotasPagadas / c.cuotas.length) * 100);
  return `<div class="client-row" onclick="viewClient('${c.id}')">
    <div class="client-avatar">${initials(c.nombre)}</div>
    <div class="client-info">
      <div class="client-name">${c.nombre}</div>
      <div class="client-meta">${c.telefono || 'Sin teléfono'} · Desde ${fmtDate(c.fechaPrestamo)}</div>
      <div class="flex items-center gap-8 mt-8">
        <div class="progress-bar" style="width:100px"><div class="progress-fill" style="width:${progreso}%"></div></div>
        <span class="text-xs">${progreso}%</span>
      </div>
    </div>
    <div class="client-amount text-right">
      <div class="font-600">${fmt(c.monto)}</div>
      <div class="text-xs text-muted">Capital prestado</div>
    </div>
  </div>`;
}

function viewClient(id) {
  state.currentClientId = id;
  showPage('detail');
}

function renderDetail() {
  const client = state.clients.find(c => c.id === state.currentClientId);
  if (!client) return;
  const detail = document.getElementById('detail-content');
  if (detail) {
    const pagadas = client.cuotas.filter(q => q.pagada).length;
    detail.innerHTML = `
      <div class="flex items-center gap-16 mb-24">
        <div class="client-avatar" style="width:64px;height:64px;font-size:24px">${initials(client.nombre)}</div>
        <div><h3 class="font-disp" style="font-size:24px">${client.nombre}</h3><p class="text-muted">${client.telefono || 'Sin teléfono'}</p></div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Capital</div><div class="stat-value">${fmt(client.monto)}</div></div>
        <div class="stat-card"><div class="stat-label">Total a Pagar</div><div class="stat-value">${fmt(client.totalPagar)}</div></div>
        <div class="stat-card"><div class="stat-label">Cuota</div><div class="stat-value">${fmt(client.cuotaFija)}</div></div>
        <div class="stat-card"><div class="stat-label">Intereses</div><div class="stat-value">${fmt(client.totalIntereses)}</div></div>
      </div>
    `;
  }
}

function renderIntereses() {
  const pagados = state.clients.filter(c => c.cuotas.every(q => q.pagada));
  const list = document.getElementById('pagados-list');
  if (list) {
    list.innerHTML = pagados.length ? pagados.map(c => clientRowHTML(c)).join('') : '<div class="empty-state">No hay clientes con deuda saldada</div>';
  }
}

/* ============================================================
   MODALES Y TOASTS
   ============================================================ */
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--accent)';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(80px)'; }, 3000);
  }
}

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!checkSession()) {
    document.getElementById('login-screen').style.display = 'flex';
  }
  const passInp = document.getElementById('inp-pass');
  if (passInp) passInp.addEventListener('keydown', e => e.key === 'Enter' && doLogin());
});
