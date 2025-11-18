# Checklist de Melhorias - EQA Roleplay

> Documento de acompanhamento de melhorias e correções do projeto.
> Última atualização: 18/11/2025

---

## Problemas Críticos

### Segurança
- [ ] **Criptografar API Keys no banco de dados**
  - Arquivo: `supabase/migrations/20251118_admin_settings.sql`
  - Usar pgcrypto ou Supabase Vault
  - Impacto: OpenAI, ElevenLabs, Lovable keys expostas em backups

### Autenticação e Autorização
- [ ] **Adicionar trigger para role padrão de usuário**
  - Arquivo: Criar nova migration
  - Problema: Novos usuários não recebem role 'user' automaticamente
  - Solução: Trigger no signup para inserir em `user_roles`

- [ ] **Inserir role admin para usuário existente**
  ```sql
  INSERT INTO user_roles (user_id, role)
  VALUES ('7f8ca285-03d0-423c-8ab1-1c4e6fc4cf31', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  ```

### Banco de Dados
- [ ] **Configurar limpeza automática de sessões abandonadas**
  - Arquivos: `20251116004022.sql`, `20251116013857.sql`
  - Solução: Configurar pg_cron para chamar `cleanup_abandoned_sessions()`

- [ ] **Corrigir race condition no useUserRole**
  - Arquivo: `src/hooks/useUserRole.ts:13-19`
  - Problema: Chamadas concorrentes a `loadRoles`

---

## Problemas Altos

### Type Safety
- [ ] **Substituir tipo `any` por interfaces apropriadas**
  - `src/pages/Chat.tsx:39` - `useState<any>`
  - `src/pages/VoiceChat.tsx:46` - `useState<any>`
  - `src/pages/Dashboard.tsx:25` - `useState<any>`
  - Criar interface User e substituir

- [ ] **Regenerar tipos TypeScript do Supabase**
  - Comando: `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts`
  - Tabelas faltando: `system_settings`, `api_configurations`, `branding`, `feature_flags`

### Error Handling
- [ ] **Adicionar null check em Chat.tsx**
  - Arquivo: `src/pages/Chat.tsx:93-106`
  - Problema: `location.state` acessado sem validação
  - Solução: Verificar state antes de usar propriedades

- [ ] **Corrigir memory leak no WebSocket (VoiceChat)**
  - Arquivo: `src/pages/VoiceChat.tsx:441-846`
  - Problema: Event listeners não são limpos em reconexão

### Performance
- [ ] **Adicionar índices em colunas frequentemente consultadas**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_competency_scores_session_id ON competency_scores(session_id);
  CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);
  ```

### Views e Queries
- [ ] **Corrigir view advanced_rankings**
  - Arquivo: Migration `20251116024945`
  - Problema: Código espera `best_competency` que não existe
  - Arquivo afetado: `src/pages/Ranking.tsx:75`

---

## Problemas Médios

### Validação de Dados
- [ ] **Adicionar constraint CHECK em overall_score**
  ```sql
  ALTER TABLE roleplay_sessions
  ADD CONSTRAINT check_overall_score
  CHECK (overall_score >= 0 AND overall_score <= 10);
  ```

- [ ] **Validar competency_names contra enum**
  - Problema: Nomes de competência são texto livre sem validação

### Código
- [ ] **Centralizar constantes (meeting types, status)**
  - Criar arquivo: `src/constants/index.ts`
  - Meeting types: `'prospection'`, `'discovery'`, `'presentation'`, `'negotiation'`
  - Session statuses: `'active'`, `'completed'`

- [ ] **Padronizar error handling**
  - Problema: Alguns components usam try-catch, outros ignoram erros
  - Solução: Criar hook `useAsyncOperation` ou padrão consistente

### RLS Policies
- [ ] **Revisar policy "Public settings are readable by all"**
  - Arquivo: `20251118_admin_settings.sql:87-90`
  - Problema: `is_public = true` pode expor dados sensíveis
  - Solução: Renomear para `is_ui_visible` e documentar melhor

### React Hooks
- [ ] **Corrigir dependências em useCallback (VoiceChat)**
  - Arquivo: `src/pages/VoiceChat.tsx:439`
  - Problema: `playElevenLabsAudio` com deps incompletas

---

## Problemas Baixos

### Configuração TypeScript
- [ ] **Habilitar strict mode no TypeScript**
  - Arquivo: `tsconfig.app.json`
  - Mudanças:
    - `"strict": true`
    - `"noImplicitAny": true`
    - `"noUnusedLocals": true`
    - `"noUnusedParameters": true`

### Performance
- [ ] **Adicionar debouncing em updates frequentes**
  - Arquivo: `src/pages/Chat.tsx:184, 227`
  - Problema: Múltiplos re-renders durante streaming de mensagens

### Debug
- [ ] **Adicionar retorno nas funções de cleanup**
  - Funções: `cleanup_abandoned_sessions`, `cleanup_abandoned_voice_sessions`
  - Problema: Retornam void, difícil debugar

---

## Melhorias Futuras

### Features
- [ ] **Implementar analytics/logging centralizado**
  - Problema: Erros logados apenas no console
  - Solução: Integrar Sentry ou similar

- [ ] **Adicionar políticas DELETE para LGPD/GDPR**
  - Tabelas: `profiles`, `roleplay_sessions`, `session_messages`
  - Usuários devem poder deletar seus próprios dados

- [ ] **Implementar criptografia de API keys**
  - Usar pgcrypto:
    ```sql
    UPDATE api_configurations
    SET api_key = pgp_sym_encrypt(api_key, 'secret_key');
    ```

### UI/UX
- [ ] **Adicionar loading states consistentes**
- [ ] **Melhorar mensagens de erro para o usuário**
- [ ] **Adicionar feedback visual durante operações async**

### Testes
- [ ] **Adicionar testes unitários para hooks**
- [ ] **Adicionar testes de integração para fluxos principais**
- [ ] **Testar RLS policies comprehensivamente**

---

## Histórico de Alterações

| Data | Descrição | Status |
|------|-----------|--------|
| 18/11/2025 | Análise inicial do projeto | Completo |
| 18/11/2025 | Criado sistema admin (Settings, Branding) | Completo |
| 18/11/2025 | Criado checklist de melhorias | Completo |

---

## Como Usar Este Documento

1. **Marcar como completo**: Altere `- [ ]` para `- [x]`
2. **Adicionar novas melhorias**: Adicione na seção apropriada
3. **Priorizar**: Comece pelos Problemas Críticos

---

## Comandos Úteis

```bash
# Regenerar tipos TypeScript
npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts

# Rodar build para verificar erros
npm run build

# Verificar tipos
npx tsc --noEmit
```

---

## Contato

Para dúvidas sobre as melhorias, consulte a documentação ou o histórico de commits.
