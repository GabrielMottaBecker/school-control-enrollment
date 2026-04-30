# School Control API

API REST para gestão escolar, construída com NestJS + Drizzle ORM + PostgreSQL + RabbitMQ.

## Pré-requisitos

- [Node.js](https://nodejs.org) >= 20
- [npm](https://www.npmjs.com) >= 10
- [PostgreSQL](https://www.postgresql.org) >= 14 rodando localmente (ou via Docker)
- [Docker](https://www.docker.com) para subir o RabbitMQ

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgres://postgres:sua_senha@localhost:5432/nome_do_banco
RABBITMQ_URL=amqp://admin:admin@localhost:5672
PORT=3000
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `RABBITMQ_URL` | URL de conexão com o RabbitMQ |
| `PORT` | Porta em que a API vai subir |

### 3. Subir o RabbitMQ com Docker

Na raiz do projeto, execute:

```bash
docker compose up -d rabbitmq
```

O `docker-compose.yml` já está configurado com usuário `admin`/`admin` e expõe:
- `5672` — porta AMQP (usada pela aplicação)
- `15672` — Management UI (acesse em `http://localhost:15672`)

> **Atenção:** Se houver uma instalação local do RabbitMQ no Windows, pare o serviço antes de subir o Docker para evitar conflito de porta:
> ```powershell
> net stop RabbitMQ
> ```

### 4. Criar e migrar o banco de dados

```bash
npm run db:migrate
```

---

## Rodando a aplicação

### Desenvolvimento (com hot reload)

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

A API ficará disponível em `http://localhost:3000`.
A documentação Swagger em `http://localhost:3000/docs`.

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

Caso não tenha o PostgreSQL instalado localmente:

```bash
docker run --name school-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=school_control \
  -p 5432:5432 \
  -d postgres:16
```

---

## Módulo de Matrículas (Enrollments)

Gerencia matrículas de alunos em turmas com publicação de eventos via RabbitMQ.

### Rotas disponíveis

#### GET /v1/enrollments — Listar matrículas de uma turma

```
GET http://localhost:3000/v1/enrollments?class_offering_id={id}&_page=1&_size=10
```

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
        "self": { "href": "/v1/enrollments/e0000005-...", "method": "GET" },
        "cancel": { "href": "/v1/enrollments/e0000005-.../cancel", "method": "PATCH" }
      }
    }
  ],
  "meta": { "totalItems": 1, "itemsPerPage": 10, "currentPage": 1, "totalPages": 1 },
  "_links": { "self": {...}, "first": {...}, "last": {...}, "next": null, "prev": null }
}
```

---

#### POST /v1/enrollments — Criar matrícula

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

**Resposta de sucesso:** `201 Created`

**Resposta de erro (já matriculado):** `409 Conflict`
```json
{
  "message": "Student is already enrolled in this class offering",
  "error": "Conflict",
  "statusCode": 409
}
```

> Ao criar uma matrícula, o evento `enrollment.created` é publicado automaticamente na exchange `enrollment.created.exchange` com routing key `enrollment.created`.

---

#### PATCH /v1/enrollments/:id/cancel — Cancelar matrícula

```
PATCH http://localhost:3000/v1/enrollments/{id}/cancel
```

**Resposta de sucesso:** `204 No Content`

**Resposta de erro (não encontrada):** `404 Not Found`

> Ao cancelar, o evento `enrollment.canceled` é publicado na exchange `enrollment.canceled.exchange`.

---

## Módulo de Mensageria (Messaging)

Gerencia a comunicação assíncrona com outros microserviços via RabbitMQ.

### Convenção de nomenclatura

| Elemento | Padrão | Exemplo |
|---|---|---|
| Exchange | `{producer-service}.{event}.exchange` | `enrollment.created.exchange` |
| Fila | `{consumer-service}.{producer-service}.{event}.queue` | `enrollment.academic-students.created.queue` |
| Routing Key | `{entity}.{action}` | `enrollment.created` |

### Exchanges publicadas (producer)

| Exchange | Routing Key | Descrição |
|---|---|---|
| `enrollment.created.exchange` | `enrollment.created` | Publicado ao criar uma matrícula |
| `enrollment.canceled.exchange` | `enrollment.canceled` | Publicado ao cancelar uma matrícula |

### Filas consumidas (consumer)

| Fila | Exchange vinculada | Routing Key | Ação |
|---|---|---|---|
| `enrollment.academic-students.created.queue` | `academic.students.created.exchange` | `student.created` | Insere student na tabela de referência |
| `enrollment.academic-students.updated.queue` | `academic.students.updated.exchange` | `student.updated` | Garante registro em students |
| `enrollment.academic-students.deleted.queue` | `academic.students.deleted.exchange` | `student.deleted` | Remove da tabela students |
| `enrollment.class-offering.created.queue` | `class-offering.created.exchange` | `class-offering.created` | Insere class_offering na tabela de referência |
| `enrollment.class-offering.updated.queue` | `class-offering.updated.exchange` | `class-offering.updated` | Garante registro em class_offerings |
| `enrollment.class-offering.canceled.queue` | `class-offering.canceled.exchange` | `class-offering.canceled` | Remove de class_offerings |

### Rotas disponíveis

#### POST /v1/messaging/setup — Inicializar exchanges e filas

Deve ser chamado uma vez ao subir o ambiente. Cria todas as exchanges e filas com seus bindings.

```bash
curl -X POST http://localhost:3000/v1/messaging/setup
```

**Resposta:** `204 No Content`

---

#### POST /v1/messaging/publish/enrollment-created — Publicar evento de matrícula criada

```json
{ "content": "{\"enrollmentId\":\"uuid\",\"studentId\":\"uuid\",\"classOfferingId\":\"uuid\"}" }
```

#### POST /v1/messaging/publish/enrollment-canceled — Publicar evento de matrícula cancelada

```json
{ "content": "{\"enrollmentId\":\"uuid\"}" }
```

---

#### GET /v1/messaging/consume/student-created — Consumir student.created

Lê a próxima mensagem da fila `enrollment.academic-students.created.queue` e sincroniza a tabela `students`.

#### GET /v1/messaging/consume/student-updated — Consumir student.updated

#### GET /v1/messaging/consume/student-deleted — Consumir student.deleted

Remove o estudante da tabela de referência `students`.

#### GET /v1/messaging/consume/class-offering-created — Consumir class-offering.created

Sincroniza a tabela `class_offerings`.

#### GET /v1/messaging/consume/class-offering-updated — Consumir class-offering.updated

#### GET /v1/messaging/consume/class-offering-canceled — Consumir class-offering.canceled

Remove a turma da tabela de referência `class_offerings`.

---

### Fluxo de teste completo

1. Pare o RabbitMQ local do Windows (se instalado): `net stop RabbitMQ`
2. Suba o RabbitMQ: `docker compose up -d rabbitmq`
3. Inicie a aplicação: `npm run start:dev`
4. Execute o setup uma única vez: `POST /v1/messaging/setup`
5. No Management UI (`http://localhost:15672`), publique na `academic.students.created.exchange` com routing key `student.created` e payload `{"id":"uuid-do-student"}` — o app sincroniza automaticamente a tabela `students`
6. Repita para `class-offering.created.exchange` com routing key `class-offering.created` e payload `{"id":"uuid-da-turma"}` — sincroniza `class_offerings`
7. Crie a matrícula: `POST /v1/enrollments` com os UUIDs usados acima
8. Verifique no Management UI que a mensagem chegou em `enrollment.created.exchange`

