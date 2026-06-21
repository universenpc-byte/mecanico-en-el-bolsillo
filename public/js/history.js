async function loadHistory() {
  const container = document.getElementById('history-container');
  const empty = document.getElementById('no-history');

  try {
    const res = await apiFetch('/api/history');
    const chats = await res.json();

    if (!chats.length) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    container.innerHTML = chats.map(c => `
      <div class="history-item" data-id="${c.id}">
        <div class="history-item-header">
          <span style="font-weight: 500;">${c.titulo}</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="history-date">${formatDate(c.updated_at)}</span>
            <button class="delete-btn" data-id="${c.id}" title="Eliminar chat">&times;</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Eliminar esta conversacion?')) return;
        try {
          await apiFetch('/api/history/' + btn.dataset.id, { method: 'DELETE' });
          loadHistory();
        } catch (err) {
          alert('Error al eliminar');
        }
      });
    });

    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', async () => {
        try {
          const res = await apiFetch('/api/history/' + item.dataset.id);
          const chat = await res.json();
          currentChatId = chat.id;
          chatHistory = chat.messages.map(m => ({ role: m.role, content: m.content }));

          document.getElementById('chat-messages').innerHTML = '';
          chat.messages.forEach(m => addMessage(m.role, m.content));

          showView('chat');
          document.getElementById('header-title').textContent = chat.titulo;
        } catch (e) {
          alert('Error al cargar el chat');
        }
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Error al cargar historial</p></div>';
  }
}
