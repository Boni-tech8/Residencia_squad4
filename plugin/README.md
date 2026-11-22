# AcessForge — MVP 3.7.3 (Plugin Figma)

Plugin real do Figma para análise determinística de acessibilidade e sugestões assistidas por IA via backend.

## Funcionalidades
- Leitura real da seleção no Figma.
- Análise determinística local e fallback quando o backend não responde.
- Regras V-01 (contraste), V-02 (nome acessível) e V-03 (texto alternativo).
- Sugestões de nome acessível e alt text pelo provedor configurado no backend (OpenAI ou Ollama).
- Revisão humana antes de aplicar metadados.
- Indicadores de conexão com backend e provedor de IA.
- Login com perfis de administrador e funcionário.
- Opção **Criar uma conta** com escolha entre funcionário e administrador.
- Cadastro de funcionário protegido por código de equipe; cadastro administrativo protegido por `ADMIN_REGISTRATION_CODE` do backend.
- Editor de metadata: nome acessível, texto alternativo e role semântico, gravados no elemento selecionado do Figma.
- Administração de equipes, códigos de acesso e cadastro de funcionários.
- Interface de acesso/gestão alinhada à paleta clara do plugin: branco, cinza, grafite, verde e âmbar.

## Compilar
Na pasta `plugin`:
```bash
npm install
npm run build
```
O arquivo compilado ficará em `plugin/dist/manifest.json`.

## Importar
No Figma Desktop, abra um arquivo de Design e importe `plugin/dist/manifest.json` pelo menu de desenvolvimento de plugins.

## Dependência do backend
O plugin se comunica com `http://localhost:3001`. Inicie o backend antes de usar os recursos de IA. Consulte o README principal para configurar OpenAI ou Ollama.

A análise determinística local continua funcionando mesmo se backend/IA estiverem indisponíveis. As sugestões são metadados de handoff e exigem revisão; não são atributos ARIA aplicados a um site publicado.


### Correção de sessão e rede (3.7.1)
O login não depende mais de `localStorage` estar disponível no iframe: quando o armazenamento é bloqueado, a sessão funciona enquanto o plugin estiver aberto. O manifesto declara `http://localhost:3001` para permitir a comunicação com o backend local.


### Cadastro de contas e metadata (3.7.3)
Na tela de login, clique em **Criar uma conta** e escolha o perfil. Para administrador, configure um segredo privado `ADMIN_REGISTRATION_CODE` (mínimo de 16 caracteres) no `backend/.env`; nunca o coloque no plugin. Para funcionário, use o código da equipe.

Na análise, selecione um elemento e edite nome acessível, alt text e role no painel **Metadata de Acessibilidade**. Clique em **Salvar metadata no elemento**. Os dados permanecem gravados como plugin data no arquivo Figma e podem ser lidos novamente pelo plugin.
