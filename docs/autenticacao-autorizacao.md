# Autenticação e Autorização com NestJS + JWT

Este guia mostra como implementar autenticação via JWT e autorização baseada em permissões em uma API NestJS seguindo Clean Architecture.

> **Referências oficiais**
> - https://docs.nestjs.com/security/authentication
> - https://docs.nestjs.com/security/authorization

---

## Visão geral

O fluxo implementado funciona assim:

```
Cliente → POST /auth/login → recebe accessToken (JWT)
         ↓
Cliente → GET /teachers (com Bearer token) → JwtAuthGuard valida o token
                                            → PermissionsGuard verifica permissões
                                            → 200 OK ou 401/403
```

O JWT carrega no payload:
- `sub` — id do usuário
- `email` — email do usuário
- `permissions` — lista de permissões (ex: `["teachers:read", "students:write"]`)

---

## 1. Instalação dos pacotes

```bash
npm install @nestjs/jwt bcryptjs
npm install --save-dev @types/bcryptjs
```

| Pacote | Finalidade |
|---|---|
| `@nestjs/jwt` | Assinar e verificar tokens JWT |
| `bcryptjs` | Hash de senhas (puro JS, sem dependências nativas) |

---

## 2. Variável de ambiente

Adicione ao `.env`:

```env
JWT_SECRET=uma-chave-secreta-longa-e-aleatoria
```

> **Nunca** commite o `.env` com a chave real. Adicione `.env` ao `.gitignore`.

---

## 3. Path aliases no tsconfig.json

Para que os imports usem aliases em vez de caminhos relativos longos, adicione ao `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@users/*":  ["src/modules/users/*"],
      "@auth/*":   ["src/modules/auth/*"]
    }
  }
}
```

---

## 4. Enum de permissões

Crie `src/shared/domain/enums/permission.enum.ts`:

```typescript
export enum Permission {
  STUDENTS_READ   = "students:read",
  STUDENTS_WRITE  = "students:write",
  STUDENTS_DELETE = "students:delete",

  TEACHERS_READ   = "teachers:read",
  TEACHERS_WRITE  = "teachers:write",
  TEACHERS_DELETE = "teachers:delete",

  // adicione um bloco para cada módulo da sua aplicação
}
```

> O padrão `modulo:acao` é uma convenção legível. Você pode usar qualquer string, mas seja consistente.

---

## 5. Decorators compartilhados

Decorators são metadados que você anexa a rotas. Crie-os em `src/shared/infra/decorators/`.

### 5.1 `@Public()` — marca uma rota como pública (sem autenticação)

```typescript
// src/shared/infra/decorators/public.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 5.2 `@RequirePermissions()` — exige permissões específicas na rota

```typescript
// src/shared/infra/decorators/permissions.decorator.ts
import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@shared/domain/enums/permission.enum";

export const PERMISSIONS_KEY = "permissions";
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### 5.3 `@CurrentUser()` — injeta o usuário autenticado como parâmetro

```typescript
// src/shared/infra/decorators/current-user.decorator.ts
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  sub: string;
  email: string;
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
```

> Esses três decorators são independentes do módulo de auth — por isso ficam em `@shared/`. Qualquer controller pode importá-los sem criar dependência circular.

---

## 6. Módulo de usuários

O usuário é a entidade central da autenticação. Ele armazena email, senha (hash) e o array de permissões.

### 6.1 Entidade

```typescript
// src/modules/users/domain/models/user.entity.ts
export class User {
  private readonly _id?: string;
  private _email: string;
  private _password: string;         // sempre armazenado como hash
  private _teacherId?: string;       // FK opcional para outro módulo
  private _permissions: string[];
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  private constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // getters...
  get id() { return this._id; }
  get email() { return this._email; }
  get password() { return this._password; }
  get teacherId() { return this._teacherId; }
  get permissions() { return this._permissions; }

  // builders (padrão fluente)...
  withEmail(email: string) { this._email = email; return this; }
  withPassword(password: string) { this._password = password; return this; }
  withPermissions(permissions: string[]) { this._permissions = permissions; return this; }

  static restore(props?: {
    id?: string;
    email: string;
    password: string;
    teacherId?: string | null;
    permissions: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }): User | null {
    if (!props) return null;
    const user = new User(props.id, props.createdAt, props.updatedAt);
    user._email = props.email;
    user._password = props.password;
    user._teacherId = props.teacherId ?? undefined;
    user._permissions = props.permissions ?? [];
    return user;
  }
}
```

### 6.2 Interface do repositório

