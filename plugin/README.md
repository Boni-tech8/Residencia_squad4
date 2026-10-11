# AcessForge — MVP 2.5 Integrado

Plugin real do Figma com validação local e integração com o backend AcessForge.

## O que esta versão adiciona

- Leitura real da seleção no Figma.
- Análise determinística local como fallback.
- Serialização da árvore selecionada para envio ao backend.
- Integração HTTP com `POST /api/analyze`.
- Indicador visual de backend online/offline.
- Timeout de 2,5 segundos para evitar bloquear o fluxo do designer.
- Fallback automático para a análise local quando o backend estiver indisponível.
- Reanálise após correções feitas no Figma.
- Preparação da arquitetura para a próxima etapa de IA.

## Estrutura

```text
AcessForge-MVP2.5/
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
    ├── package.json
    ├── .env.example
    └── README.md
```

## 1. Iniciar o backend

Abra um terminal na pasta `backend`:

```bash
npm install
npm start
```

O servidor ficará em:

`http://localhost:3001`

Teste:

`GET http://localhost:3001/api/health`

## 2. Compilar o plugin

Abra outro terminal na pasta `plugin`:

```bash
npm install
npm run build
```

O build será criado em `plugin/dist/`.

## 3. Importar no Figma

No Figma Desktop, importe o arquivo:

```text
plugin/dist/manifest.json
```

O manifest desta versão usa `devAllowedDomains` para permitir o servidor local `http://localhost:3001` durante o desenvolvimento.

## 4. Fluxo da integração

```text
Seleção no Figma
      ↓
Analisador local
      ↓
Serialização da seleção
      ↓
POST /api/analyze
      ↓
Backend
      ↓
Resultado
      ↓
Plugin
```

Se o backend não responder dentro do timeout, o plugin mantém o resultado da análise local e informa `FALLBACK` na interface.

## Observação

A IA ainda não está conectada nesta versão. O endpoint `/api/ai/status` continua preparado para a próxima etapa.
