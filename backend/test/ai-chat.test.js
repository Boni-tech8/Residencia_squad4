import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chatWithAI } from '../src/services/ai.service.js';
import { chatController } from '../src/controllers/ai.controller.js';

test('chat integrado consulta o provedor Ollama e retorna resposta', async () => {
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(req.url, '/api/chat');
    assert.equal(payload.model, 'test-model:latest');
    assert.equal(payload.stream, false);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: { content: 'Resposta simulada do assistente.' } }));
  });

  const previous = {
    provider: process.env.AI_PROVIDER,
    base: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL
  };

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  try {
    process.env.AI_PROVIDER = 'ollama';
    process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${address.port}`;
    process.env.OLLAMA_MODEL = 'test-model:latest';

    const result = await chatWithAI({
      message: 'Como melhorar a acessibilidade deste botão?',
      history: [{ role: 'user', content: 'Estou revisando um formulário.' }],
      context: { name: 'Enviar', type: 'INSTANCE' }
    });

    assert.equal(result.answer, 'Resposta simulada do assistente.');
    assert.equal(result.provider, 'ollama');
  } finally {
    for (const [key, value] of Object.entries({
      AI_PROVIDER: previous.provider,
      OLLAMA_BASE_URL: previous.base,
      OLLAMA_MODEL: previous.model
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    server.close();
  }
});


test('chat rejeita mensagens vazias ou acima do limite', async () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await chatController({ body: { message: '   ' } }, response, error => { throw error; });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'INVALID_INPUT');
});