```typescript
// src/modules/users/domain/repositories/user-repository.interface.ts
import type { User } from "@users/domain/models/user.entity";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
```

### 6.3 Schema do banco (Drizzle ORM)

```typescript
// src/modules/users/infra/schemas/user.schema.ts
import { teachersSchema } from "@academic/teachers/infra/schemas/teacher.schema";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const usersSchema = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  teacherId: uuid("teacher_id").references(() => teachersSchema.id), // FK opcional
  permissions: text("permissions").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
```

> A FK `teacherId` usa uma função (`() => teachersSchema.id`) para avaliação lazy — isso evita problemas de importação circular.

### 6.4 Serviço — ponto importante: `validateCredentials`

O método `validateCredentials` é o que o `AuthService` vai chamar para validar o login. Ele retorna apenas o que precisa ir para o JWT, sem expor a senha.

```typescript
// src/modules/users/application/services/user.service.ts
import bcrypt from "bcryptjs";

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<void> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException("Email already registered");

    // hash da senha ANTES de persistir
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = User.restore({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      teacherId: dto.teacherId,
      permissions: dto.permissions as string[],
    })!;

    await this.userRepository.create(user);
  }

  // chamado pelo AuthService durante o login
  async validateCredentials(email: string, password: string): Promise<UserPayload | null> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    // retorna apenas o que entra no JWT — sem a senha
    return { id: user.id!, email: user.email, permissions: user.permissions };
  }
}
```

> **Por que `bcrypt.hash(senha, 10)`?**
> O segundo argumento (`10`) é o *cost factor* — define quantas rodadas de hashing são feitas. Valores maiores = mais seguro mas mais lento. `10` é o padrão recomendado.

---

## 7. Módulo de autenticação

### 7.1 Guard de JWT — `JwtAuthGuard`

O guard intercepta **todas** as requisições. Ele extrai o token do header `Authorization: Bearer <token>`, verifica a assinatura e coloca o payload em `request.user`.

```typescript
// src/modules/auth/infra/guards/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "@shared/infra/decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // se a rota tem @Public(), deixa passar sem verificar token
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Missing token");

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      // injeta o usuário na request para os próximos guards e controllers
      (request as any).user = payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
```

> **`Reflector`** é a forma do NestJS ler metadados (como `@Public()`) de handlers e classes. O método `getAllAndOverride` verifica primeiro o handler (método), depois a classe.

### 7.2 Guard de permissões — `PermissionsGuard`

Roda após o `JwtAuthGuard`. Lê o decorator `@RequirePermissions()` da rota e compara com o array `permissions` do usuário autenticado.

```typescript
// src/modules/auth/infra/guards/permissions.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "@shared/infra/decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // se a rota não tem @RequirePermissions, qualquer usuário autenticado pode acessar
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    const hasPermission = required.every((p) => user?.permissions?.includes(p));
    if (!hasPermission) throw new ForbiddenException("Insufficient permissions");

    return true;
  }
}
```

### 7.3 Serviço de auth

```typescript
// src/modules/auth/application/services/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userService.validateCredentials(dto.email, dto.password);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      permissions: user.permissions,
    });

    return { accessToken };
  }
}
```

### 7.4 Controller

```typescript
// src/modules/auth/infra/controllers/auth.controller.ts
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Public()                     // ← única rota sem autenticação
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
```

### 7.5 Módulo — registrando os guards como globais

O segredo está no `APP_GUARD` do NestJS. Quando você fornece um guard com esse token, ele é aplicado **automaticamente em toda a aplicação** — sem precisar colocar `@UseGuards()` em cada controller.

```typescript
// src/modules/auth/auth.module.ts
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,                       // JwtService disponível em qualquer módulo
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },       // 1º roda
    { provide: APP_GUARD, useClass: PermissionsGuard },   // 2º roda
  ],
})
export class AuthModule {}
```

> A **ordem** dos `APP_GUARD` importa. O `JwtAuthGuard` precisa rodar antes do `PermissionsGuard` porque é ele quem popula `request.user`.

> **Por que `registerAsync` em vez de `register`?** O `register` é síncrono e lê `process.env.JWT_SECRET` durante a inicialização dos módulos, antes do `ConfigModule` terminar de carregar o `.env`. Com `registerAsync` + `ConfigService`, o NestJS aguarda o `ConfigModule` estar pronto antes de configurar o JWT — garantindo que a variável tenha valor.

---

## 8. Registrar no AppModule

