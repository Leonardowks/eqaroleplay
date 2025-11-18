# Configuração do Supabase - EQA Roleplay

Este guia explica como configurar seu próprio projeto Supabase para o EQA Roleplay.

## 1. Criar Projeto no Supabase

1. Acesse https://supabase.com e faça login/cadastro
2. Clique em **New Project**
3. Preencha:
   - **Name**: EQA Roleplay (ou nome de sua escolha)
   - **Database Password**: Guarde essa senha!
   - **Region**: Escolha a mais próxima (ex: South America)
4. Clique em **Create new project**
5. Aguarde a criação (2-3 minutos)

## 2. Obter Credenciais

1. No Dashboard, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - O **Project ID** está na URL (ex: `abcdefghijk` em `https://abcdefghijk.supabase.co`)

## 3. Atualizar o arquivo .env

Edite o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_PROJECT_ID="seu-project-id"
VITE_SUPABASE_URL="https://seu-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key-aqui"
```

## 4. Rodar as Migrations

### Opção A: Via Supabase CLI (Recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar com seu projeto
supabase link --project-ref seu-project-id

# Rodar migrations
supabase db push
```

### Opção B: Via SQL Editor

1. No Dashboard, vá em **SQL Editor**
2. Para cada arquivo em `supabase/migrations/` (em ordem cronológica):
   - Copie o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run**

## 5. Configurar Secrets das Edge Functions

No Dashboard, vá em **Project Settings** → **Edge Functions** → **Secrets**

Adicione:

| Nome | Descrição | Onde obter |
|------|-----------|------------|
| `OPENAI_API_KEY` | API key da OpenAI | https://platform.openai.com/api-keys |
| `LOVABLE_API_KEY` | API key do Lovable | Sua conta Lovable |
| `ELEVENLABS_API_KEY` | API key do ElevenLabs (opcional) | https://elevenlabs.io/app/settings/api-keys |

## 6. Criar Usuário Admin

### Via SQL Editor:

```sql
-- Primeiro, crie um usuário via Authentication > Users > Add user
-- Depois, copie o User UID e execute:

INSERT INTO user_roles (user_id, role)
VALUES ('COLE_O_USER_UID_AQUI', 'admin');
```

### Verificar usuários existentes:

```sql
SELECT id, email FROM auth.users;
```

## 7. Popular Dados Iniciais (Opcional)

Se as migrations não incluírem dados de exemplo, você pode precisar:

### Criar personas de exemplo:

```sql
INSERT INTO personas (name, role, company, sector, difficulty, description)
VALUES
  ('Ricardo Startup', 'CEO', 'TechStart', 'Tecnologia', 'easy', 'CEO de startup em fase de crescimento'),
  ('Marina E-commerce', 'Diretora', 'ShopOnline', 'E-commerce', 'medium', 'Diretora de operações focada em resultados');
```

### Criar achievement definitions:

Verifique se a tabela `achievement_definitions` já tem dados após rodar as migrations.

## 8. Deploy das Edge Functions

```bash
# Na pasta do projeto
supabase functions deploy realtime-voice
supabase functions deploy chat-roleplay
supabase functions deploy evaluate-competencies
supabase functions deploy generate-insights
```

## 9. Testar a Aplicação

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse http://localhost:8080

3. Crie uma conta ou faça login

4. Teste as funcionalidades

## Troubleshooting

### Erro: "Missing VITE_SUPABASE_URL"
- Verifique se o arquivo `.env` existe e tem as variáveis corretas

### Erro de autenticação
- Verifique se a `anon key` está correta
- Verifique se as RLS policies estão configuradas

### Edge Functions não funcionam
- Verifique se os secrets estão configurados
- Veja os logs em Dashboard > Edge Functions > Logs

### Banco de dados vazio
- Rode todas as migrations em ordem
- Verifique se há erros no SQL Editor

## Estrutura de Pastas do Supabase

```
supabase/
├── functions/           # Edge Functions (backend)
│   ├── chat-roleplay/
│   ├── evaluate-competencies/
│   ├── generate-insights/
│   └── realtime-voice/
└── migrations/          # SQL migrations (schema)
    └── *.sql
```

## Suporte

Para problemas, consulte:
- Documentação Supabase: https://supabase.com/docs
- Lovable Docs: https://docs.lovable.dev
