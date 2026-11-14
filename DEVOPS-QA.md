# AcessForge — Plano de entrega DevOps / QA

## 1. Escopo e compatibilidade
O repositório entregue é um monorepo com backend Node.js 20+ (Express, ES Modules) e plugin Figma (TypeScript + esbuild). Não contém aplicação Java, `pom.xml`, Angular, Spring Boot, nem dependência MockMvc. Portanto, os requisitos JDK 21/Maven/MockMvc do cronograma original não podem ser aplicados honestamente a este código. A pipeline abaixo valida a stack existente. Se a auditoria exigir Java/Spring, será necessário receber o módulo Java correspondente.

## 2. Governança GitFlow
- `main`: versão estável; somente merge por Pull Request.
- `develop`: integração contínua; PRs de features entram aqui.
- `feature/<issue-id>-<slug>`: desenvolvimento de uma issue.
- `fix/<issue-id>-<slug>`: correções.
- PR obrigatório, revisão por pares e CI verde antes do merge.
- Proteger `main` e `develop` nas configurações do GitHub: exigir PR, pelo menos 1 aprovação, resolução de conversas e status checks `Backend • Node.js 20` e `Plugin Figma • build`.

Comandos iniciais (após criar o repositório remoto):
```bash
git switch -c develop
git push -u origin develop
git switch -c feature/15-ci-pipeline
```
A proteção de branches é uma configuração remota do GitHub e não pode ser ativada por arquivos locais.

## 3. Integração contínua
`.github/workflows/ci.yml` executa em push e Pull Request para `main`/`develop`:
- instalação reproduzível com `npm ci`;
- suíte automatizada do backend (`npm test`);
- build do plugin (`npm run build`).

## 4. Testes implementados
`backend/test/accessibility.test.js` cobre sete cenários: V-01 contraste, V-02 nome acessível, V-03 texto alternativo, percurso de nós aninhados, imagem decorativa, validação de entrada inválida e resposta válida do controller.

Executar:
```bash
cd backend
npm ci
npm test
```

## 5. Docker
`backend/Dockerfile` usa estágio de dependências e imagem runtime Node 20 Alpine, usuário sem privilégios, healthcheck e diretório persistente. `compose.yaml` publica a porta 3001 e persiste `backend/data` em volume nomeado.

```bash
cp .env.example .env   # na raiz, crie um .env próprio com as variáveis exigidas pelo compose
# Configure ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_SESSION_SECRET (segredo forte)
docker compose up --build -d
docker compose ps
curl http://localhost:3001/api/health
docker compose logs -f backend
```
O `.env` real nunca deve ser versionado. Para Ollama no host, o compose usa `host.docker.internal`; ajuste a URL conforme o sistema operacional e a rede local.

## 6. SonarQube
`sonar-project.properties` define chave do projeto, fontes, testes e exclusões. A análise exige servidor SonarQube/SonarCloud e token configurado como segredo `SONAR_TOKEN` no GitHub. O repositório atual não possui instrumentação de cobertura LCOV; não se deve declarar cobertura JaCoCo, que é específica do ecossistema Java. Configure a análise no servidor e defina o Quality Gate desejado antes de torná-lo status check obrigatório.

## 7. Evidências verificadas neste ambiente
- Backend: `npm test` — 7 testes executados, 7 aprovados, 0 falhas.
- Plugin: build tentado; não concluído porque o `node_modules` fornecido contém binário esbuild de Windows, incompatível com Linux. `npm ci` foi iniciado para corrigir a instalação multiplataforma, mas excedeu o limite de execução deste ambiente. A pipeline GitHub executará instalação limpa em Ubuntu.
- Docker Compose: arquivos criados; execução de container não foi certificada neste ambiente.
- GitHub Actions, proteção de branches, SonarQube e Quality Gate: dependem de publicação do repositório e configuração de credenciais/serviços externos; não são declarados como concluídos.

## 8. Publicação
Após pipeline verde, revisar PR, integrar `develop` em `main`, criar tag anotada e publicar:
```bash
git switch main
git pull --ff-only
git tag -a v0.1.0-alpha -m "AcessForge v0.1.0-alpha"
git push origin v0.1.0-alpha
```
A tag não deve ser criada antes de os checks reais estarem verdes.

## 9. Segurança antes do envio
O ZIP original continha `backend/.env`. O arquivo foi excluído do pacote de entrega; mantenha apenas `.env.example`. Como o `.env` real foi compartilhado no upload, revogue/rotacione imediatamente qualquer chave de API, senha administrativa, segredo de sessão ou código de cadastro que estivesse nele. Não reutilize credenciais expostas.
