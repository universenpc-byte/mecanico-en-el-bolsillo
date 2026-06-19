let codesPage = 1;
let codesQuery = '';
let codesCategory = '';

async function loadCodes(page = 1) {
  codesPage = page;
  const container = document.getElementById('codes-results');
  const params = new URLSearchParams({ q: codesQuery, category: codesCategory, page, limit: 20 });

  try {
    const res = await fetch(API + '/api/codes?' + params);
    const data = await res.json();

    if (data.data.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">&#128270;</span><p>No se encontraron codigos</p></div>';
      document.getElementById('codes-pagination').innerHTML = '';
      return;
    }

    container.innerHTML = data.data.map(c => `
      <div class="code-card" data-code="${c.code}">
        <div class="code-card-header">
          <span class="code-badge">${c.code}</span>
          <span class="urgency-badge urgency-${c.urgencia || 'baja'}">${(c.urgencia || 'baja').toUpperCase()}</span>
        </div>
        <p>${c.titulo || c.description || ''}</p>
      </div>
    `).join('');

    container.querySelectorAll('.code-card').forEach(card => {
      card.addEventListener('click', () => showCodeDetail(card.dataset.code));
    });

    const totalPages = Math.ceil(data.total / 20);
    const pag = document.getElementById('codes-pagination');
    if (totalPages > 1) {
      let html = '';
      if (page > 1) html += `<button class="page-btn" onclick="loadCodes(${page - 1})">&laquo;</button>`;
      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadCodes(${i})">${i}</button>`;
      }
      if (page < totalPages) html += `<button class="page-btn" onclick="loadCodes(${page + 1})">&raquo;</button>`;
      pag.innerHTML = html;
    } else {
      pag.innerHTML = '';
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error al cargar codigos</p></div>';
  }
}

async function showCodeDetail(code) {
  showView('code-detail');
  document.getElementById('header-title').textContent = code;

  const container = document.getElementById('code-detail-content');
  container.innerHTML = '<div class="empty-state"><p>Cargando...</p></div>';

  try {
    const res = await fetch(API + '/api/codes/' + code);
    const c = await res.json();

    if (c.error) {
      container.innerHTML = '<div class="empty-state"><p>Codigo no encontrado</p></div>';
      return;
    }

    const causasHtml = (c.causas || []).map(causa => `<li>${typeof causa === 'object' ? (causa.label?.es || causa.label?.en || causa.label || causa.id || causa) : causa}</li>`).join('');
    const sintomasHtml = (c.sintomas || []).map(s => `<li>${typeof s === 'object' ? (s.es || s.en || s) : s}</li>`).join('');

    container.innerHTML = `
      <div class="code-detail-card">
        <div class="code-detail-header">
          <div>
            <div class="detail-code">${c.code}</div>
            <p style="color: var(--text-secondary); margin-top: 4px;">${c.category || c.code[0]}</p>
          </div>
          <span class="urgency-badge urgency-${c.urgencia || 'baja'}" style="font-size: 13px; padding: 4px 12px;">${(c.urgencia || 'baja').toUpperCase()}</span>
        </div>

        <div class="detail-section">
          <h4>Descripcion</h4>
          <p>${c.description || (c.title?.es || c.title?.en || 'Sin descripcion')}</p>
        </div>

        ${c.titulo ? `<div class="detail-section"><h4>Titulo</h4><p>${c.titulo}</p></div>` : ''}

        ${c.causas ? `
          <div class="detail-section">
            <h4>Causas comunes</h4>
            <ul>${causasHtml || '<li>No especificadas</li>'}</ul>
          </div>
        ` : ''}

        ${c.sintomas ? `
          <div class="detail-section">
            <h4>Sintomas</h4>
            <ul>${sintomasHtml || '<li>No especificados</li>'}</ul>
          </div>
        ` : ''}

        ${c.reparacion ? `
          <div class="detail-section">
            <h4>Recomendacion</h4>
            <p>${c.reparacion}</p>
          </div>
        ` : ''}

        <button class="detail-fav-btn" onclick="saveFavoriteCode('${c.code}', '${(c.titulo || c.description || '').replace(/'/g, "\\'")}')">
          &#11088; Guardar en favoritos
        </button>

        <button class="detail-fav-btn" style="margin-top: 8px; border-color: var(--primary); color: var(--primary);" onclick="askAIaboutCode('${c.code}')">
          &#128172; Preguntar a la IA sobre ${c.code}
        </button>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error al cargar el codigo</p></div>';
  }
}

async function saveFavoriteCode(code, description) {
  try {
    await apiFetch('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ type: 'code', content: description, code_ref: code })
    });
    alert('Codigo guardado en favoritos');
  } catch (e) {
    alert('Error al guardar');
  }
}

function askAIaboutCode(code) {
  showView('chat');
  sendMessage(`Dame informacion completa sobre el codigo OBD ${code}, incluyendo causas, sintomas y soluciones`);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('codes-search').addEventListener('input', (e) => {
    codesQuery = e.target.value;
    clearTimeout(window._codesTimer);
    window._codesTimer = setTimeout(() => loadCodes(), 300);
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      codesCategory = btn.dataset.cat;
      loadCodes();
    });
  });

  document.getElementById('back-to-codes').addEventListener('click', () => {
    showView('codes');
  });
});
