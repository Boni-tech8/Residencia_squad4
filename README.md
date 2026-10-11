# AcessForge — MVP 2.5 Integrado

**Copiloto de Handoff de Acessibilidade — Figma → Desenvolvimento**

Esta versão integra o plugin real do Figma ao backend local do AcessForge.

## O que foi implementado

- Plugin Figma real preservado a partir do MVP 1 funcional.
- Backend Express separado e funcional.
- Comunicação `Figma Plugin → Backend` via HTTP.
- Endpoint `POST /api/analyze` integrado ao fluxo de análise.
- Serialização da seleção do Figma para o formato consumido pelo backend.
- Cálculo de contraste no plugin antes do envio ao backend.
- Retorno das ocorrências do backend para a interface do plugin.
- Indicador de backend `ONLINE`, `VERIFICANDO` ou `FALLBACK`.
- Timeout de 2,5 segundos para não bloquear o fluxo.
- Fallback automático para a análise determinística local.
- Reanálise após correções.
- Manifest configurado para permitir `http://localhost:3001` durante desenvolvimento.
- Estrutura preparada para integração de IA na próxima etapa.

## Estrutura

```text
AcessForge-MVP2.5-Integrado/
├── plugin/
│   ├── src/
│   │   ├── accessibility/
│   │   ├── backend/
│   │   │   └── client.ts
│   │   ├── types/
│   │   ├── code.ts
│   │   ├── ui.html
│   │   └── ui.css
│   ├── manifest.json
│   ├── package.json
│   ├── build.mjs
│   └── README.md
└── backend/
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── services/
    │   └── server.js
    ├── package.json
    ├── .env.example
    └── README.md
```

## Como executar

### 1. Backend

Terminal 1:

```bash
cd backend
npm install
npm start
```

Servidor:

```text
http://localhost:3001
```

Teste:

```text
http://localhost:3001/api/health
```

### 2. Plugin

Terminal 2:

```bash
cd plugin
npm install
npm run build
```

Depois, no Figma Desktop, importe:

```text
plugin/dist/manifest.json
```

### 3. Demonstração

1. Deixe o backend rodando.
2. Abra um arquivo no Figma.
3. Selecione um frame, componente ou elemento.
4. Execute o AcessForge.
5. O plugin primeiro calcula a análise local e tenta consultar o backend.
6. Se a consulta funcionar, a interface indica `ONLINE`.
7. Se o backend estiver desligado ou indisponível, a interface indica `FALLBACK` e continua usando a análise local.

## Regras atuais

- `V-01` — contraste insuficiente para texto normal abaixo de 4.5:1.
- `V-02` — controle sem nome acessível.
- `V-03` — imagem sem texto alternativo.

## Próxima etapa

A IA ainda não está conectada nesta versão. O backend possui o endpoint `/api/ai/status` indicando que a camada de IA está preparada para a próxima etapa.

A próxima evolução é integrar as histórias de IA já definidas no projeto, mantendo a regra de que a IA apoia decisões sem substituir validações determinísticas e que alterações sugeridas passam por revalidação.