```typescript
// src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot(),
    SharedModule,
    UsersModule,
    AuthModule,   // ← deve vir antes dos módulos de domínio
    // demais módulos...
  ],
})
export class AppModule {}
```

---

## 9. Protegendo rotas com permissões

Agora basta adicionar `@RequirePermissions()` nos métodos dos controllers:

```typescript
// exemplo: teachers.controller.ts
import { RequirePermissions } from "@shared/infra/decorators/permissions.decorator";
import { Permission } from "@shared/domain/enums/permission.enum";

@Controller("teachers")
export class TeachersController {

  @Get()
  @RequirePermissions(Permission.TEACHERS_READ)     // precisa de teachers:read
  async findAll() { ... }

  @Post()
  @RequirePermissions(Permission.TEACHERS_WRITE)    // precisa de teachers:write
  async create(@Body() body: TeacherDto) { ... }

  @Delete(":id")
  @RequirePermissions(Permission.TEACHERS_DELETE)   // precisa de teachers:delete
  async remove(@Param("id") id: string) { ... }
}
```

> Rotas **sem** `@RequirePermissions` ainda exigem autenticação — só não têm restrição de permissão específica.

---

## 10. Usando `@CurrentUser()` nos controllers

Para acessar os dados do usuário logado dentro de um controller:

```typescript
import { CurrentUser, type AuthenticatedUser } from "@shared/infra/decorators/current-user.decorator";

@Get("me")
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return { id: user.sub, email: user.email, permissions: user.permissions };
}
```

---

## 11. Gerar e aplicar a migration

Após criar o schema do usuário:

```bash
npm run db:generate   # detecta o novo schema e gera o SQL
npm run db:migrate    # aplica no banco
```

---

## 12. Testando com cURL ou Postman

### Criar um usuário (exemplo de seed manual)
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prof@escola.com",
    "password": "senha123",
    "teacherId": "uuid-do-professor",
    "permissions": ["teachers:read", "students:read", "attendances:write"]
  }'
```

> Na primeira execução, você pode precisar deixar `POST /users` com `@Public()` temporariamente para criar o primeiro usuário administrador.

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "prof@escola.com", "password": "senha123" }'

# Resposta:
# { "accessToken": "eyJhbGci..." }
```

### Acessar rota protegida
```bash
curl http://localhost:3000/teachers \
  -H "Authorization: Bearer eyJhbGci..."
```

### Tentativa sem permissão
```bash
# Usuário com teachers:read tentando deletar → 403 Forbidden
curl -X DELETE http://localhost:3000/teachers/algum-id \
  -H "Authorization: Bearer eyJhbGci..."
```

---

## Resumo da arquitetura

```
src/
├── shared/
│   ├── domain/enums/
│   │   └── permission.enum.ts        ← enum com todas as permissões
│   └── infra/decorators/
│       ├── public.decorator.ts       ← @Public()
│       ├── permissions.decorator.ts  ← @RequirePermissions()
│       └── current-user.decorator.ts ← @CurrentUser()
│
├── modules/
│   ├── users/                        ← CRUD de usuários + validateCredentials
│   └── auth/
│       ├── application/services/
│       │   └── auth.service.ts       ← lógica de login + geração do JWT
│       ├── infra/
│       │   ├── controllers/
│       │   │   └── auth.controller.ts  ← POST /auth/login
│       │   └── guards/
│       │       ├── jwt-auth.guard.ts   ← valida o token (global)
│       │       └── permissions.guard.ts ← verifica permissões (global)
│       └── auth.module.ts            ← registra APP_GUARD globalmente
```

---

## Erros comuns e como resolver

| Erro | Causa | Solução |
|---|---|---|
| `401 Unauthorized` — Missing token | Requisição sem header `Authorization` | Envie `Authorization: Bearer <token>` |
| `401 Unauthorized` — Invalid or expired token | Token expirado ou `JWT_SECRET` diferente | Faça login novamente / verifique o `.env` |
| `403 Forbidden` — Insufficient permissions | Usuário não tem a permissão exigida | Atualize o array `permissions` do usuário |
| `JwtModule` não encontrado | `AuthModule` não importado no `AppModule` | Adicione `AuthModule` nos imports do `AppModule` |
| Guards não estão sendo aplicados | `APP_GUARD` registrado no módulo errado | Registre os guards dentro do `AuthModule` (não no `AppModule`) |
| `secretOrPrivateKey must have a value` | `JwtModule.register()` lê `JWT_SECRET` antes do `ConfigModule` terminar de carregar o `.env` | Use `JwtModule.registerAsync()` com `ConfigService` |