> **Consumers automáticos:** ao iniciar a aplicação, todos os consumers das filas são registrados automaticamente. Mensagens publicadas nas exchanges de `academic.students` e `class-offering` são processadas e sincronizadas nas tabelas de referência sem necessidade de chamada manual. Os endpoints `GET /v1/messaging/consume/*` permanecem disponíveis para debug e teste manual via Swagger.

---

## Arquitetura do projeto

```
src/
├── app.module.ts                          # Módulo raiz — importa SharedModule e EnrollmentModule
├── main.ts                                # Bootstrap da aplicação, Swagger e ValidationPipe
│
├── modules/
│   ├── enrollment/                        # Módulo de matrículas
│   │   ├── enrollment.module.ts           # Registro do módulo, importa SharedModule e MessagingModule
│   │   │
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-enrollment.dto.ts   # DTO de entrada para criar matrícula (validação UUID)
│   │   │   │   └── enrollment.dto.ts          # DTO de saída com @ApiProperty para o Swagger
│   │   │   └── services/
│   │   │       └── enrollment.service.ts      # Regras de negócio: enroll, cancel, listByClassOffering
│   │   │
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   │   └── enrollment.entity.ts       # Entidade de domínio Enrollment com EnrollmentStatus
│   │   │   └── repositories/
│   │   │       └── enrollment-repository.interface.ts  # Contrato do repositório (token de injeção)
│   │   │
│   │   └── infra/
│   │       ├── controllers/
│   │       │   └── enrollments.controller.ts  # Rotas HTTP: GET, POST, PATCH com Swagger e HATEOAS
│   │       ├── repositories/
│   │       │   └── drizzle-enrollment.repository.ts  # Implementação do repositório com Drizzle ORM
│   │       └── schemas/
│   │           ├── enrollment.schema.ts              # Schema Drizzle da tabela enrollments
│   │           ├── student-reference.schema.ts       # Schema Drizzle da tabela students (referência)
│   │           ├── class-offering-reference.schema.ts # Schema Drizzle da tabela class_offerings (referência)
│   │           └── index.ts                          # Re-exporta todos os schemas
│   │
│   └── messaging/                         # Módulo de mensageria RabbitMQ
│       ├── messaging.module.ts            # Registro do módulo, exporta MessagingService
│       │
│       ├── application/
│       │   ├── dto/
│       │   │   ├── publish-message.dto.ts     # DTO para publicar mensagem (campo content)
│       │   │   └── consumed-message.dto.ts    # DTO de retorno ao consumir (content + queue)
│       │   └── services/
│       │       └── messaging.service.ts       # Lógica de assertExchange, assertQueue, publish, consume e sync
│       │
│       └── infra/
│           ├── controllers/
│           │   └── messaging.controller.ts    # Rotas HTTP: setup, publish e consume com constantes de exchange/fila
│           └── rabbitmq/
│               └── rabbitmq.service.ts        # Conexão AMQP com retry, expõe getChannel()
│
└── shared/                                # Módulo compartilhado
    ├── shared.module.ts                   # Registra DrizzleService e HateoasInterceptor global
    └── infra/
        ├── database/
        │   └── drizzle.service.ts         # Instância do Drizzle ORM com pool PostgreSQL
        └── hateoas/
            ├── hateoas.interceptor.ts     # Interceptor global que adiciona _links e meta de paginação
            ├── hateoas-list.decorator.ts  # Decorator @HateoasList para endpoints de listagem
            ├── hateoas-item.decorator.ts  # Decorator @HateoasItem para endpoints de item único
            ├── hateoas.types.ts           # Tipos PaginatedResult, LinkDef e LinksMap
            └── index.ts                   # Re-exporta tudo do módulo hateoas
```

### Fluxo de dependências entre módulos

```
AppModule
├── SharedModule      → DrizzleService, HateoasInterceptor
└── EnrollmentModule
    ├── SharedModule  → DrizzleService
    └── MessagingModule
        ├── SharedModule   → DrizzleService (para sync das tabelas de referência)
        └── RabbitMQService → canal AMQP
```

### Banco de dados — tabelas

| Tabela | Descrição |
|---|---|
| `enrollments` | Matrículas com status `active`/`canceled`, FK para students e class_offerings |
| `students` | Tabela de referência — sincronizada via eventos RabbitMQ do microserviço academic |
| `class_offerings` | Tabela de referência — sincronizada via eventos RabbitMQ do microserviço class-offering |