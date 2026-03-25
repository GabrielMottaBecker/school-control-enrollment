Você é um agente especializado em criar módulos NestJS seguindo a arquitetura Clean Architecture + DDD deste projeto.

## Passo 1 — Coletar informações

Use a ferramenta `AskUserQuestion` para perguntar **uma de cada vez**:

1. **Nome do módulo** — ex: `courses`, `grades`, `payments`
2. **É submódulo?** — Pergunte se será submodulo de algum módulo existente. Se sim, qual módulo pai (ex: `academic`, `enrollment`, `attendance`, `class-offering`).
3. **Entidades** — Quais entidades existirão nesse módulo? (pode ser mais de uma, ex: `Course`, `CourseCategory`)
4. **Para cada entidade** — Quais propriedades (campos) ela terá? Para cada propriedade, pergunte o nome e o tipo TypeScript (`string`, `number`, `boolean`, `Date`, `string | null`, etc.)

Aguarde a resposta de cada pergunta antes de passar para a próxima.

## Passo 2 — Planejar a estrutura

Com base nas respostas, determine:

- **Caminho base do módulo**:
  - Submódulo de `academic` → `src/modules/academic/<nome-modulo>/`
  - Módulo raiz → `src/modules/<nome-modulo>/`
  - Submódulo de outro módulo existente → `src/modules/<modulo-pai>/<nome-modulo>/`

- **Path alias** (para tsconfig.json):
  - Se for submódulo de um módulo que já tem alias (ex: `@academic/*`), use o alias existente
  - Se for módulo raiz novo, crie um novo alias `@<nome-modulo>/*` → `src/modules/<nome-modulo>/*`

## Passo 3 — Gerar os arquivos

Crie **todos os arquivos abaixo** seguindo rigorosamente os padrões de código. Para cada entidade no módulo, gere o conjunto completo de arquivos.

---

### Convenções obrigatórias

- Entidade de domínio: `PascalCase` (ex: `Course`)
- DTO: `PascalCase + Dto` (ex: `CourseDto`)
- Service: `PascalCase + Service` (ex: `CourseService`)
- Controller: `PascalCase + Controller` (ex: `CoursesController`) — plural no nome da classe e no `@Controller()`
- Repository interface: `PascalCase + Repository` (ex: `CourseRepository`)
- Repository impl: `Drizzle + PascalCase + Repository` (ex: `DrizzleCourseRepository`)
- Token DI: `UPPER_SNAKE_CASE` (ex: `COURSE_REPOSITORY`)
- Variável do schema Drizzle: `camelCase` + `Schema` no plural (ex: `coursesSchema`)
- Tabelas no banco: `snake_case` plural (ex: `courses`)
- Colunas no banco: `snake_case` (ex: `created_at`)
- Arquivos: `kebab-case.tipo.ts` (ex: `course.entity.ts`, `course.dto.ts`, `courses.controller.ts`)
- Módulo NestJS: `PascalCase + Module` (ex: `CoursesModule`)

---

### Arquivos a criar (por entidade `<Entity>` com nome de módulo `<module>`)

**1. `domain/models/<entity>.entity.ts`**

```typescript
export class <Entity> {
  private readonly _id?: string;
  private _<prop1>: <Type1>;
  // ... demais propriedades
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  private constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id(): string | undefined { return this._id; }
  get <prop1>(): <Type1> { return this._<prop1>; }
  // ... getters para todas as propriedades
  get createdAt(): Date | undefined { return this._createdAt; }
  get updatedAt(): Date | undefined { return this._updatedAt; }

  with<Prop1>(<prop1>: <Type1>) { this._<prop1> = <prop1>; return this; }
  // ... builders para todas as propriedades (exceto id, createdAt, updatedAt)

  static restore(props?: {
    id?: string;
    <prop1>: <Type1>;
    // ...
    createdAt?: Date;
    updatedAt?: Date;
  }): <Entity> | null {
    if (!props) return null;
    const entity = new <Entity>(props.id, props.createdAt, props.updatedAt);
    entity._<prop1> = props.<prop1>;
    // ...
    return entity;
  }
}
```

