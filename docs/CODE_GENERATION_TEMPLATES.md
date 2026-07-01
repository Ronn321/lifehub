# CODE_GENERATION_TEMPLATES.md

# LifeHub Code Templates

Version: 1.0

---

# Purpose

Standardisierte Boilerplates für alle Domains.
Alle Domains MUST follow these patterns.

Diese Templates sind **bewusst knapp** gehalten — sie zeigen die Grundform, die jede Domain einhalten muss. Die produktionsreife Implementierung (mit Drizzle-Queries, zod-Validation, NestJS-Guards, TanStack-Query etc.) leitet sich aus `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` und `TECH_STACK.md` ab.

---

# 1. DOMAIN STRUCTURE TEMPLATE

```text
domain/
  entities/
  services/
  repositories/
  api/
  ui/
  tests/
  migrations/
```

---

# 2. ENTITY TEMPLATE

```ts
export class EntityName {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public createdAt: Date,
    public updatedAt: Date
  ) {}
}
```

---

# 3. SERVICE TEMPLATE

```ts
export class DomainService {
  constructor(
    private repository: DomainRepository
  ) {}

  async create(input: CreateInput) {
    return this.repository.create(input);
  }

  async getById(id: string) {
    return this.repository.findById(id);
  }
}
```

---

# 4. REPOSITORY TEMPLATE

```ts
export class DomainRepository {
  async create(data: any) {}
  async findById(id: string) {}
  async update(id: string, data: any) {}
  async delete(id: string) {}
}
```

**Anmerkung (für produktionsreife Implementierung):** Im echten Code sind Repositories typisiert und nutzen Drizzle-Queries mit `where deletedAt IS NULL` (Soft Delete) und `where ownerId = ?` (Multi-Tenant-Isolation). Siehe `DATABASE_SCHEMA.md` §3 für die verbindlichen Spalten-Konventionen.

---

# 5. API TEMPLATE (NestJS style)

```ts
@Controller('domain')
export class DomainController {
  constructor(private service: DomainService) {}

  @Post()
  create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
```

**Anmerkung:** In der produktionsreifen Variante sind alle Controller mit `JwtGuard` + `PermissionGuard` und `@RequirePermission('domain.action')` versehen. Siehe `ARCHITECTURE.md` §4.1 und §8.2.

---

# 6. DB SCHEMA TEMPLATE (PostgreSQL)

```sql
CREATE TABLE domain_entity (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

**Anmerkung:** Im echten Schema verwenden wir `TIMESTAMPTZ`, ein dediziertes Schema pro Bounded Context (z.B. `media.media_files`), `owner_id UUID NOT NULL REFERENCES public.users(id)`, Indizes auf `(owner_id) WHERE deleted_at IS NULL` und Audit-Trigger. Siehe `DATABASE_SCHEMA.md` §3 für die globalen Konventionen und §5–§18 für die Domain-Schemas.

---

# 7. UI TEMPLATE (Next.js)

```tsx
export default function Page() {
  return (
    <div className="p-4">
      <h1>Domain Page</h1>
    </div>
  );
}
```

**Anmerkung:** Produktionsreife Next.js 14 App-Router Pages nutzen Server Components, shadcn/ui-Komponenten, `Suspense` mit Skeleton, TanStack Query, dark/light/theme. Siehe `UI_UX.md` §4 für App-Shell und §6 für Domain-Detaillayouts.

---

# 8. PERMISSION TEMPLATE

```ts
export enum DomainPermission {
  READ = "read",
  WRITE = "write",
  DELETE = "delete"
}
```

**Anmerkung:** Im verbindlichen Modell sind Permissions Strings der Form `'<domain>.<action>'` mit 6 Actions (`read`, `create`, `update`, `delete`, `share`, `admin`) × 16 Domains = 96 Permissions. Siehe `DATABASE_SCHEMA.md` §4.4.

---

# 9. EVENT TEMPLATE

```ts
export class DomainCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly userId: string
  ) {}
}
```

**Anmerkung:** Events werden über `shared/events/events.service.ts` per BullMQ emittiert und in `public.domain_events` (Outbox-Pattern) transaktionssicher persistiert. Konsumenten sind Search-Indexer, Audit-Logger und Plugin-Hooks. Siehe `ARCHITECTURE.md` §10.

---

# RULE

**All domains MUST use these templates unless explicitly overridden.**

Überschreibungen werden in `docs/adr/NNNN-title.md` als Architecture Decision Record dokumentiert.
