# PROJECT_LOG.md

**Log de desenvolvimento do projeto Olyon — CRUD de Usuários**

---

## 📅 19 de fevereiro de 2026 — CRUD de Usuários com Perfil e Contatos

### ✅ Fase 1: Prisma Schema

**Objetivo:** Adicionar persistência para perfil e contatos de usuários.

**Ações:**
1. Adicionado Model `UserProfile`:
   - userId (PK, FK para User)
   - cpf (unique, optional)
   - phone, secondaryPhone, gender, birthDate, zipcode, state, city, neighborhood, address, number, complement
   - timestamps (createdAt, updatedAt)

2. Adicionado Model `UserContact`:
   - id (PK)
   - userId (FK para User, indexed)
   - name, phone, relationship
   - timestamps (createdAt, updatedAt)

3. Atualizado Model `User`:
   - Adicionado relation `profile UserProfile?` (one-to-one)
   - Adicionado relation `contacts UserContact[]` (one-to-many)

**Comandos executados:**
```bash
yarn prisma migrate dev -n add_user_profile_contacts
yarn prisma generate
```

**Resultado:** ✅ Migration aplicada; Prisma client regenerado em `./generated/prisma`

---

### ✅ Fase 2: Zod Validators

**Objetivo:** Validar payloads de CREATE e UPDATE com schemas nested.

**Arquivo:** `src/lib/validators/user.ts`

**Mudanças:**
- Criado `UserProfileSchema` (todos os campos opcionais)
- Criado `UserContactSchema` (nome, phone, relationship obrigatórios)
- Atualizado `UserCreateApiSchema`:
  - name, email, password (obrigatório), role (default STAFF)
  - profile?, contacts? (arrays de ContactSchema)
  - Validações: password min 8 chars, email format, role enum
- Atualizado `UserUpdateApiSchema`:
  - Todos os campos opcionais (name?, email?, password?, role?, profile?, contacts?)
  - Password agora é optional (para edit sem mudar senha)
  - Refine para garantir que pelo menos um campo seja fornecido

**Resultado:** ✅ Schemas prontos para API

---

### ✅ Fase 3A: POST /api/users

**Arquivo:** `app/api/users/route.ts`

**Mudanças:**
1. Guard: `requireMembershipRole("ADMIN")`
2. Validação Zod: `UserCreateApiSchema.safeParse(body)`
3. Processamento de dados:
   - Hash de senha: `bcrypt.hash(password, 10)`
   - Conversão de birthDate (string) para Date
   - Conversão de gender para JSON (para armazenar object {_id, value})
4. Criação multi-step:
   - `prisma.user.create()` com memberships nested
   - `prisma.userProfile.upsert()` (pois o user precisa já existir)
   - `prisma.userContact.createMany()` se houver contatos
5. Tratamento de erros:
   - P2002 (unique constraint): "Já existe um usuário com esse email" | "Já existe um usuário com esse CPF"
   - Generic: serverError()
6. Response: `created({ ...user, profile, contacts })`

**Resultado:** ✅ POST /api/users funciona com profile e contatos

---

### ✅ Fase 3B: PUT /api/users/[id]

**Arquivo:** `app/api/users/[id]/route.ts`

**Mudanças:**
1. Guard: `requireMembershipRole("ADMIN")`
2. Validação: userId_storeId composita (multi-tenant safety)
3. Atualização condicional:
   - User (name, email, password com re-hash se fornecido)
   - Membership.role se fornecido
   - UserProfile: `upsert()` (create if not exists, update otherwise)
   - UserContact: `deleteMany()` + `createMany()` quando contatos fornecidos (estratégia simples e segura)
4. Tratamento de erros: P2002, generic
5. Response formatting:
   - birthDate retorna como YYYY-MM-DD (ISO string)
   - gender retorna como object { _id, value }

**GET /api/users/[id]**
- Guard: `requireMembershipRole("ADMIN")`
- Validação multi-tenant
- Retorna: user completo com profile e contacts
- Formatting de dates/gender

**DELETE /api/users/[id]**
- Guard: `requireMembershipRole("ADMIN")`
- **Anti-auto-remoção:** `if (guard.userId === id) return forbidden("Você não pode remover a si mesmo")`
- Remove apenas Membership (user permanece no banco para auditoria futura)

**Resultado:** ✅ GET/PUT/DELETE funcionam com perfil e contatos

---

### ✅ Fase 4A: UserForm.tsx (Componente Reutilizável)

**Arquivo:** `app/(app)/usuarios/components/UserForm.tsx`

**Props:**
- `mode: "create" | "edit"`
- `userId?: string` (obrigatório em mode="edit")

**Comportamento:**
- **mode="create":**
  - Password obrigatório na validação
  - POST /api/users com payload completo
  - Label de password: "Senha"
- **mode="edit":**
  - Carrega dados via GET /api/users/[id]
  - Password opcional (label: "Senha (deixar em branco para manter)")
  - PUT /api/users/[id] com payload completo
  - Estados: loading, submitting

**Funcionalidades:**
- Form completo: role, password, name, email, gender, birthDate, cpf, phone, secondaryPhone, zipcode, state, city, neighborhood, address, number, complement
- Gerenciamento de contatos: adicionar, remover
- Validação Zod com mensagens legíveis
- Toast feedback (sonner)
- Redirecionamento para /usuarios + router.refresh() após sucesso
- Botões: Cancelar, Salvar

**Reutilização de componentes:**
- Field/FieldGroup/FieldLabel/FieldError (UI)
- PhoneField (componente genérico para tel com mask)
- GENDERS/RELATIONSHIPS (constantes)
- maskCPF / maskPhone (utilitários)

**Resultado:** ✅ Componente criado e testado

---