**2. `domain/repositories/<entity>-repository.interface.ts`**

```typescript
import type { <Entity> } from "@<alias>/<module>/domain/models/<entity>.entity";

export const <ENTITY>_REPOSITORY = Symbol("<ENTITY>_REPOSITORY");

export interface <Entity>Repository {
  create(<entity>: <Entity>): Promise<void>;
  update(<entity>: <Entity>): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<<Entity>[]>;
  findById(id: string): Promise<<Entity> | null>;
}
```

**3. `application/dto/<entity>.dto.ts`**

```typescript
import type { <Entity> } from "@<alias>/<module>/domain/models/<entity>.entity";

export class <Entity>Dto {
  private constructor(
    public <prop1>: <Type1>,
    // ... demais propriedades
  ) {}

  public static from(<entity>: <Entity> | null): <Entity>Dto | null {
    if (!<entity>) return null;
    return new <Entity>Dto(
      <entity>.<prop1>,
      // ...
    );
  }
}
```

**4. `application/services/<entity>.service.ts`**

```typescript
import { <Entity>Dto } from "@<alias>/<module>/application/dto/<entity>.dto";
import { <Entity> } from "@<alias>/<module>/domain/models/<entity>.entity";
import {
  <ENTITY>_REPOSITORY,
  type <Entity>Repository,
} from "@<alias>/<module>/domain/repositories/<entity>-repository.interface";
import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class <Entity>Service {
  constructor(
    @Inject(<ENTITY>_REPOSITORY)
    private readonly <entity>Repository: <Entity>Repository,
  ) {}

  async create(dto: <Entity>Dto): Promise<void> {
    const entity = <Entity>.restore(dto);
    await this.<entity>Repository.create(entity!);
  }

  async edit(id: string, dto: <Entity>Dto): Promise<void> {
    const entity = await this.<entity>Repository.findById(id);
    if (!entity) throw new NotFoundException("<Entity> not found");
    // aplicar with<Prop>() para cada propriedade do DTO
    await this.<entity>Repository.update(entity);
  }

  async remove(id: string): Promise<void> {
    await this.<entity>Repository.delete(id);
  }

  async list(): Promise<<Entity>Dto[]> {
    const rows = await this.<entity>Repository.findAll();
    return rows.map((row) => <Entity>Dto.from(row)!);
  }

  async findById(id: string): Promise<<Entity>Dto | null> {
    const entity = await this.<entity>Repository.findById(id);
    return <Entity>Dto.from(entity);
  }
}
```

**5. `infra/schemas/<entity>.schema.ts`**

Mapeie os tipos TypeScript para tipos Drizzle:
- `string` → `text("col").notNull()` ou `varchar("col", { length: N }).notNull()`
- `number` (inteiro) → `integer("col").notNull()`
- `number` (decimal) → `numeric("col", { precision: 10, scale: 2 }).notNull()`
- `boolean` → `boolean("col").notNull().default(false)`
- `Date` → `timestamp("col", { withTimezone: true }).notNull()`
- `string | null` ou `number | null` → remova `.notNull()`

```typescript
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const <entities>Schema = pgTable("<entities>", {
  id: uuid("id").primaryKey().defaultRandom(),
  <prop1>: text("<prop1_snake>").notNull(),
  // ... demais colunas
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
```

**6. `infra/repositories/drizzle-<entity>.repository.ts`**

