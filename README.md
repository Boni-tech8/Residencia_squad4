# AcessForge — Residência Squad 4 · main v.2

> Residência do Porto Digital, Squad 4 (main v.2) — Faculdade SENAC 2026.2

**Versão atual: MVP 3.7.3** (cadastro de administrador e metadata de acessibilidade)

**Copiloto de Handoff de Acessibilidade — Figma → Desenvolvimento**

Esta versão mantém as análises determinísticas do plugin e permite escolher o provedor de IA no backend: OpenAI (nuvem, com chave de API) ou Ollama (modelo executado localmente, sem chave e sem cobrança por requisição).

## O que foi implementado

- Plugin Figma real e backend Express separados.
- Análise determinística e fallback local preservados.
- Sugestões de nomes acessíveis (V-02) e textos alternativos (V-03).
- Revisão humana obrigatória antes de aplicar sugestões.
- Seleção do provedor por configuração no arquivo `backend/.env` (`AI_PROVIDER=openai` ou `AI_PROVIDER=ollama`).
- OpenAI Chat Completions e Ollama Chat API integrados pelo mesmo serviço.
- Verificação de status do provedor, disponibilidade local e presença do modelo Ollama.
- Mensagens de erro para Ollama desligado, modelo ausente e tempo limite.
- Chaves da OpenAI permanecem somente no backend.

## Estrutura

```text
Residencia_squad4-main_v.2/
├── plugin/            # Plugin do Figma (TypeScript)
│   ├── src/
│   ├── manifest.json
│   └── package.json
├── backend/           # API Express (autenticação, equipes, análise e IA)
│   ├── src/
│   ├── .env.example
│   └── package.json
├── docs/              # Imagens da documentação
├── CHANGELOG-MVP3.5.md
└── CHANGELOG-MVP3.7.3.md
```

## Instalação comum

Requisitos: Windows 10/11 ou sistema compatível, Node.js 20 ou superior e Figma Desktop.

1. Extraia o ZIP e abra a pasta no VS Code.
2. No terminal, configure o backend:

```bash
cd backend
npm install
copy .env.example .env   # Linux/macOS: cp .env.example .env
```

3. Escolha o provedor editando `backend/.env` (veja abaixo).
4. Inicie o backend e mantenha o terminal aberto:

```bash
npm start
```

5. Em outro terminal, compile o plugin:

```bash
cd plugin
npm install
npm run build
```

6. No Figma Desktop, abra um arquivo de Design e importe `plugin/dist/manifest.json` pelo menu de desenvolvimento de plugins.
7. Execute o AcessForge. O cartão de backend/IA informa o estado da conexão.

## Opção A — Ollama local (sem chave de API)

1. Instale o Ollama: https://ollama.com/download
2. Abra o Ollama no Windows e aguarde o serviço iniciar.
3. No terminal, baixe o modelo recomendado:

```bash
ollama pull llama3.2:3b
```

4. No arquivo `backend/.env`, deixe:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT_MS=120000
```

5. Não é necessário preencher `OPENAI_API_KEY`.
6. Inicie/reinicie o backend com `npm start`. O indicador do plugin deverá mostrar `Ollama ativo · llama3.2:3b` quando o serviço estiver acessível e o modelo instalado.

Para testar o Ollama antes de abrir o plugin:

```bash
ollama run llama3.2:3b
```

O primeiro download exige internet. Depois, a geração pode funcionar sem internet, desde que o Ollama esteja em execução e o modelo esteja instalado. A velocidade depende do hardware; em computadores sem GPU dedicada, as respostas podem demorar. Feche o chat de teste com `/bye`.

## Opção B — OpenAI (nuvem)

No arquivo `backend/.env`, configure:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=sua_chave_real
OPENAI_MODEL=gpt-4o-mini
```

Crie a chave em https://platform.openai.com/api-keys. A API é cobrada separadamente da assinatura do ChatGPT. Nunca coloque a chave no código do plugin, não compartilhe o `.env` e não envie esse arquivo a repositórios públicos.

Reinicie o backend depois de alterar o `.env`.


## Login, equipes e perfis (MVP 3.7)

Ao iniciar o backend pela primeira vez, o AcessForge cria um acesso administrativo de demonstração:
- **E-mail:** `admin@acessforge.local`
- **Senha:** `AcessForge@2026`

O administrador entra pela opção **Administrador**. Em **Equipes**, pode criar equipes; o backend gera um código de acesso para cada uma. Em seguida, pode cadastrar funcionários vinculando cada conta a uma equipe. O código da equipe deve ser compartilhado com os funcionários daquela equipe.

O funcionário escolhe **Funcionário** na tela de login e informa e-mail, senha e código da equipe. Também pode selecionar **Criar conta** na própria tela de login: informa nome, e-mail, senha e o código de acesso fornecido pelo administrador. A conta é vinculada automaticamente à equipe correspondente e o funcionário já entra no plugin. E-mails já cadastrados são recusados.

O cadastro de funcionário exige código de equipe válido. O cadastro de administrador só é aceito quando `ADMIN_REGISTRATION_CODE` está configurado com pelo menos 16 caracteres no backend e o usuário informa esse código. Não coloque esse segredo no plugin, em repositórios públicos ou em mensagens compartilhadas. Depois de entrar, o funcionário pode usar a análise de acessibilidade e consultar somente os dados da própria equipe. Não tem acesso à criação de equipes nem ao cadastro/gerenciamento de outros usuários.

