const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';

function provider() {
  const value = (process.env.AI_PROVIDER || 'openai').trim().toLowerCase();
  return value === 'ollama' ? 'ollama' : 'openai';
}

function providerError(message, status = 503, code = 'AI_PROVIDER_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function askOpenAI({ system, user, temperature = 0.2 }) {
  if (!process.env.OPENAI_API_KEY) {
    throw providerError('OpenAI não configurada. Adicione OPENAI_API_KEY ao arquivo backend/.env ou selecione AI_PROVIDER=ollama.', 503, 'AI_NOT_CONFIGURED');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw providerError(data?.error?.message || `OpenAI respondeu com HTTP ${response.status}.`, response.status === 401 ? 502 : response.status);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw providerError('A IA retornou uma resposta vazia.', 502, 'AI_EMPTY_RESPONSE');
    return content.trim();
  } catch (error) {
    if (error?.name === 'AbortError') throw providerError('A solicitação à OpenAI excedeu 45 segundos. Tente novamente.', 504, 'AI_TIMEOUT');
    throw error;
  } finally { clearTimeout(timeout); }
}

async function askOllama({ system, user, temperature = 0.2 }) {
  const base = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OLLAMA_TIMEOUT_MS || 120000));
  try {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], options: { temperature } }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error || `Ollama respondeu com HTTP ${response.status}.`;
      if (response.status === 404) throw providerError(`Modelo "${model}" não encontrado no Ollama. Execute: ollama pull ${model}`, 503, 'OLLAMA_MODEL_MISSING');
      throw providerError(detail, response.status);
    }
    const content = data?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw providerError('O Ollama retornou uma resposta vazia.', 502, 'AI_EMPTY_RESPONSE');
    return content.trim();
  } catch (error) {
    if (error?.name === 'AbortError') throw providerError('O modelo local demorou mais que o limite configurado. Tente novamente ou use um modelo menor.', 504, 'OLLAMA_TIMEOUT');
    if (error?.cause?.code === 'ECONNREFUSED' || /fetch failed/i.test(error?.message || '')) {
      throw providerError('Não foi possível conectar ao Ollama. Abra o Ollama e confirme se ele está ativo em http://localhost:11434.', 503, 'OLLAMA_UNAVAILABLE');
    }
    throw error;
  } finally { clearTimeout(timeout); }
}

async function askAI(options) {
  return provider() === 'ollama' ? askOllama(options) : askOpenAI(options);
}

export async function getAIStatus() {
  const selected = provider();
  if (selected === 'openai') {
    const configured = Boolean(process.env.OPENAI_API_KEY);
    return { available: configured, mode: 'openai', provider: 'OpenAI', model: process.env.OPENAI_MODEL || 'gpt-4o-mini', message: configured ? 'OpenAI configurada.' : 'Configure OPENAI_API_KEY ou selecione AI_PROVIDER=ollama no backend/.env.' };
  }
  const base = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  try {
    const response = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    const installed = models.some(item => item.name === model || item.name?.split(':')[0] === model.split(':')[0] && !model.includes(':'));
    return { available: installed, mode: 'ollama', provider: 'Ollama', model, installed, message: installed ? 'Ollama conectado e modelo instalado.' : `Ollama conectado, mas o modelo ${model} não foi encontrado. Execute: ollama pull ${model}` };
  } catch (_) {
    return { available: false, mode: 'ollama', provider: 'Ollama', model, installed: false, message: `Ollama não encontrado em ${base}. Abra o Ollama e execute: ollama pull ${model}` };
  }
}

export async function generateAccessibleName(input) {
  const answer = await askAI({
    system: 'Você é especialista em acessibilidade digital. Sugira um nome acessível curto, específico e em português do Brasil para um controle de interface. Não invente ações que não estejam no contexto. Responda somente com o nome sugerido, sem aspas e sem explicações. Se não houver contexto suficiente, responda exatamente: PRECISA_DE_CONTEXTO.',
    user: JSON.stringify({ layerName: input.nodeName, nodeType: input.nodeType, visibleText: input.visibleText || '', context: input.context || '' })
  });
  if (answer === 'PRECISA_DE_CONTEXTO.') return { needsClarification: true, value: '', explanation: 'A IA precisa saber qual ação esse controle executa antes de sugerir um nome confiável.' };
  return { needsClarification: false, value: answer.slice(0, 180), explanation: `Sugestão gerada por ${provider() === 'ollama' ? 'IA local (Ollama)' : 'OpenAI'}, a partir do contexto textual. Revise antes de aplicar.` };
}

export async function generateAltText(input) {
  const answer = await askAI({
    system: 'Você auxilia a escrever texto alternativo acessível em português do Brasil. Use apenas informações fornecidas; não presuma conteúdo visual que você não viu. Se houver apenas o nome da camada sem descrição do que a imagem mostra, responda exatamente: PRECISA_DE_CONTEXTO. Se houver contexto suficiente, escreva uma frase concisa descrevendo a informação relevante, sem começar com “imagem de” ou “foto de”, salvo quando isso for relevante. Responda somente com o texto alternativo.',
    user: JSON.stringify({ layerName: input.nodeName, context: input.context || '', intendedPurpose: input.intendedPurpose || '' })
  });
  if (answer === 'PRECISA_DE_CONTEXTO.') return { needsClarification: true, value: '', explanation: 'O nome da camada não revela o conteúdo visual. Descreva o que aparece na imagem e sua finalidade.' };
  return { needsClarification: false, value: answer.slice(0, 400), explanation: `A sugestão foi gerada por ${provider() === 'ollama' ? 'IA local (Ollama)' : 'OpenAI'} usando somente o contexto textual enviado; a IA não analisou os pixels da imagem. Revise antes de aplicar.` };
}

export async function clarifyIssue(input) {
  const answer = await askAI({
    system: 'Você é um especialista em acessibilidade digital ajudando uma pessoa designer. Explique o problema de forma simples e faça até duas perguntas objetivas se faltar contexto. Não afirme que verificou algo que não foi fornecido. Responda em português do Brasil.',
    user: JSON.stringify({ issueCode: input.issueCode, issueTitle: input.issueTitle, issueDescription: input.issueDescription, nodeName: input.nodeName, nodeType: input.nodeType, context: input.context || '' })
  });
  return { explanation: answer.slice(0, 1800) };
}
