# 📚 EQA Roleplay — Knowledge Base

## 1. Visão Geral

**EQA Roleplay** é uma plataforma SaaS multi-tenant de treinamento de vendas com IA.  
Vendedores praticam conversas simuladas (roleplay) com personas de IA, recebem avaliações por competência e acompanham sua evolução.

### Stack Tecnológico
| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | Tailwind CSS v3 + shadcn/ui + Radix |
| Charts | Recharts |
| State | React Query (TanStack) |
| Backend | Supabase (Lovable Cloud) |
| Edge Functions | Deno (Supabase Edge Functions) |
| AI | OpenAI GPT via Supabase AI proxy |
| Auth | Supabase Auth (email + password) |

---

## 2. Arquitetura Multi-Tenant

### Modelo de Dados
```
organizations (tenant root)
├── organization_members (user ↔ org)
├── profiles (user metadata, org_id)
├── personas (AI personas per org)
├── roleplay_sessions (user sessions)
│   ├── session_messages
│   ├── competency_scores
│   ├── session_recommendations
│   └── session_quality_metrics
├── user_roles (RBAC)
├── invitations (invite flow)
└── company_config (JSONB on organizations)
```

### Tenant Detection (`useTenant.ts`)
1. Check `localStorage` for `superadmin_viewing_org` (impersonation)
2. Extract subdomain from hostname → query `organizations.slug`
3. Check `custom_domain` match
4. Fallback: default config (dev mode)

### company_config Schema
```typescript
{
  company_name: string;
  segment: string;
  product_description: string;
  ticket_range: string;
  sales_cycle: string;
  icp: {
    buyer_role: string;
    main_pains: string[];
    common_objections: string[];
    sophistication_level: 'iniciante' | 'intermediario' | 'avancado';
  };
  methodology: 'SPIN' | 'BANT' | 'Challenger Sale' | 'Sandler' | 'Consultiva' | 'Nenhuma';
  sales_stages: string[];
  competencies: string[];
  competency_weights?: Record<string, number>;
  tone: string;
}
```

---

## 3. Roles & Permissões

| Role | Acesso |
|------|--------|
| `user` | Dashboard, Roleplay, Histórico, Ranking |
| `admin` | Tudo do user + Admin panel (personas, users, settings, competencies, branding) |
| `superadmin` | Tudo do admin + Gerenciar todas as organizações, impersonar |

Roles são armazenados em `user_roles` (tabela separada) com RLS via `has_role()` function.

---

## 4. Edge Functions

| Function | Propósito | Auth |
|----------|-----------|------|
| `chat-roleplay` | Gera respostas da persona IA no roleplay | JWT |
| `evaluate-competencies` | Avalia competências após sessão | JWT |
| `generate-insights` | Gera relatório de performance com IA | JWT |
| `generate-personas` | Gera personas via IA | JWT |
| `cleanup-sessions` | Limpa sessões órfãs | JWT |
| `realtime-voice` | Proxy para voz em tempo real | JWT |
| `analyze-spin` | Análise SPIN da conversa | JWT |
| `invite-user` | Cria convite para vendedor | JWT (admin) |
| `accept-invitation` | Aceita convite e cria conta | Public (service_role) |

---

## 5. Fluxos Principais

### Fluxo de Roleplay (Chat)
1. User seleciona persona + etapa de venda + método (texto/voz)
2. Sessão criada em `roleplay_sessions`
3. Cada mensagem → `chat-roleplay` edge function → resposta IA
4. Mensagens salvas em `session_messages`
5. User finaliza → `evaluate-competencies` chamado
6. Scores salvos em `competency_scores`
7. Recomendações salvas em `session_recommendations`

### Fluxo de Convite
1. Admin clica "Convidar Vendedor" em AdminUsers
2. `invite-user` edge function cria registro em `invitations`
3. Link `/join/{token}` gerado e copiado
4. Vendedor acessa link → página Join.tsx
5. `accept-invitation` edge function cria: auth user, profile, org_member, user_role
6. Vendedor faz login normalmente

### Fluxo de Impersonação (SuperAdmin)
1. SuperAdmin acessa `/superadmin/organizations`
2. Clica "Visualizar" em uma org
3. `superadmin_viewing_org` salvo no localStorage
4. `window.location.href = '/admin'` → TenantContext carrega org impersonada
5. Banner amarelo visível: "Visualizando como: {org.name}"
6. "Sair" remove localStorage e redireciona

