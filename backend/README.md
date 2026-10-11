# AcessForge — Backend MVP 2

Backend inicial funcional para a próxima etapa do AcessForge.

## Funcionalidades
- Node.js + Express
- endpoint de saúde
- análise determinística de acessibilidade
- validação
- estrutura preparada para IA

Regras: V-01 contraste < 4.5; V-02 controle sem nome acessível; V-03 imagem sem alt text.

## Instalação
Node.js 20+ recomendado.

```bash
npm install
npm start
```

Servidor: http://localhost:3001

Teste: abra http://localhost:3001/api/health

### POST /api/analyze
```json
{"nodes":[{"id":"1","name":"Botão","type":"BUTTON"},{"id":"2","name":"Imagem","type":"IMAGE"},{"id":"3","name":"Texto","type":"TEXT","contrastRatio":3.2}]}
```

### POST /api/validate
Recebe o mesmo formato e retorna valid=true/false;

### GET /api/ai/status
Indica que a IA ainda não está conectada nesta versão.

## Próxima evolução
Conectar o plugin Figma aos endpoints, adicionar persistência e integrar IA pelo backend.
