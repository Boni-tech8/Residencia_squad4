# AcessForge — Assistente IA integrado (MVP 3.7.3)

## O que foi acrescentado

- Nova aba **Assistente IA** na interface do plugin.
- Chat independente para dúvidas sobre acessibilidade, WCAG, design inclusivo e handoff.
- Modo contextual opcional que envia informações textuais limitadas do elemento atualmente selecionado.
- Histórico de conversa mantido na sessão atual do plugin; o botão **Limpar conversa** apaga o histórico local da interface.
- Indicador de conexão com o provedor configurado.
- Rota `POST /api/ai/chat`, protegida por sessão autenticada.
- Teste automatizado da comunicação do serviço de chat com um endpoint Ollama simulado.

## Como iniciar

1. Abra o aplicativo Ollama e confirme que o modelo configurado está instalado.
2. Em `backend/.env`, confira:
   ```dotenv
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3.2:3b
   OLLAMA_TIMEOUT_MS=120000
   ```
   Para usar OpenAI, configure `AI_PROVIDER=openai`, `OPENAI_API_KEY` e `OPENAI_MODEL`.
3. No terminal do VS Code:
   ```powershell
   cd backend
   npm install
   npm start
   ```
4. Em outro terminal:
   ```powershell
   cd plugin
   npm install
   npm run build
   ```
5. No Figma Desktop, importe `plugin/dist/manifest.json`, abra o AcessForge e entre na sua conta.
6. Selecione a aba **Assistente IA**.

## Modo contextual e privacidade

A opção **Usar contexto da seleção atual** vem habilitada por padrão. Quando ativada, o plugin envia ao backend apenas:

- ID do elemento selecionado;
- nome e tipo;
- largura e altura;
- trechos de texto de camadas descendentes (limitados);
- metadata AcessForge de nome acessível, alt text e role.

O plugin não envia imagens, pixels, screenshots, páginas completas ou o documento inteiro. Desmarque a opção para usar o chat sem contexto do arquivo.

O contexto é atualizado quando a seleção do Figma muda. O assistente não tem acesso direto à API de edição do documento e não aplica alterações. Qualquer mudança continua exigindo uma ação explícita do usuário no plugin.

## API

`POST /api/ai/chat` (autenticação obrigatória)

Exemplo de corpo:
```json
{
  "message": "Como posso melhorar a acessibilidade deste botão?",
  "history": [
    { "role": "user", "content": "Estou revisando um formulário." }
  ],
  "context": {
    "name": "Enviar",
    "type": "INSTANCE",
    "width": 120,
    "height": 40
  }
}
```

A mensagem atual aceita até 3.000 caracteres. O backend considera no máximo 10 mensagens anteriores e limita o contexto enviado. A rota usa o provedor configurado em `AI_PROVIDER`.

## Testes e limitações

- `cd backend && npm test`: 8 testes automatizados.
- Sintaxe dos arquivos JavaScript do backend e do script da interface verificada.
- A compilação completa do plugin deve ser executada localmente com `npm ci`/`npm install` e `npm run build`; não foi possível concluí-la neste ambiente porque a instalação das dependências do plugin excedeu o tempo disponível.
- A integração real com Ollama e a execução dentro do Figma ainda precisam ser testadas no computador de desenvolvimento.
- O modelo recebe somente contexto textual; não interpreta visualmente a imagem selecionada.
