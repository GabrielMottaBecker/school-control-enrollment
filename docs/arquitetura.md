# Arquitetura do Projeto

## Visão Geral

Este projeto é uma API REST construída com **NestJS** seguindo os princípios de **Clean Architecture** combinados com conceitos de **Domain-Driven Design (DDD)**. O objetivo é manter o domínio da aplicação isolado de detalhes de infraestrutura, garantindo baixo acoplamento e alta coesão.

---

## Stack Tecnológica

| Tecnologia | Uso |
|---|---|
| NestJS 11.x | Framework HTTP |
| TypeScript (ES2023) | Linguagem |
| PostgreSQL | Banco de dados |
| Drizzle ORM 0.45.x | ORM / migrations |
| class-validator / class-transformer | Validação de DTOs |
| Biome | Linter e formatter |

---

## Estrutura de Pastas

```
src/
├── app.module.ts
├── main.ts
├── modules/
│   ├── academic/
│   │   ├── academic.module.ts
│   │   ├── students/
│   │   ├── teachers/
│   │   └── subjects/
│   ├── enrollment/
│   ├── class-offering/
│   └── attendance/
└── shared/
    ├── shared.module.ts
    └── infra/
        └── database/
            ├── drizzle.service.ts
            └── drizzle/           ← migrations geradas
```

Cada módulo de domínio segue a mesma estrutura interna de três camadas:

```
<modulo>/
├── domain/
│   ├── models/              ← entidades de domínio
│   └── repositories/        ← interfaces (contratos)
├── application/
│   ├── services/            ← casos de uso
│   └── dto/                 ← objetos de transferência de dados
└── infra/
    ├── controllers/         ← endpoints HTTP
    ├── repositories/        ← implementações com Drizzle
    └── schemas/             ← definições de tabelas
```

---

## Camadas

### Domain

A camada mais interna. Não possui dependência de nenhum framework.

- **Entidades**: classes com campos privados (`_name`, `_email`...) expostos por getters. Possuem métodos builder `withX()` para mutação e um factory `static restore()` para reconstrução a partir do banco.
- **Interfaces de repositório**: definem os contratos de persistência sem mencionar detalhes de implementação.

```typescript
// Exemplo de entidade
export class Student {
  private readonly _id?: string;
  private _name: string;

  get id() { return this._id; }
  get name() { return this._name; }

  withName(name: string): this {
    this._name = name;
    return this;
  }

  static restore(data: { id: string; name: string }): Student {
    const student = new Student();
    student._id = data.id;
    student._name = data.name;
    return student;
  }
}
```

```typescript
// Exemplo de interface de repositório
export const STUDENT_REPOSITORY = Symbol("STUDENT_REPOSITORY");

export interface StudentRepository {
  create(student: Student): Promise<void>;
  findById(id: string): Promise<Student | null>;
  findAll(): Promise<Student[]>;
  update(student: Student): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### Application

Orquestra os casos de uso. Depende apenas das abstrações definidas no domínio.

- **Services**: injetam repositórios via token (`@Inject(STUDENT_REPOSITORY)`) e executam a lógica de negócio.
- **DTOs**: objetos simples com construtor privado e factory `static from(entity)` para converter entidades em resposta de API.

```typescript
// Exemplo de service
@Injectable()
export class StudentService {
  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepository: StudentRepository,
  ) {}

  async findById(id: string): Promise<StudentDto> {
    const student = await this.studentRepository.findById(id);
    if (!student) throw new NotFoundException("Aluno não encontrado");
    return StudentDto.from(student);
  }
}
```

```typescript
// Exemplo de DTO
export class StudentDto {
  private constructor(
    public readonly name: string,
    public readonly email: string,
  ) {}

  static from(student: Student | null): StudentDto | null {
    if (!student) return null;
    return new StudentDto(student.name, student.email);
  }
}
```

### Infrastructure

Camada mais externa. Contém todo código dependente de framework ou banco de dados.

- **Controllers**: expõem os endpoints HTTP usando decorators do NestJS (`@Get`, `@Post`, `@Param`...) e delegam para os services.
- **Repository implementations**: implementam as interfaces do domínio usando `DrizzleService`.
- **Schemas**: definem as tabelas com `pgTable()` do Drizzle ORM.

```typescript
// Exemplo de schema
export const studentsSchema = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
```

---

## Injeção de Dependência

O projeto usa **tokens baseados em Symbol** para registrar e injetar implementações de repositório, garantindo que os services dependam da abstração (interface) e não da implementação concreta.

```typescript
// students.module.ts
providers: [
  StudentService,
  DrizzleStudentRepository,
  {
    provide: STUDENT_REPOSITORY,
    useExisting: DrizzleStudentRepository,
  },
],
```

Isso respeita o **Princípio da Inversão de Dependência (DIP)**: a camada de aplicação não conhece o Drizzle, apenas a interface `StudentRepository`.

---

## Fluxo de uma Requisição

```
HTTP Request
    │
    ▼
Controller (infra)
    │  chama
    ▼
Service (application)
    │  usa interface de
    ▼
Repository Interface (domain)
    │  implementada por
    ▼
Drizzle Repository (infra)
    │  acessa
    ▼
PostgreSQL
```

---

## Banco de Dados

O arquivo `drizzle.config.ts` configura o Drizzle para varrer automaticamente os schemas distribuídos nos módulos:

```typescript
schema: "./src/modules/**/infra/schemas/*.ts"
out: "./src/shared/infra/database/drizzle"
dialect: "postgresql"
```

O `DrizzleService` é um singleton provido pelo `SharedModule` e injetado nos repositórios de infraestrutura de todos os módulos.

---

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `AcademicModule` | Agrupa Students, Teachers e Subjects |
| `StudentsModule` | Gestão de alunos |
| `TeachersModule` | Gestão de professores |
| `SubjectsModule` | Gestão de disciplinas |
| `ClassOfferingModule` | Oferta de turmas |
| `EnrollmentModule` | Matrículas de alunos em turmas |
| `AttendanceModule` | Controle de presença |
| `SharedModule` | Infraestrutura compartilhada (banco de dados) |

---

## Convenções de Nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Entidade de domínio | PascalCase | `Student`, `Enrollment` |
| DTO | PascalCase + `Dto` | `StudentDto` |
| Service | PascalCase + `Service` | `StudentService` |
| Controller | PascalCase + `Controller` | `StudentsController` |
| Repository interface | PascalCase + `Repository` | `StudentRepository` |
| Repository impl | `Drizzle` + PascalCase + `Repository` | `DrizzleStudentRepository` |
| Token de DI | `UPPER_SNAKE_CASE` | `STUDENT_REPOSITORY` |
| Tabelas no banco | snake_case plural | `students`, `enrollments` |
| Colunas no banco | snake_case | `created_at`, `student_id` |
| Path aliases | `@<modulo>/*` | `@shared/*`, `@academic/*` |

---

## Path Aliases (tsconfig.json)

```json
"@shared/*"        → "src/shared/*"
"@academic/*"      → "src/modules/academic/*"
"@class-offering/*"→ "src/modules/class-offering/*"
"@enrollment/*"    → "src/modules/enrollment/*"
"@attendance/*"    → "src/modules/attendance/*"
```
