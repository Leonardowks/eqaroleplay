# 🛠 EQA Roleplay — Guia do Desenvolvedor

## Início Rápido

### Pré-requisitos
- Node.js 18+
- npm/bun

### Setup
```bash
npm install
npm run dev
```

O projeto roda em `http://localhost:8080`.

### Variáveis de Ambiente
As variáveis são gerenciadas automaticamente pelo Lovable Cloud:
- `VITE_SUPABASE_URL` — URL do backend
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Chave pública do Supabase
- `VITE_SUPABASE_PROJECT_ID` — ID do projeto

> ⚠️ **Nunca edite** `.env`, `src/integrations/supabase/client.ts` ou `src/integrations/supabase/types.ts` — são auto-gerados.

---

## Estrutura do Projeto

```
src/
├── App.tsx                  # Router + providers
├── main.tsx                 # Entry point
├── index.css                # Design system (tokens CSS)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── Header.tsx           # Navigation header
│   ├── AdminSidebar.tsx     # Admin panel sidebar
│   ├── CompetencyEvolution.tsx  # Line chart evolução
│   ├── CompetencyHeatmap.tsx    # Heatmap por tipo de reunião
│   ├── KPICards.tsx         # Dashboard KPIs
│   ├── ProtectedRoute.tsx   # Auth guard
│   ├── AdminRoute.tsx       # Admin guard
│   └── SuperAdminRoute.tsx  # SuperAdmin guard
├── contexts/
│   ├── TenantContext.tsx    # Multi-tenant context
│   └── BrandingContext.tsx  # Branding dinâmico
├── hooks/
│   ├── useTenant.ts         # Detecção de tenant
│   ├── useUserRole.ts       # RBAC roles
│   ├── useSettings.ts       # Configurações
│   └── useRealtimeFeedback.ts
├── pages/
│   ├── Auth.tsx             # Login/Signup
│   ├── Dashboard.tsx        # Dashboard principal (tabs)
│   ├── Roleplay.tsx         # Seleção de cenário
│   ├── Chat.tsx             # Chat texto
│   ├── VoiceChat.tsx        # Chat voz
│   ├── History.tsx          # Histórico
│   ├── SessionDetail.tsx    # Detalhe da sessão
│   ├── Join.tsx             # Aceitar convite
│   ├── admin/               # Páginas admin
│   └── superadmin/          # Páginas superadmin
├── utils/
│   ├── pdfGenerator.ts      # Geração de PDFs
│   └── RealtimeAudio.ts     # Audio streaming
└── integrations/
    └── supabase/            # Auto-gerado (não editar)

supabase/
├── config.toml              # Config do projeto (não editar project_id)
├── functions/               # Edge Functions (Deno)
│   ├── chat-roleplay/
│   ├── evaluate-competencies/
│   ├── invite-user/
│   ├── accept-invitation/
│   └── ...
└── migrations/              # SQL migrations (não editar)
```

---

## Convenções

### Código
- **TypeScript** strict — evite `any` quando possível
- **Componentes**: Functional components com hooks
- **Estado**: React Query para server state, useState para UI state
- **Imports**: Use `@/` alias para src/
- **Cores**: SEMPRE use tokens CSS do design system, nunca hardcode

### Naming
- Componentes: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Pages: `PascalCase.tsx`
- Edge Functions: `kebab-case/index.ts`

### RLS
- Toda tabela nova deve ter RLS habilitado
- Use `has_role()` para checar roles
- Use `is_superadmin()` para superadmin
- Use `is_org_member()` para filtro por organização
- **Nunca** armazene roles na tabela de profiles

### Edge Functions
- CORS headers em TODAS as respostas (incluindo erros)
- Valide JWT com `getClaims()` em endpoints autenticados
- Use `service_role` para operações admin server-side
- Valide input com schemas (zod ou manual)
- Retorne erros com status codes corretos

---

## Multi-Tenancy

O sistema usa tenant detection por:
1. **Subdomain**: `empresa.app.com` → slug `empresa`
2. **Custom domain**: `treinamento.empresa.com`
3. **Impersonation**: localStorage `superadmin_viewing_org`
4. **Default**: Config padrão para localhost/dev

### Como filtrar dados por org:
```typescript
const { organization } = useTenantContext();

// Em queries, filtrar por organization_id quando a tabela tem esse campo
const { data } = await supabase
  .from('personas')
  .select('*')
  .eq('organization_id', organization?.id);
```

---

## Testes

### Testando Edge Functions
```bash
# Via curl
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/function-name \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Testando RLS
Sempre verifique que:
1. User vê apenas seus dados
2. Admin vê dados da org
3. SuperAdmin vê tudo
4. Anon não vê dados protegidos

---

## Deploy

O deploy é automático via Lovable. Edge functions são deployed com a ferramenta `deploy_edge_functions`.

### Checklist pré-deploy
- [ ] Sem erros de build
- [ ] RLS policies para tabelas novas
- [ ] CORS headers em edge functions
- [ ] Input validation
- [ ] Testes manuais do fluxo

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Dados não aparecem | Checar RLS policies |
| Edge function 401 | Verificar JWT token no header |
| Edge function CORS error | Adicionar corsHeaders em TODAS as respostas |
| Types não atualizam | Aguardar regeneração automática |
| Tenant não detecta | Verificar slug/domain no DB |