Os cadastros são armazenados localmente em `backend/data/accessforge.json`. Essa pasta é criada automaticamente. Faça backup desse arquivo se precisar preservar os cadastros entre instalações.

**Antes de usar fora de uma demonstração local:** altere `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` no `backend/.env`. O acesso inicial é criado apenas quando ainda não existe um administrador no arquivo de dados.

## Uso

1. Mantenha o backend e, se selecionado, o Ollama em execução.
2. Abra um arquivo Figma Design e execute o AcessForge.
3. Selecione um elemento e analise a seleção.
4. Em ocorrência V-02, use `Sugerir nome com IA`; em V-03, use `Sugerir alt text com IA`.
5. Revise o resultado e clique em `Aplicar sugestão` apenas se estiver correto.

## Regras determinísticas disponíveis

- V-01 — contraste insuficiente para texto normal abaixo de 4.5:1.
- V-02 — controle sem nome acessível.
- V-03 — imagem sem texto alternativo.

As regras determinísticas não dependem do provedor de IA. Se o backend ou a IA estiverem indisponíveis, a análise local do plugin continua disponível.

## Limitações conhecidas

- O Ollama precisa estar instalado e executando no computador que utiliza o plugin; cada usuário baixa seu próprio modelo.
- Modelos locais menores podem responder mais lentamente ou com qualidade diferente da OpenAI. O modelo `llama3.2:3b` é um ponto de partida, não uma garantia de desempenho em todo hardware.
- A geração de alt text usa o nome da camada e o contexto textual fornecido. Ela não inspeciona os pixels da imagem; quando faltar contexto, deve solicitar esclarecimentos.
- As sugestões precisam de revisão humana. Metadados são armazenados como plugin data para handoff, não aplicados como atributos ARIA em uma interface publicada.
- A rota de esclarecimento existe no backend, mas ainda não possui um fluxo próprio de interface nesta versão.

## Solução de problemas

- `Ollama não encontrado`: abra o aplicativo Ollama e verifique `http://localhost:11434`.
- `Modelo não encontrado`: execute `ollama pull llama3.2:3b` ou ajuste `OLLAMA_MODEL` para o modelo instalado.
- `IA indisponível`: confira `AI_PROVIDER`, reinicie o backend e atualize o status do plugin reabrindo-o.
- `Backend indisponível`: confirme que `npm start` está rodando na porta 3001.
- Erro de compilação: execute `npm install` e `npm run build` dentro da pasta `plugin`.


## Acesso, equipes e funcionários (MVP 3.6)

Na primeira inicialização do backend, uma conta administrativa local é criada:
- E-mail: `admin@acessforge.local`
- Senha: `AcessForge@2026`

Altere esses valores e `ADMIN_SESSION_SECRET` no `backend/.env` antes de usar fora de um ambiente de demonstração. O administrador entra pelo login comum, cria equipes e cadastra funcionários com e-mail e senha. Cada equipe recebe um código próprio; o funcionário utiliza e-mail, senha e código para entrar.

Os cadastros são armazenados localmente em `backend/data/accessforge.json`. O backend deve permanecer em execução para autenticação e gestão. Esta entrega não envia convites por e-mail nem oferece recuperação automática de senha.


## MVP 3.7.1 — correção do login no Figma
Inclui fallback para armazenamento local indisponível no iframe e permissão explícita para o backend de desenvolvimento em `http://localhost:3001`.


## MVP 3.7.3 — cadastro administrativo e metadata de acessibilidade

- Cadastro de administrador habilitado por segredo privado `ADMIN_REGISTRATION_CODE` no `backend/.env` (mínimo de 16 caracteres).
- Editor de nome acessível, texto alternativo e role semântico no painel Metadata de Acessibilidade.
- Metadata gravada no elemento selecionado do Figma via `setPluginData`, podendo ser recuperada ao selecionar o elemento novamente.
- Análise do backend percorre elementos filhos e netos e não substitui ocorrências locais.

## MVP 3.7.2 — criação de conta pelo login

Adicionou o fluxo inicial de cadastro de funcionário. A versão 3.7.3 amplia o fluxo para administradores e inclui o editor de metadata descrito acima.


## Histórico de evolução

| Versão | Principais entregas |
|---|---|
| MVP 2.5 | Plugin integrado ao backend local, regras V-01/V-02/V-03, fallback local |
| MVP 3.5 | IA com OpenAI ou Ollama (local), revisão humana das sugestões |
| MVP 3.6 | Login, equipes e cadastro de funcionários pelo administrador |
| MVP 3.7 | Tela de login redesenhada (Administrador / Funcionário) |
| MVP 3.7.1 | Correção do login no Figma (fallback sem `localStorage`, manifest com `localhost:3001`) |
| MVP 3.7.2 | Criar conta pelo login (funcionário) |
| MVP 3.7.3 | Criar conta de administrador (`ADMIN_REGISTRATION_CODE`) e editor de metadata |

Detalhes em [`CHANGELOG-MVP3.5.md`](CHANGELOG-MVP3.5.md) e [`CHANGELOG-MVP3.7.3.md`](CHANGELOG-MVP3.7.3.md).

## Segurança antes de publicar

- `backend/.env` e `backend/data/` **não** são versionados (estão no `.gitignore`). Copie `backend/.env.example` para `backend/.env` e preencha localmente.
- Troque `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` e defina um `ADMIN_REGISTRATION_CODE` próprio (mínimo 16 caracteres).
- Nunca envie chaves da OpenAI ao repositório.
