# AcessForge Backend — MVP 3.7.3

Backend Express para o plugin Figma. A IA pode usar OpenAI ou Ollama local, selecionados por `AI_PROVIDER` no `.env`.

## Requisitos
- Node.js 20 ou superior.
- Para OpenAI: chave de API e acesso à internet.
- Para Ollama: aplicativo Ollama instalado, serviço ativo e modelo baixado.

## Instalação
```bash
npm install
copy .env.example .env
```
Edite `backend/.env` (um nível acima deste README) e escolha `AI_PROVIDER=ollama` ou `AI_PROVIDER=openai`.

## Ollama (local)
```bash
ollama pull llama3.2:3b
```
Configuração:
```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT_MS=120000
```
Não precisa de chave OpenAI. Deixe o aplicativo Ollama aberto e inicie o backend.

## OpenAI
```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=sua_chave
OPENAI_MODEL=gpt-4o-mini
```
A API tem cobrança independente do ChatGPT. Nunca exponha a chave no plugin ou em repositório.

## Executar
```bash
npm start
```
Servidor padrão: `http://localhost:3001`.

## Rotas
- `GET /api/health` — estado do servidor.
- `POST /api/analyze` — análise determinística.
- `POST /api/validate` — validação determinística.
- `GET /api/ai/status` — provedor ativo, disponibilidade e modelo.
- `POST /api/ai/accessible-name` — sugestão de nome acessível.
- `POST /api/ai/alt-text` — sugestão de texto alternativo.
- `POST /api/ai/clarification` — explicação e solicitação de contexto.

## Limitações
O alt text é gerado com base no contexto textual, sem análise dos pixels. Revise as sugestões antes de aplicá-las.

## Login, equipes e funcionários (MVP 3.6)

Na primeira inicialização, o backend cria um administrador inicial usando `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env` (valores de demonstração no `.env.example`). Altere também `ADMIN_SESSION_SECRET` antes de disponibilizar o sistema.

O administrador pode criar equipes e cadastrar funcionários. Cada equipe recebe um código de acesso; o funcionário entra com e-mail, senha e código da equipe. Os dados são armazenados em `backend/data/accessforge.json`, localmente. Não há envio de convites nem recuperação automática de senha nesta versão.


## Autenticação e equipes

- `POST /api/auth/login`: login de administrador ou funcionário.
- `POST /api/auth/register`: cadastro de funcionário com código de equipe ou de administrador com `ADMIN_REGISTRATION_CODE`; retorna a sessão após a criação.
- `GET /api/auth/session`: consulta a sessão autenticada.
- `GET /api/auth/teams` e `POST /api/auth/teams`: listar/criar equipes (administrador).
- `GET /api/auth/users` e `POST /api/auth/users`: listar/cadastrar funcionários (administrador).
- `PATCH /api/auth/users/:id/status`: ativar/desativar funcionário (administrador).

Funcionários entram com e-mail, senha e `teamCode`. Cada equipe recebe um código gerado automaticamente. As senhas são armazenadas com scrypt; sessões usam token assinado por HMAC. Os dados ficam em `backend/data/accessforge.json`.


### Criar conta pelo plugin
Na tela inicial, clique em **Criar uma conta** e escolha Funcionário ou Administrador. O funcionário informa nome, e-mail, senha e código de equipe; a conta é associada à equipe automaticamente. O administrador informa nome, e-mail, senha e o segredo privado `ADMIN_REGISTRATION_CODE`. O endpoint valida esse segredo no backend antes de conceder o perfil administrativo.


## Cadastro de administrador

Para habilitar a opção **Criar conta → Administrador** no plugin, defina no `backend/.env` um segredo privado em `ADMIN_REGISTRATION_CODE` com pelo menos 16 caracteres. Não use o valor de exemplo do repositório, não compartilhe esse código e não o inclua no plugin. Sem essa configuração, a API rejeita o cadastro administrativo. O cadastro de funcionário continua usando o código de equipe.
