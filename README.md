# School Control API

API REST para gestão escolar, construída com NestJS + Drizzle ORM + PostgreSQL.

## Pré-requisitos

- [Node.js](https://nodejs.org) >= 20
- [npm](https://www.npmjs.com) >= 10
- [PostgreSQL](https://www.postgresql.org) >= 14 rodando localmente (ou via Docker)

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no exemplo abaixo:

```env
DATABASE_URL=postgres://postgres:sua_senha@localhost:5432/nome_do_banco
PORT=3000
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `PORT` | Porta em que a API vai subir |

### 3. Criar e migrar o banco de dados

Com o PostgreSQL rodando, execute as migrações para criar as tabelas:

```bash
npm run db:migrate
```

---

## Rodando a aplicação

### Desenvolvimento

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

A API ficará disponível em `http://localhost:3000` (ou na porta configurada em `PORT`).

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run start:dev` | Inicia em modo desenvolvimento com hot reload |
| `npm run start` | Inicia sem hot reload |
| `npm run start:prod` | Inicia o build de produção |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run db:generate` | Gera arquivos de migration a partir dos schemas |
| `npm run db:migrate` | Aplica as migrations no banco |
| `npm run db:push` | Sincroniza o schema diretamente no banco (sem migration) |
| `npm run db:studio` | Abre o Drizzle Studio para inspecionar o banco visualmente |
| `npm run lint` | Executa o linter (Biome) |
| `npm run check` | Executa lint + formatação (Biome) |

---

## Subindo o PostgreSQL com Docker

Caso não tenha o PostgreSQL instalado localmente, suba uma instância com Docker:

```bash
docker run --name school-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=school_control \
  -p 5432:5432 \
  -d postgres:16
```

---

## Documentação interativa (Swagger)

Com a aplicação rodando, acesse a documentação interativa em:

```
http://localhost:3000/docs
```

O Swagger lista todas as rotas disponíveis, permite preencher os parâmetros e disparar requisições diretamente pelo navegador.

---

## Módulo de Matrículas (Enrollments)

Este é o único módulo ativo nesta aplicação. Ele gerencia matrículas de alunos em turmas.

> **Observação:** Os campos `studentId` e `classOfferingId` são UUIDs livres (sem foreign key). Em uma arquitetura de microserviços, a validação desses IDs é responsabilidade dos respectivos serviços.

**Base URL:** `http://localhost:3000/v1/enrollments`

---

### Rotas disponíveis

#### POST /v1/enrollments — Criar matrícula

Matricula um aluno em uma turma. Ambos os campos são obrigatórios e devem ser UUIDs válidos.

```
POST http://localhost:3000/v1/enrollments
Content-Type: application/json
```

**Body:**
```json
{
  "studentId": "c0000003-0000-0000-0000-000000000001",
  "classOfferingId": "d0000004-0000-0000-0000-000000000001"
}
```

**Resposta de sucesso:** `201 Created` (sem body)

**Resposta de erro — campos inválidos:** `400 Bad Request`
```json
{
  "message": [
    "studentId must be a UUID",
    "classOfferingId must be a UUID"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Resposta de erro — já matriculado:** `409 Conflict`
```json
{
  "message": "Student is already enrolled in this class offering",
  "error": "Conflict",
  "statusCode": 409
}
```

---

#### GET /v1/enrollments — Listar matrículas de uma turma

Retorna as matrículas de uma turma com paginação e links HATEOAS.

```
GET http://localhost:3000/v1/enrollments?class_offering_id={id}&_page=1&_size=10
```

| Query param | Obrigatório | Descrição |
|---|---|---|
| `class_offering_id` | Sim | ID da turma |
| `_page` | Não | Página desejada (padrão: `1`) |
| `_size` | Não | Itens por página (padrão: `10`) |

**Resposta de sucesso:** `200 OK`
```json
{
  "data": [
    {
      "id": "e0000005-0000-0000-0000-000000000001",
      "studentId": "c0000003-0000-0000-0000-000000000001",
      "classOfferingId": "d0000004-0000-0000-0000-000000000001",
      "status": "active",
      "enrolledAt": "2025-02-08T00:00:00.000Z",
      "canceledAt": null,
      "_links": {
        "self": { "href": "/v1/enrollments/e0000005-0000-0000-0000-000000000001", "method": "GET" },
        "cancel": { "href": "/v1/enrollments/e0000005-0000-0000-0000-000000000001/cancel", "method": "PATCH" }
      }
    }
  ],
  "meta": {
    "totalItems": 1,
    "itemsPerPage": 10,
    "currentPage": 1,
    "totalPages": 1
  },
  "_links": {
    "self": { "href": "/v1/enrollments?_page=1&_size=10", "method": "GET" },
    "next": null,
    "prev": null,
    "first": { "href": "/v1/enrollments?_page=1&_size=10", "method": "GET" },
    "last": { "href": "/v1/enrollments?_page=1&_size=10", "method": "GET" },
    "create": { "href": "/v1/enrollments", "method": "POST" }
  }
}
```

---

#### PATCH /v1/enrollments/:id/cancel — Cancelar matrícula

Cancela uma matrícula pelo seu ID. Não recebe body.

```
PATCH http://localhost:3000/v1/enrollments/{id}/cancel
```

**Resposta de sucesso:** `204 No Content` (sem body)

**Resposta de erro — não encontrada:** `404 Not Found`
```json
{
  "message": "Enrollment not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### Exemplo de fluxo completo no Postman

1. **Criar uma matrícula**
   - `POST /v1/enrollments` com `studentId` e `classOfferingId` no body

2. **Verificar a matrícula criada**
   - `GET /v1/enrollments?class_offering_id={classOfferingId}` — o registro aparece com `"status": "active"`

3. **Cancelar a matrícula**
   - `PATCH /v1/enrollments/{id}/cancel` usando o `id` retornado no passo 2

4. **Verificar o cancelamento**
   - `GET /v1/enrollments?class_offering_id={classOfferingId}` novamente — o registro aparecerá com `"status": "canceled"`

---

## Documentação

- [Arquitetura do projeto](docs/arquitetura.md)
