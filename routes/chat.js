const express = require('express');

const PROVIDERS = {
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.3-70b-instruct',
    keyEnv: 'NVIDIA_API_KEY'
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyEnv: 'GROQ_API_KEY'
  }
};

function getProvider() {
  const name = process.env.AI_PROVIDER || 'groq';
  const provider = PROVIDERS[name];
  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) {
    const fallback = name === 'nvidia' ? 'groq' : 'nvidia';
    const fbProvider = PROVIDERS[fallback];
    const fbKey = process.env[fbProvider.keyEnv];
    if (fbKey) {
      console.log(`Usando provider fallback: ${fallback}`);
      return { ...fbProvider, apiKey: fbKey };
    }
    console.error(`No hay API key configurada para ${name} ni fallback`);
    return null;
  }
  return { ...provider, apiKey };
}

function createChatRouter(db) {
  const router = express.Router();

  const SYSTEM_PROMPT = `Eres "Mecanico en el Bolsillo", un experto mecanico automotriz con 20 anhos de experiencia.
Resuelves problemas de vehiculos de manera clara y practica. Cuando un usuario mencione un codigo OBD (como P0300, P0420, etc.), proporciona:
1. Significado del codigo
2. Causas mas comunes
3. Sintomas que puede presentar el vehiculo
4. Nivel de urgencia (bajo/medio/alto/critico)
5. Soluciones recomendadas (desde la mas simple a la mas compleja)
6. Si es seguro seguir manejando o no

Responde en espanol, de forma amigable y tecnica pero comprensible para no expertos.
Cuando no tengas certeza, recomienda llevar el vehiculo a un mecanico certificado.
No inventes codigos OBD que no existen. Si no estas seguro de algo, di claramente que no tienes suficiente informacion.`;

    router.post('/', async (req, res) => {
    try {
      const { messages, chatId } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array requerido' });
      }

      const provider = getProvider();
      if (!provider) {
        return res.status(500).json({ error: 'No hay ningun servicio de IA configurado. Agrega una GROQ_API_KEY o NVIDIA_API_KEY en .env' });
      }

      let currentChatId = chatId;

      if (!currentChatId) {
        const firstUserMsg = messages.find(m => m.role === 'user');
        const titulo = firstUserMsg
          ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
          : 'Nueva conversacion';
        const chatResult = db.prepare(
          'INSERT INTO chats (user_id, titulo) VALUES (?, ?)'
        ).run(req.userId, titulo);
        currentChatId = chatResult.lastInsertRowid;

        for (const msg of messages) {
          db.prepare(
            'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)'
          ).run(currentChatId, msg.role, msg.content);
        }
      } else {
        const chat = db.prepare('SELECT id FROM chats WHERE id = ? AND user_id = ?').get(currentChatId, req.userId);
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
          db.prepare(
            'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)'
          ).run(currentChatId, 'user', lastMsg.content);
        }
      }

      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ];

      console.log(`IA request via ${provider.url} model=${provider.model}`);

      const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText.substring(0, 300));
        return res.status(502).json({ error: `Error de la IA (${response.status}): ${errorText.substring(0, 200)}` });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Chat-Id', currentChatId.toString());

      let fullContent = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                res.write(`data: ${JSON.stringify({ content, chatId: currentChatId })}\n\n`);
              }
            } catch (e) {}
          }
        }
      }

      if (fullContent) {
        db.prepare(
          'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)'
        ).run(currentChatId, 'assistant', fullContent);
        db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(currentChatId);
      }

      res.end();
    } catch (err) {
      console.error('Chat error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error del servidor' });
      }
    }
  });

  return router;
}

module.exports = createChatRouter;
