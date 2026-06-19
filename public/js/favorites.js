async function loadFavorites() {
  const container = document.getElementById('favorites-container');
  const empty = document.getElementById('no-favorites');

  try {
    const res = await apiFetch('/api/favorites');
    const favs = await res.json();

    if (!favs.length) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    container.innerHTML = favs.map(f => `
      <div class="fav-item" data-id="${f.id}">
        <div class="fav-item-header">
          <span class="fav-type">${f.type === 'code' ? '&#128196; Codigo' : '&#128172; Mensaje'}</span>
          <button class="delete-btn" data-id="${f.id}" title="Eliminar">&times;</button>
        </div>
        ${f.code_ref ? `<p style="color: var(--primary-light); font-weight: 600; margin-bottom: 4px;">${f.code_ref}</p>` : ''}
        <p>${f.content.substring(0, 100)}${f.content.length > 100 ? '...' : ''}</p>
      </div>
    `).join('');

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Eliminar este favorito?')) return;
        try {
          await apiFetch('/api/favorites/' + btn.dataset.id, { method: 'DELETE' });
          loadFavorites();
        } catch (err) {
          alert('Error al eliminar');
        }
      });
    });

    container.querySelectorAll('.fav-item').forEach(item => {
      item.addEventListener('click', () => {
        const codeRef = item.querySelector('.fav-type').textContent.includes('Codigo');
        if (codeRef) {
          const codeEl = item.querySelector('p[style]');
          if (codeEl) showCodeDetail(codeEl.textContent);
        }
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error al cargar favoritos</p></div>';
  }
}
