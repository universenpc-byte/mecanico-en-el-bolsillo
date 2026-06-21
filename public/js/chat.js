let currentChatId = null;
let chatHistory = [];
let isStreaming = false;

function resetChat() {
  currentChatId = null;
  chatHistory = [];
  document.getElementById('chat-messages').innerHTML = `
    <div class="welcome-msg">
      <div class="welcome-icon">&#129302;</div>
      <h3>Hola! Soy tu mecanico virtual</h3>
      <p>Preguntame sobre codigos OBD, problemas de tu vehiculo, o cualquier duda mecanica.</p>
      <div class="quick-questions">
        <button class="quick-q" data-q="Que significa el codigo P0300?">Que significa el codigo P0300?</button>
        <button class="quick-q" data-q="Mi motor vibra en ralenti, que puede ser?">Mi motor vibra en ralenti, que puede ser?</button>
        <button class="quick-q" data-q="Cada cuanto debo cambiar el aceite?">Cada cuanto debo cambiar el aceite?</button>
      </div>
    </div>
  `;
  bindQuickQuestions();
}

function addMessage(role, content) {
  const container = document.getElementById('chat-messages');
  const welcome = container.querySelector('.welcome-msg');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `message ${role}`;

  const avatar = role === 'user' ? '&#128100;' : '&#129302;';

  let actionsHtml = '';
  if (role === 'assistant') {
    actionsHtml = `
      <div class="message-actions">
        <button class="msg-action-btn fav-msg-btn" data-content="${encodeURIComponent(content)}">&#11088; Guardar</button>
      </div>
    `;
  }

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div>
      <div class="message-content">${formatMessage(content)}</div>
      ${actionsHtml}
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  div.querySelectorAll('.fav-msg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveFavoriteMessage(decodeURIComponent(btn.dataset.content));
    });
  });

  return div;
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'typing-msg';
  div.innerHTML = `
    <div class="message-avatar">&#129302;</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-msg');
  if (el) el.remove();
}

async function sendMessage(text) {
  if (isStreaming || !text.trim()) return;
  isStreaming = true;

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  chatHistory.push({ role: 'user', content: text.trim() });
  addMessage('user', text.trim());

  document.getElementById('chat-input').value = '';
  document.getElementById('chat-input').style.height = 'auto';

  showTyping();

  try {
    const res = await fetch(API + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory, chatId: currentChatId })
    });

    if (!res.ok) {
      removeTyping();
      addMessage('assistant', 'Lo siento, hubo un error al conectar con la IA. Verifica tu API key de NVIDIA en el archivo .env');
      isStreaming = false;
      sendBtn.disabled = false;
      return;
    }

    currentChatId = parseInt(res.headers.get('X-Chat-Id'));
    removeTyping();

    const assistantDiv = addMessage('assistant', '');
    const contentEl = assistantDiv.querySelector('.message-content');
    let fullContent = '';

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              contentEl.innerHTML = formatMessage(fullContent);
              document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
            }
          } catch (e) {}
        }
      }
    }

    chatHistory.push({ role: 'assistant', content: fullContent });

  } catch (err) {
    removeTyping();
    addMessage('assistant', 'Error de conexion. Verifica que el servidor este corriendo.');
  }

  isStreaming = false;
  sendBtn.disabled = false;
}

function bindQuickQuestions() {
  document.querySelectorAll('.quick-q').forEach(btn => {
    btn.addEventListener('click', () => {
      sendMessage(btn.dataset.q);
    });
  });
}

async function saveFavoriteMessage(content) {
  try {
    await apiFetch('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ type: 'message', content })
    });
    alert('Guardado en favoritos');
  } catch (e) {
    alert('Error al guardar');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });

  bindQuickQuestions();
});
