# Backend - Projeto Logger

## Stack
- ExpressJS - [Docs](https://expressjs.com/)
- Prisma - [Docs](https://www.prisma.io/)
  - Utilizando v5.15+ multi-schema, mais informações: [Docs](https://www.prisma.io/blog/organize-your-prisma-schema-with-multi-file-support)
- [Suppabase](https://supabase.com/) - [Docs](https://supabase.com/docs)
  - Verifique o final do README, algumas ações manuais são necessárias no banco (constraints, triggers e etc...)
- [PostgreSQL](https://www.postgresql.org/) - [Docs](https://www.postgresql.org/docs/)
## Setup

### [Suppabase](https://supabase.com/)
  - inicialize um projeto
  - copie as informações da aba `conexões` para suas [Variáveis de ambiente](#variaveis-de-ambiente)
    - Troque a porta da conexão para `5432` para deploy/migrate. a porta original (`6543`) é utilizada apenas em produção.

### Pacotes Node.JS
O projeto não possui um gerenciador definido em package.json, todos devem funcionar.
<br />
PNPM é recomendado pela funcionalidade de cache e melhor solução de peer dependencies.

```sh
pnpm
# ou
yarn install
# ou
npm install
# ou equivalente para seu gerenciador de pacotes.
```

### Variáveis de Ambiente
Clone as variáveis de exemplo (`.env.example`) ou mude o nome do arquivo para `.env` / `.env.local`

| Variável | Descrição | Padrão/Layout |  |  |
|---|---|---|---|---|
| DATABASE | Prisma/JDB URL  | postgresql://usuario:senha@host:porta/schema |  |  |
| NODE_OPTIONS |  |  |  |  |
| NODE_SECRET | Chave de 128+ bits para "salting" de segredos/criptografias.  | [AES 128+bits](https://generate-random.org/encryption-key-generator) |  |  |
| API_KEY_SIGACT | Token API SigaCT para consulta de veículos |  |  |  |
| API_KEY_PLACAFIPE | TOKEN PlacaFIPE para registro de veículos pela placa |  |  |  |

> [!WARNING]
> Evite utilizar chaves geradas por websites em ambientes públicos

## Post Setup
-- TODO suppabase auth & constraints

## Estrutura diretórios
```/
├── src/                 # Código Fonte
│   ├── controllers/     # Controladores dos Endpoints (API)
│   ├── core/            # Funções principais e regras de negócio compartilhadas
│   ├── routes/          # Definição de rotas Express
│   ├── services/        # Camada de serviço / execução das regras de negócio
│   └── types/           # Definições globais de tipagem (Typescript)
├── .env                 # Variáveis de ambiente
```
# Rodando o projeto
Empurre o estado atual das schemas para o banco de dados (Também gera os arquivos de tipo do PrismaCliente):
```sh
npx prisma db push
# ou
npx prisma db push
# ou
npx prisma db push
```
Inicie o projeto como desenvolvedor
```sh
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

## Contribuições

O repositório utiliza o padrão semântico de commits e o mesmo deve ser utilizado por todos os
contribuintes.
 - PT/BR : https://www.conventionalcommits.org/pt-br/v1.0.0/
 - EN : https://www.conventionalcommits.org/en/v1.0.0
Além disso, o padrão de branches deve ser seguido:
 - Para novas funcionalidades/modulos, utilize o formato: `feature/<nome-da-funcionalidade ou módulo>`
 - Certifique-se de que o nome da branch seja descritivo e em inglês, sempre que possível.
 - Não aprove Pull Requests por conta própria nas branchs com deploy.

### Boas práticas de Git
 - **Evite force pulls**: Utilize `git pull --rebase` apenas quando necessário e com cuidado para evitar sobrescrever alterações locais.
 - **Não utilize `git push --force` em branches compartilhadas**: Isso pode causar perda de histórico e conflitos para outros contribuidores.
 - **Rebase com cuidado**: Prefira `merge` em vez de `rebase` em branches compartilhadas para preservar o histórico do projeto.
 - **Commits pequenos e frequentes**: Realize commits pequenos e descritivos para facilitar o rastreamento de alterações.
 - **Atualize sua branch frequentemente**: Antes de abrir um Pull Request, certifique-se de que sua branch está atualizada com a branch principal.

[Cheat Sheet GIT](https://training.github.com/downloads/pt_BR/github-git-cheat-sheet.pdf)