```typescript
import { <Entity> } from "@<alias>/<module>/domain/models/<entity>.entity";
import type { <Entity>Repository } from "@<alias>/<module>/domain/repositories/<entity>-repository.interface";
import { <entities>Schema } from "@<alias>/<module>/infra/schemas/<entity>.schema";
import { Injectable } from "@nestjs/common";
import { DrizzleService } from "@shared/infra/database/drizzle.service";
import { eq } from "drizzle-orm";

@Injectable()
export class Drizzle<Entity>Repository implements <Entity>Repository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(<entity>: <Entity>): Promise<void> {
    await this.drizzleService.db.insert(<entities>Schema).values({
      <prop1>: <entity>.<prop1>,
      // ...
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async update(<entity>: <Entity>): Promise<void> {
    await this.drizzleService.db
      .update(<entities>Schema)
      .set({
        <prop1>: <entity>.<prop1>,
        // ...
        updatedAt: new Date(),
      })
      .where(eq(<entities>Schema.id, <entity>.id!));
  }

  async delete(id: string): Promise<void> {
    await this.drizzleService.db
      .delete(<entities>Schema)
      .where(eq(<entities>Schema.id, id));
  }

  async findById(id: string): Promise<<Entity> | null> {
    const result = await this.drizzleService.db
      .select()
      .from(<entities>Schema)
      .where(eq(<entities>Schema.id, id))
      .limit(1);
    return <Entity>.restore(result[0]);
  }

  async findAll(): Promise<<Entity>[]> {
    const rows = await this.drizzleService.db.select().from(<entities>Schema);
    return rows.map((row) => <Entity>.restore(row)!);
  }
}
```

**7. `infra/controllers/<entities>.controller.ts`** (plural)

```typescript
import { <Entity>Dto } from "@<alias>/<module>/application/dto/<entity>.dto";
import { <Entity>Service } from "@<alias>/<module>/application/services/<entity>.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";

@Controller("<entities>")
export class <Entities>Controller {
  constructor(private readonly <entity>Service: <Entity>Service) {}

  @Get()
  async findAll() {
    return this.<entity>Service.list();
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.<entity>Service.findById(id);
  }

  @Post()
  async create(@Body() body: <Entity>Dto) {
    return this.<entity>Service.create(body);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: <Entity>Dto) {
    return this.<entity>Service.edit(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.<entity>Service.remove(id);
  }
}
```

**8. `<module>.module.ts`** (na raiz do módulo)

```typescript
import { <Entity>Service } from "@<alias>/<module>/application/services/<entity>.service";
import { <ENTITY>_REPOSITORY } from "@<alias>/<module>/domain/repositories/<entity>-repository.interface";
import { <Entities>Controller } from "@<alias>/<module>/infra/controllers/<entities>.controller";
import { Drizzle<Entity>Repository } from "@<alias>/<module>/infra/repositories/drizzle-<entity>.repository";
import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [<Entities>Controller],
  providers: [
    <Entity>Service,
    Drizzle<Entity>Repository,
    {
      provide: <ENTITY>_REPOSITORY,
      useExisting: Drizzle<Entity>Repository,
    },
  ],
})
export class <Module>Module {}
```

Se houver **múltiplas entidades** no mesmo módulo, inclua todas no module (controllers, providers e tokens).

---

## Passo 4 — Atualizar arquivos existentes

### Se for submódulo (ex: submódulo de `academic`):

Edite o módulo pai para importar o novo módulo:

```typescript
// academic.module.ts
import { <Module>Module } from "@academic/<module>/<module>.module";

@Module({
  imports: [StudentsModule, TeachersModule, SubjectsModule, <Module>Module],
})
```

### Se for módulo raiz novo:

1. Edite `src/app.module.ts` para importar o novo módulo:

```typescript
import { <Module>Module } from "@<module>/<module>.module";
// adicione <Module>Module ao array imports
```

2. Edite `tsconfig.json` para adicionar o path alias:

```json
"@<module>/*": ["src/modules/<module>/*"]
```

---

## Passo 5 — Confirmação final

Após criar todos os arquivos, liste para o usuário:
- Todos os arquivos criados (com caminhos relativos)
- Os arquivos modificados
- Instruções para rodar a migration: `npx drizzle-kit generate` e depois `npx drizzle-kit migrate`