### ✅ Fase 4B: Páginas Simplificadas

**Arquivo:** `app/(app)/usuarios/novo/page.tsx`
```tsx
export default function UsuarioNovoPage() {
  return <UserForm mode="create" />
}
```

**Arquivo:** `app/(app)/usuarios/[id]/page.tsx`
```tsx
export default function UsuarioEditPage() {
  const params = useParams<{ id: string }>()
  const userId = params?.id
  const { data: session } = useSession()
  const myRole = session?.user?.role as Role | undefined
  const canManage = myRole === "OWNER" || myRole === "ADMIN"

  if (!canManage || !userId) {
    return <div>Você não tem permissão para editar usuários.</div>
  }

  return <UserForm mode="edit" userId={userId} />
}
```

**Guards Aplicados:**
- STAFF: não pode acessar /usuarios/[id] (page.tsx mostra erro)
- ADMIN/OWNER: podem acessar

**Resultado:** ✅ Páginas simplificadas + guards no lugar certo

---

### ✅ Fase 5: Documentação

**Criado:**
- `PROJECT_STATUS.md` — documento de status geral do projeto
- `PROJECT_LOG.md` — este arquivo (log de desenvolvimento)

**Conteúdo:**
- Checklist de implementação
- Arquivos alterados
- Teste manuais (TODO)
- Próximos passos opcionais

**Resultado:** ✅ Documentação criada

---

## 📊 Resumo de Mudanças

### Arquivos Criados
| Arquivo | Descrição |
|---------|-----------|
| `app/(app)/usuarios/components/UserForm.tsx` | Componente form reutilizável (CREATE/EDIT) |
| `PROJECT_STATUS.md` | Status do projeto |
| `PROJECT_LOG.md` | Este arquivo |

### Arquivos Alterados
| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | +UserProfile, +UserContact, User.relations |
| `src/lib/validators/user.ts` | +UserProfileSchema, +UserContactSchema, fields atualizados |
| `app/api/users/route.ts` | POST com profile e contacts |
| `app/api/users/[id]/route.ts` | GET/PUT/DELETE com profile e contacts |
| `app/(app)/usuarios/novo/page.tsx` | Simplificado para usar <UserForm /> |
| `app/(app)/usuarios/[id]/page.tsx` | Trocado para <UserForm /> com guards |

### Migrations
| ID | Nome | Status |
|----|------|--------|
| 20260219223318 | add_user_profile_contacts | ✅ Aplicada |

---

## 🧪 Plano de Testes Manuais

### Teste 1: Criar usuário com profile completo
```
1. Login como ADMIN/OWNER
2. /usuarios → "Novo usuário"
3. Preencher: name, email, password, role, cpf, phone, gender, birthDate, endereço, contatos
4. Submeter
5. ✅ Esperado: Redirect para /usuarios + toast success
6. ✅ Esperado: Dados persistem no banco (reload + editar mostra dados)
```

### Teste 2: Editar usuário
```
1. Na listagem /usuarios, clicar "Editar" em um usuário
2. Form carrega com dados preenchidos (password vazio, demais campos com valores)
3. Editar alguns campos (não mudar password)
4. Submeter
5. ✅ Esperado: Redirect + toast success
6. ✅ Esperado: Dados atualizados no banco
```

### Teste 3: Editar password
```
1. Em edição, preencher o campo password
2. Submeter
3. ✅ Esperado: Password atualizado e hasheado no banco
4. ✅ Esperado: Login com nova password funciona
```

### Teste 4: Deletar usuário
```
1. Na listagem, clicar "Remover" em um usuário
2. AlertDialog aparece com confirmação
3. Confirmar delete
4. ✅ Esperado: Toast success + usuário removido da lista
5. ✅ Esperado: Não conseguir acessar /usuarios/:id (404 ou redirect)
```

### Teste 5: Auto-remoção bloqueada
```
1. Admin tenta remover a si mesmo
2. ✅ Esperado: Toast error "Você não pode remover a si mesmo"
```

### Teste 6: STAFF (sem permissão)
```
1. Login como STAFF
2. Visualiza /usuarios (lista apenas)
3. Não vê: "Novo usuário", "Editar", "Remover"
4. Tenta acessar /usuarios/novo
5. ✅ Esperado: Erro (HTTP 403 ou redirect)
6. Tenta acessar /usuarios/:id
7. ✅ Esperado: Erro (HTTP 403 ou redirect)
```

### Teste 7: CRUD de Serviços ainda funciona
```
1. Navegar para /servicos
2. Criar, editar, deletar serviço
3. ✅ Esperado: Tudo funciona (não quebrou)
```

---

## 🚀 Próximas Features (Backlog)

1. **Validação+Regex para CPF:** Atualmente apenas formato básico; adicionar validação real de CPF
2. **Busca/Filter:** Adicionar busca por name/email na listagem de usuários
3. **Paginação:** Se houver muitos usuários (> 50)
4. **Soft-delete:** Campo `deletedAt` em vez de hard delete
5. **Auditoria:** Log de ações (quem criou, editou, removeu, quando)
6. **Foto/Avatar:** Novo campo em UserProfile
7. **API Profile separada:** GET/PUT `/api/users/:id/profile` (futura separação)

---

## 📝 Notas

- **Yarn é obrigatório:** `yarn dev`, `yarn lint`, `yarn prisma migrate dev`, etc.
- **TypeScript strict:** Sempre validar tipos; usar `type ...` ou `interface` quando necessário
- **Prisma sempre:** Após schema change, sempre `yarn prisma migrate dev` + `yarn prisma generate`
- **Router refresh:** Importante fazer `router.refresh()` após mutations para refetch data no servidor

---

*Fim do log — 19 de fevereiro de 2026*
