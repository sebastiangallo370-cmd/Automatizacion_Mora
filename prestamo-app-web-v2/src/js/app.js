/* ============================================================
   CONFIGURACIÓN FIREBASE (compat - funciona sin servidor)
   ============================================================ */
var firebaseConfig = {
  apiKey: "AIzaSyAt5NVq2QPRw77jYcGtWxyerSADSFoGAks",
  authDomain: "automatizacion-mora.firebaseapp.com",
  databaseURL: "https://automatizacion-mora-default-rtdb.firebaseio.com",
  projectId: "automatizacion-mora",
  storageBucket: "automatizacion-mora.firebasestorage.app",
  messagingSenderId: "1029119076229",
  appId: "1:1029119076229:web:2403c259902d43f7f186ec"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();
var clientsRef = db.ref('clients');

/* ============================================================
   CONFIGURACIÓN APP
   ============================================================ */
var CONFIG = {
  USUARIO: 'admin',
  PASSWORD: '1234',
  INTERES_MENSUAL: 0.20,
  SESSION_KEY: 'prestamo_session'
};

var state = {
  clients: [],
  currentClientId: null,
  editMode: false,
  editId: null
};

/* ============================================================
   SINCRONIZACIÓN EN TIEMPO REAL
   ============================================================ */
clientsRef.on('value', function(snapshot) {
  var data = snapshot.val();
  if (data) {
    state.clients = Object.keys(data).map(function(key) {
      return Object.assign({}, data[key], { id: key });
    });
  } else {
    state.clients = [];
  }
  refreshCurrentView();
});

function refreshCurrentView() {
  if (!document.getElementById('dashboard-page').classList.contains('hidden')) renderDashboard();
  if (!document.getElementById('clients-page').classList.contains('hidden'))   renderClients();
  if (!document.getElementById('detail-page').classList.contains('hidden'))    renderDetail();
  if (!document.getElementById('intereses-page').classList.contains('hidden')) renderIntereses();
}

/* ============================================================
   ESCRITURA EN LA NUBE
   ============================================================ */
function saveClientToCloud(clientData) {
  if (state.editMode && state.editId) {
    return db.ref('clients/' + state.editId).update(clientData);
  } else {
    var newData = Object.assign({}, clientData, { creadoEn: new Date().toISOString() });
    return clientsRef.push(newData);
  }
}

function deleteClientFromCloud(id) {
  return db.ref('clients/' + id).remove();
}

function toggleCuotaInCloud(clientId, cuotaIndex, montoPagado) {
  var client = state.clients.find(function(c) { return c.id === clientId; });
  if (!client) return;

  var cuota = client.cuotas[cuotaIndex];
  var nuevoEstado = !cuota.pagada;
  var nuevaFecha  = nuevoEstado ? new Date().toISOString().split('T')[0] : null;

  var updates = {};
  updates['clients/' + clientId + '/cuotas/' + cuotaIndex + '/pagada']       = nuevoEstado;
  updates['clients/' + clientId + '/cuotas/' + cuotaIndex + '/fechaPagada']  = nuevaFecha;
  updates['clients/' + clientId + '/cuotas/' + cuotaIndex + '/montoPagado']  = nuevoEstado ? (montoPagado || cuota.cuota) : null;

  return db.ref().update(updates);
}

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */
function checkSession() {
  var session = localStorage.getItem(CONFIG.SESSION_KEY);
  if (session) {
    var s = JSON.parse(session);
    if (s.remember || s.temp) {
      showApp(s.username);
      return true;
    }
  }
  return false;
}

function doLogin() {
  var user     = document.getElementById('inp-user').value.trim();
  var pass     = document.getElementById('inp-pass').value;
  var remember = document.getElementById('remember-me').checked;
  var errEl    = document.getElementById('login-error');

  if (user !== CONFIG.USUARIO || pass !== CONFIG.PASSWORD) {
    errEl.textContent = 'Usuario o contraseña incorrectos. Intenta de nuevo.';
    errEl.classList.remove('hidden');
    setTimeout(function() { errEl.classList.add('hidden'); }, 4000);
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
  var mobileHeader = document.getElementById('mobile-header');
  var bottomNav    = document.getElementById('bottom-nav');
  if (mobileHeader) mobileHeader.style.display = 'none';
  if (bottomNav)    bottomNav.style.display    = 'none';
}

function showApp(username) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebar-username').textContent = username;
  var abbr = username.substring(0, 2).toUpperCase();
  document.getElementById('user-avatar-abbr').textContent = abbr;
  var mobUserBtn = document.getElementById('mobile-user-btn');
  if (mobUserBtn) mobUserBtn.textContent = abbr;
  var menuUsernameMob = document.getElementById('menu-username-mob');
  if (menuUsernameMob) menuUsernameMob.textContent = username;

  var mobileHeader = document.getElementById('mobile-header');
  var bottomNav    = document.getElementById('bottom-nav');
  if (mobileHeader) mobileHeader.style.display = 'flex';
  if (bottomNav)    bottomNav.style.display    = 'flex';

  showPage('dashboard');
}

/* ============================================================
   NAVEGACIÓN DE PÁGINAS
   ============================================================ */
function showPage(page) {
  ['dashboard-page','clients-page','detail-page','intereses-page'].forEach(function(p) {
    var el = document.getElementById(p);
    if (el) el.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

  if (page === 'dashboard') {
    document.getElementById('dashboard-page').classList.remove('hidden');
    document.getElementById('nav-dashboard').classList.add('active');
    var bDevTab = document.getElementById('bnav-dashboard');
    if (bDevTab) bDevTab.classList.add('active');
    renderDashboard();
  } else if (page === 'clients') {
    document.getElementById('clients-page').classList.remove('hidden');
    document.getElementById('nav-clients').classList.add('active');
    var bClientsTab = document.getElementById('bnav-clients');
    if (bClientsTab) bClientsTab.classList.add('active');
    renderClients();
  } else if (page === 'detail') {
    document.getElementById('detail-page').classList.remove('hidden');
    document.getElementById('nav-clients').classList.add('active');
    renderDetail();
  } else if (page === 'intereses') {
    document.getElementById('intereses-page').classList.remove('hidden');
    document.getElementById('nav-intereses').classList.add('active');
    var bIntTab = document.getElementById('bnav-intereses');
    if (bIntTab) bIntTab.classList.add('active');
    renderIntereses();
  }
  closeSidebar();
}

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('show');
}
function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('show');
}
function toggleUserMenu() {
  var menu = document.getElementById('mobile-user-menu');
  if (menu) menu.classList.toggle('show');
}

/* ============================================================
   CÁLCULO DE INTERESES Y CUOTAS
   ============================================================ */
function calcularPrestamo(monto, numCuotas, fechaInicio, diasFrecuencia) {
  var interesMensual  = CONFIG.INTERES_MENSUAL;
  var periodosDias    = parseInt(diasFrecuencia) || 30;
  var tasaPeriodo     = interesMensual * (periodosDias / 30);
  var interesPorCuota = monto * tasaPeriodo;
  var capitalPorCuota = monto / numCuotas;
  var cuotaFija       = capitalPorCuota + interesPorCuota;
  var totalIntereses  = interesPorCuota * numCuotas;
  var totalPagar      = monto + totalIntereses;

  var cuotas = [];
  var fechaBase = new Date(fechaInicio + 'T00:00:00');
  var saldoRestante = monto;

  for (var i = 1; i <= numCuotas; i++) {
    saldoRestante -= capitalPorCuota;
    var fechaPago = new Date(fechaBase);
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
  return { cuotaFija: cuotaFija, totalPagar: totalPagar, totalIntereses: totalIntereses, cuotas: cuotas, tasaPeriodo: tasaPeriodo };
}

/* ============================================================
   UTILIDADES DE FORMATEO
   ============================================================ */
function fmt(num) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  var parts  = dateStr.split('-');
  var months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}
function initials(name) {
  return name.split(' ').slice(0, 2).map(function(w) { return w[0]; }).join('').toUpperCase();
}
function isVencida(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date();
}
function formatMontoInput(input) {
  var digits = input.value.replace(/[^0-9]/g, '');
  if (digits === '') { input.value = ''; return; }
  input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ============================================================
   MÓDULO DE CLIENTES
   ============================================================ */
function recalcPreview() {
  var montoRaw  = document.getElementById('f-monto').value.replace(/[^0-9]/g, '');
  var monto     = parseFloat(montoRaw) || 0;
  var cuotas    = parseInt(document.getElementById('f-cuotas').value) || 0;
  var frecuencia = document.getElementById('f-frecuencia').value;
  var preview   = document.getElementById('calc-preview');

  if (monto > 0 && cuotas > 0) {
    var result = calcularPrestamo(monto, cuotas, new Date().toISOString().split('T')[0], frecuencia);
    document.getElementById('prev-total').textContent = fmt(result.totalPagar);
    document.getElementById('prev-cuota').textContent = fmt(result.cuotaFija);
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}

function openAddModal() {
  state.editMode = false;
  state.editId   = null;
  document.getElementById('modal-client-title').textContent = 'Nuevo cliente';
  ['f-nombre','f-tel','f-monto','f-cuotas'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-fecha').valueAsDate = new Date();
  document.getElementById('f-frecuencia').value  = '30';
  document.getElementById('calc-preview').classList.add('hidden');
  openModal('modal-client');
}

function saveClient() {
  var nombre      = document.getElementById('f-nombre').value.trim();
  var telefono    = document.getElementById('f-tel').value.trim();
  var montoRaw    = document.getElementById('f-monto').value.replace(/[^0-9]/g, '');
  var monto       = parseFloat(montoRaw);
  var numCuotas   = parseInt(document.getElementById('f-cuotas').value);
  var fechaPrestamo = document.getElementById('f-fecha').value;
  var frecuencia  = document.getElementById('f-frecuencia').value;

  if (!nombre || !monto || !numCuotas || !fechaPrestamo) {
    showToast('Por favor completa todos los campos obligatorios.', 'error');
    return;
  }

  var calc = calcularPrestamo(monto, numCuotas, fechaPrestamo, frecuencia);
  var clientData = {
    nombre: nombre, telefono: telefono, monto: monto,
    numCuotas: numCuotas, fechaPrestamo: fechaPrestamo, frecuencia: frecuencia,
    cuotaFija: calc.cuotaFija, totalPagar: calc.totalPagar,
    totalIntereses: calc.totalIntereses, cuotas: calc.cuotas
  };

  saveClientToCloud(clientData).then(function() {
    showToast(state.editMode ? 'Cliente actualizado' : 'Cliente agregado');
    closeModal('modal-client');
  }).catch(function() { showToast('Error al guardar', 'error'); });
}

/* ============================================================
   RENDERIZADO
   ============================================================ */
function renderDashboard() {
  var clients = state.clients;
  var totalPrestado = 0, totalCobrar = 0, totalCobrado = 0, clientesActivos = 0;
  var intPactado = 0, intCobrados = 0, intPendientes = 0, capitalEnProceso = 0;

  clients.forEach(function(c) {
    totalPrestado += c.monto;
    var cuotasPendientes = c.cuotas.filter(function(q) { return !q.pagada; });
    var cuotasPagadas    = c.cuotas.filter(function(q) { return q.pagada; });
    totalCobrar      += cuotasPendientes.reduce(function(s, q) { return s + q.cuota; }, 0);
    totalCobrado     += cuotasPagadas.reduce(function(s, q) { return s + q.cuota; }, 0);
    capitalEnProceso += cuotasPendientes.reduce(function(s, q) { return s + q.capital; }, 0);
    if (cuotasPendientes.length > 0) clientesActivos++;
    var intPorCuota = c.totalIntereses / c.numCuotas;
    intPactado   += c.totalIntereses;
    intCobrados  += cuotasPagadas.length * intPorCuota;
    intPendientes += cuotasPendientes.length * intPorCuota;
  });

  document.getElementById('stat-total-prestado').textContent  = fmt(totalPrestado);
  document.getElementById('stat-total-cobrar').textContent     = fmt(totalCobrar);
  document.getElementById('stat-clientes').textContent         = clientesActivos;
  document.getElementById('stat-cuotas-cobradas').textContent  = fmt(totalCobrado);
  document.getElementById('stat-capital-proceso').textContent  = fmt(capitalEnProceso);
  document.getElementById('int-total-pactado').textContent     = fmt(intPactado);
  document.getElementById('int-cobrados').textContent          = fmt(intCobrados);
  document.getElementById('int-pendientes').textContent        = fmt(intPendientes);
  document.getElementById('int-promedio').textContent          = fmt(clients.length > 0 ? intPactado / clients.length : 0);

  var tbody = document.getElementById('int-tbody-dash');
  if (tbody) {
    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Sin préstamos registrados</td></tr>';
    } else {
      tbody.innerHTML = clients.map(function(c) {
        var intPorCuota = c.totalIntereses / c.numCuotas;
        var pagadas  = c.cuotas.filter(function(q) { return q.pagada; }).length;
        var progreso = c.numCuotas > 0 ? Math.round((pagadas / c.numCuotas) * 100) : 0;
        return '<tr>' +
          '<td><div class="flex items-center gap-8"><div class="client-avatar" style="width:32px;height:32px;font-size:12px;cursor:pointer" onclick="viewClient(\'' + c.id + '\')">' + initials(c.nombre) + '</div><div><div class="font-500">' + c.nombre + '</div><div class="text-xs text-muted">' + fmtDate(c.fechaPrestamo) + '</div></div></div></td>' +
          '<td class="font-500">' + fmt(c.monto) + '</td>' +
          '<td style="color:var(--gold)">' + fmt(intPorCuota) + '</td>' +
          '<td class="font-600">' + fmt(c.totalIntereses) + '</td>' +
          '<td style="color:var(--success)">' + fmt(pagadas * intPorCuota) + '</td>' +
          '<td style="color:var(--gold)">' + fmt((c.numCuotas - pagadas) * intPorCuota) + '</td>' +
          '<td><div class="flex items-center gap-8"><div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:' + progreso + '%"></div></div><span class="text-xs">' + progreso + '%</span></div></td>' +
          '</tr>';
      }).join('');
    }
  }

  var dashList = document.getElementById('dashboard-list');
  if (dashList) {
    var recent = clients.slice(0, 5);
    dashList.innerHTML = recent.length ? recent.map(clientRowHTML).join('') : '<div class="empty-state">No hay préstamos recientes</div>';
  }
}

function renderClients() {
  var search       = (document.getElementById('search-input').value || '').toLowerCase();
  var filterStatus = document.getElementById('filter-status').value;

  var clients = state.clients.filter(function(c) {
    var matchSearch  = c.nombre.toLowerCase().includes(search) || (c.telefono || '').toLowerCase().includes(search);
    var pendientes   = c.cuotas.filter(function(q) { return !q.pagada; }).length;
    var matchStatus  = !filterStatus ||
      (filterStatus === 'activo'   && pendientes > 0) ||
      (filterStatus === 'completo' && pendientes === 0);
    return matchSearch && matchStatus;
  });

  var listEl = document.getElementById('clients-list');
  if (listEl) {
    listEl.innerHTML = clients.length ? clients.map(clientRowHTML).join('') : '<div class="empty-state">No se encontraron clientes</div>';
  }
}

function clientRowHTML(c) {
  var cuotasPagadas = c.cuotas.filter(function(q) { return q.pagada; }).length;
  var progreso = Math.round((cuotasPagadas / c.cuotas.length) * 100);
  return '<div class="client-row" onclick="viewClient(\'' + c.id + '\')">' +
    '<div class="client-avatar">' + initials(c.nombre) + '</div>' +
    '<div class="client-info">' +
      '<div class="client-name">' + c.nombre + '</div>' +
      '<div class="client-meta">' + (c.telefono || 'Sin teléfono') + ' · Desde ' + fmtDate(c.fechaPrestamo) + '</div>' +
      '<div class="flex items-center gap-8 mt-8">' +
        '<div class="progress-bar" style="width:100px"><div class="progress-fill" style="width:' + progreso + '%"></div></div>' +
        '<span class="text-xs">' + progreso + '%</span>' +
      '</div>' +
    '</div>' +
    '<div class="client-amount text-right">' +
      '<div class="font-600">' + fmt(c.monto) + '</div>' +
      '<div class="text-xs text-muted">Capital prestado</div>' +
    '</div>' +
  '</div>';
}

function viewClient(id) {
  state.currentClientId = id;
  showPage('detail');
}

function renderDetail() {
  var client = state.clients.find(function(c) { return c.id === state.currentClientId; });
  if (!client) return;
  var detail = document.getElementById('detail-content');
  if (!detail) return;

  var cuotasPagadas = client.cuotas.filter(function(q) { return q.pagada; }).length;
  var progreso = Math.round((cuotasPagadas / client.cuotas.length) * 100);

  var filasHTML = client.cuotas.map(function(q, i) {
    var inputId  = 'inp-monto-' + i;
    var btnPagar = q.pagada
      ? '<span style="font-size:12px;color:var(--text2);margin-right:8px;">Pagado: ' + fmt(q.montoPagado || q.cuota) + '</span><button class="btn btn-outline btn-sm" onclick="toggleCuota(\'' + client.id + '\',' + i + ')">↩ Desmarcar</button>'
      : '<input id="' + inputId + '" type="text" placeholder="' + Math.round(q.cuota).toLocaleString('es-CO') + '" oninput="formatMontoInput(this)" style="width:120px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-right:8px;background:var(--surface);color:var(--text);">' +
        '<button class="btn btn-primary btn-sm" onclick="toggleCuota(\'' + client.id + '\',' + i + ',\'' + inputId + '\')">✓ Pagar</button>';
    return '<tr>' +
      '<td style="padding:10px;">' + q.numero + '</td>' +
      '<td style="padding:10px;">' + fmtDate(q.fechaPago) + '</td>' +
      '<td style="padding:10px;">' + fmt(q.cuota) + '</td>' +
      '<td style="padding:10px;">' + (q.pagada ? '✅ Pagada' : '⏳ Pendiente') + '</td>' +
      '<td style="padding:10px;">' + btnPagar + '</td>' +
      '</tr>';
  }).join('');

  detail.innerHTML =
    '<div class="flex justify-between items-center mb-24">' +
      '<div class="flex items-center gap-16">' +
        '<div class="client-avatar" style="width:64px;height:64px;font-size:24px">' + initials(client.nombre) + '</div>' +
        '<div><h3 class="font-disp" style="font-size:24px">' + client.nombre + '</h3><p class="text-muted">' + (client.telefono || 'Sin teléfono') + '</p></div>' +
      '</div>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteClient(\'' + client.id + '\')">Eliminar Cliente</button>' +
    '</div>' +
    '<div class="stats-grid mb-24">' +
      '<div class="stat-card"><div class="stat-label">Capital</div><div class="stat-value">' + fmt(client.monto) + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Total a Pagar</div><div class="stat-value">' + fmt(client.totalPagar) + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Valor Cuota</div><div class="stat-value">' + fmt(client.cuotaFija) + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Restando</div><div class="stat-value" style="color:var(--danger)">' + fmt(client.cuotas.filter(function(q){return !q.pagada;}).reduce(function(s,q){return s+q.cuota;},0)) + '</div></div>' +
    '</div>' +
    '<div class="card" style="padding:0; overflow:hidden;">' +
      '<table class="w-full" style="border-collapse:collapse; font-size:13px;">' +
        '<thead style="background:var(--surface2); border-bottom:1px solid var(--border);">' +
          '<tr><th style="padding:10px;text-align:left;">#</th><th style="padding:10px;text-align:left;">Fecha</th><th style="padding:10px;text-align:left;">Cuota</th><th style="padding:10px;text-align:left;">Estado</th><th style="padding:10px;text-align:left;">Acción</th></tr>' +
        '</thead>' +
        '<tbody>' + filasHTML + '</tbody>' +
      '</table>' +
    '</div>';
}

function toggleCuota(clientId, index, inputId) {
  var montoPagado = null;
  if (inputId) {
    var inp = document.getElementById(inputId);
    if (inp && inp.value.trim() !== '') {
      montoPagado = parseFloat(inp.value.replace(/[^0-9]/g, '')) || null;
    }
  }
  toggleCuotaInCloud(clientId, index, montoPagado).then(function() { showToast('Estado actualizado'); });
}

function deleteClient(id) {
  if (confirm('¿Estás seguro de eliminar este cliente?')) {
    deleteClientFromCloud(id).then(function() {
      showToast('Cliente eliminado');
      showPage('clients');
    });
  }
}

function renderIntereses() {
  var pagados = state.clients.filter(function(c) {
    return c.cuotas.every(function(q) { return q.pagada; });
  });
  var list = document.getElementById('pagados-list');
  if (list) {
    list.innerHTML = pagados.length ? pagados.map(clientRowHTML).join('') : '<div class="empty-state">No hay clientes con deuda saldada</div>';
  }
}

/* ============================================================
   MODALES Y TOASTS
   ============================================================ */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
function showToast(msg, type) {
  var toast = document.getElementById('toast');
  if (toast) {
    toast.textContent    = msg;
    toast.style.background  = (type === 'error') ? 'var(--danger)' : 'var(--accent)';
    toast.style.transform   = 'translateY(0)';
    toast.style.opacity     = '1';
    setTimeout(function() {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(80px)';
    }, 3000);
  }
}

/* ============================================================
   EXPONER FUNCIONES GLOBALES
   ============================================================ */
window.doLogin          = doLogin;
window.doLogout         = doLogout;
window.showPage         = showPage;
window.toggleSidebar    = toggleSidebar;
window.closeSidebar     = closeSidebar;
window.toggleUserMenu   = toggleUserMenu;
window.openAddModal     = openAddModal;
window.saveClient       = saveClient;
window.recalcPreview    = recalcPreview;
window.formatMontoInput = formatMontoInput;
window.viewClient       = viewClient;
window.toggleCuota      = toggleCuota;
window.deleteClient     = deleteClient;
window.renderClients    = renderClients;
window.openModal        = openModal;
window.closeModal       = closeModal;

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!checkSession()) {
    document.getElementById('login-screen').style.display = 'flex';
  }
  var passInp = document.getElementById('inp-pass');
  if (passInp) {
    passInp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }
});
