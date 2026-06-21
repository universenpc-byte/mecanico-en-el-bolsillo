const API = (
  typeof window !== 'undefined' &&
  typeof window.Capacitor !== 'undefined' &&
  window.Capacitor.isNativePlatform()
) ? 'https://mecanico-en-el-bolsillo.onrender.com' : '';

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(API + url, { ...options, headers });
  return res;
}

function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + viewName);
  if (el) el.classList.add('active');

  const titles = { home: 'Inicio', chat: 'Chat con IA', codes: 'Codigos OBD', favorites: 'Favoritos', history: 'Historial', 'code-detail': 'Detalle del Codigo' };
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

  loadTips();
});

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