---

## 6. Tabelas do Banco de Dados

### Core Tables
- **organizations** — Tenants raiz com `company_config` JSONB
- **organization_members** — Associação user ↔ org com role
- **profiles** — Nome, avatar, org_id do usuário
- **user_roles** — RBAC (`admin`, `moderator`, `user` enum + `superadmin`)
- **invitations** — Convites pendentes com token UUID e expiração 7 dias

### Session Tables
- **roleplay_sessions** — Sessões de prática (user, persona, scores, status)
- **session_messages** — Histórico de mensagens da conversa
- **competency_scores** — Pontuação por competência por sessão
- **session_recommendations** — Recomendações de melhoria geradas pela IA
- **session_quality_metrics** — Métricas técnicas de qualidade (latência, erros)

### Gamification
- **achievement_definitions** — Definições de conquistas
- **user_achievements** — Conquistas desbloqueadas por usuário
- **user_insights** — Análises de IA sobre o progresso do usuário
- **advanced_rankings** (view) — Ranking com métricas agregadas

### Reference
- **competency_criteria** — Critérios detalhados de avaliação por competência
- **personas** — Personas de IA (nome, empresa, dificuldade, traits)

---

## 7. RLS Policies (Resumo)

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| organizations | org_member OR superadmin | authenticated | owner OR superadmin | ❌ |
| profiles | own OR admin | own | own | ❌ |
| user_roles | own OR admin | admin | admin | admin |
| roleplay_sessions | own OR admin | own | own | admin |
| session_messages | own OR admin | own | ❌ | admin |
| competency_scores | own OR admin | own | ❌ | admin |
| invitations | admin/superadmin OR anon(token) | admin | admin OR anon(pending) | ❌ |
| personas | authenticated | ❌ | ❌ | ❌ |

---

## 8. Design System

- **Theme**: Dark-first (dark backgrounds: `220 25% 15%`)
- **Primary**: Blue (`213 100% 50%`)
- **Secondary**: Purple (`262 80% 65%`)
- **Accent**: Cyan (`174 100% 50%`)
- **Gradients**: Primary gradient = cyan→green; Secondary = blue→purple
- **Radius**: `0.75rem`
- **Font**: System stack
- **Idioma**: Português (BR)

---

## 9. Páginas e Rotas

### Públicas
| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/auth` | Auth.tsx | Login/Cadastro |
| `/join/:token` | Join.tsx | Aceitar convite |

### Protegidas (user)
| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/dashboard` | Dashboard.tsx | KPIs + evolução + radar |
| `/roleplay` | Roleplay.tsx | Seleção de persona/cenário |
| `/chat` | Chat.tsx | Chat texto com IA |
| `/voice-chat` | VoiceChat.tsx | Chat por voz com IA |
| `/history` | History.tsx | Histórico de sessões |
| `/history/:id` | SessionDetail.tsx | Detalhe de sessão |
| `/compare` | Compare.tsx | Comparar sessões |
| `/ranking` | Ranking.tsx | Ranking de usuários |
| `/active-sessions` | ActiveSessions.tsx | Sessões ativas |

### Admin
| Rota | Componente |
|------|-----------|
| `/admin` | AdminDashboard |
| `/admin/users` | AdminUsers |
| `/admin/personas` | AdminPersonas |
| `/admin/sessions` | AdminSessions |
| `/admin/settings` | AdminSettings |
| `/admin/branding` | AdminBranding |
| `/admin/onboarding` | AdminOnboarding |
| `/admin/competencies` | AdminCompetencies |
| `/admin/prompt-preview` | AdminPromptPreview |

### SuperAdmin
| Rota | Componente |
|------|-----------|
| `/superadmin/organizations` | OrganizationsList |

---

## 10. Dependências Críticas

- `@supabase/supabase-js` — Client SDK
- `@tanstack/react-query` — Cache e estado do servidor
- `recharts` — Gráficos (radar, linhas, barras)
- `react-router-dom` — Roteamento SPA
- `jspdf` + `jspdf-autotable` — Geração de relatórios PDF
- `lucide-react` — Ícones
- `date-fns` — Formatação de datas (locale ptBR)
- `zod` — Validação de schemas
