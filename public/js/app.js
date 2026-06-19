const API = '';
let currentUser = null;
let token = localStorage.getItem('token');

function setToken(t) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

function authHeaders() {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers };
  const res = await fetch(API + url, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    currentUser = null;
    showScreen('auth');
    throw new Error('Sesion expirada');
  }
  return res;
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(name + '-screen');
  if (el) el.classList.add('active');
}

function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + viewName);
  if (el) el.classList.add('active');

  const titles = { home: 'Inicio', chat: 'Chat con IA', codes: 'Codigos OBD', favorites: 'Favoritos', history: 'Historial', profile: 'Mi perfil', 'code-detail': 'Detalle del Codigo' };
  document.getElementById('header-title').textContent = titles[viewName] || viewName;

  document.querySelectorAll('.nav-item[data-view]').forEach(n => {
    n.classList.toggle('active', n.dataset.view === viewName);
  });
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.view);
      closeSidebar();
      if (btn.dataset.view === 'codes') loadCodes();
      if (btn.dataset.view === 'favorites') loadFavorites();
      if (btn.dataset.view === 'history') loadHistory();
      if (btn.dataset.view === 'profile') loadProfile();
    });
  });

  document.querySelectorAll('.action-card').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.action);
      if (btn.dataset.action === 'codes') loadCodes();
      if (btn.dataset.action === 'favorites') loadFavorites();
      if (btn.dataset.action === 'history') loadHistory();
    });
  });

  document.getElementById('start-chat-btn').addEventListener('click', () => showView('chat'));
  document.getElementById('new-chat-header').addEventListener('click', () => {
    currentChatId = null;
    showView('chat');
    resetChat();
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    setToken(null);
    currentUser = null;
    showScreen('auth');
    closeSidebar();
  });

  loadTips();

  if (token) {
    apiFetch('/api/auth/profile').then(r => r.json()).then(user => {
      if (user.id) {
        currentUser = user;
        showScreen('main');
        updateUserDisplay();
      } else {
        showScreen('auth');
      }
    }).catch(() => showScreen('auth'));
  }
});

function updateUserDisplay() {
  if (!currentUser) return;
  const initial = (currentUser.nombre || currentUser.email || 'U')[0].toUpperCase();
  document.getElementById('user-avatar').textContent = initial;
  document.getElementById('user-name-display').textContent = currentUser.nombre || currentUser.email;
  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-name').textContent = currentUser.nombre || currentUser.email;
}

async function loadTips() {
  try {
    const res = await fetch(API + '/api/tips');
    const tips = await res.json();
    const container = document.getElementById('tips-container');
    container.innerHTML = tips.map(t => `
      <div class="tip-card">
        <h4>${t.titulo}</h4>
        <p>${t.consejo}</p>
      </div>
    `).join('');
  } catch(e) {}
}
