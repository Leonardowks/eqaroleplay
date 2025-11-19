# Roadmap de Melhorias - EQA Roleplay

## Visão Geral
Este documento contém as melhorias planejadas para tornar o sistema de treinamento mais autêntico e eficaz.

---

## ALTA PRIORIDADE

### 1. Feedback em Tempo Real Durante o Roleplay
**Status:** ✅ Implementado

**Descrição:**
Adicionar indicadores visuais durante a sessão mostrando quando o vendedor está praticando bem uma competência específica, em tempo real.

**Implementação:**
- ✅ Componente `RealTimeFeedbackIndicator` com indicadores por competência SPIN
- ✅ Sugestões contextuais (ex: "Faça mais perguntas de implicação")
- ✅ Score parcial atualizado a cada 2 mensagens do usuário
- ✅ Análise em tempo real usando Edge Function `analyze-spin`
- ✅ Hook `useRealtimeFeedback` para gerenciar estado
- ✅ Integrado em Chat.tsx e VoiceChat.tsx

**Arquivos criados:**
- `src/components/RealTimeFeedbackIndicator.tsx`
- `src/hooks/useRealtimeFeedback.ts`
- `supabase/functions/analyze-spin/index.ts`

**Impacto:** +40-50% efetividade no aprendizado

---

### 2. Sistema de Metas e Progresso Estruturado
**Status:** Planejado

**Descrição:**
Definir metas específicas de treinamento (ex: "Alcançar 80 em Implicação em 5 dias") com rastreamento semanal/mensal.

**Implementação:**
- Tabela `training_goals` e `goal_progress`
- Dashboard visual com progresso em relação às metas
- Notificações quando aproximando da meta ou atrasado
- Recomendação automática de próximas metas

**Impacto:** +50% engajamento

---

### 3. Análise de Padrões de Objeções e Estratégias de Resposta
**Status:** Planejado

**Descrição:**
Criar um módulo que identifica padrões em como o vendedor lida com objeções e recomenda estratégias baseadas em dados.

**Implementação:**
- Tabela `objection_handling_patterns`
- Parser para extrair objeções do histórico de conversas
- Análise de sucesso/falha nas respostas
- Recomendações baseadas em padrões similares bem-sucedidos

**Impacto:** Melhora taxa de conversão em simulações

---

### 4. Calibração e Validação de Avaliações
**Status:** Planejado

**Descrição:**
Implementar um sistema onde avaliações de IA são validadas por instrutores humanos.

**Implementação:**
- Coluna `evaluation_status` em competency_scores
- Dashboard de revisão para instrutores
- Sistema de feedback que melhora os prompts de IA

**Impacto:** +60% confiança no sistema

---

### 5. Segmentação de Personas por Perfil de Objeção
**Status:** Planejado

**Descrição:**
Criar sub-categorias de personas com padrões de objeção únicos.

**Implementação:**
- Campo `objection_profile` nas personas
- Tabela `persona_objection_patterns`
- Histórico de relacionamento com a persona

**Impacto:** Treino mais realista e autêntico

---

## MÉDIA PRIORIDADE

### 6. Análise Comparativa com Pares (Benchmarking)
**Descrição:** Mostrar ao vendedor como seu desempenho se compara com vendedores similares.
**Impacto:** Aumenta competitividade saudável e motivação

### 7. Modo "Prática Deliberada" com Repetição Focada
**Descrição:** Modo de treino que identifica a competência mais fraca e força prática nela.
**Impacto:** Accelera aprendizado em 30-40%

### 8. Análise de Linguagem Corporal e Tom de Voz
**Descrição:** Para sessions via voz, analisar tom, velocidade de fala, pausas.
**Impacto:** Melhora autenticidade das avaliações

### 9. Sistema de Peer Review
**Descrição:** Treinandos assistem e avaliam sessões de pares.
**Impacto:** Aumenta aprendizado social

### 10. Agenda de Treinamento com Lembretes
**Descrição:** Sistema para agendar sessões futuras e receber lembretes.
**Impacto:** +35% consistência

### 11. Análise de Roteiros de Venda Eficazes
**Descrição:** Extrair e documentar roteiros que levam a melhor desempenho.
**Impacto:** Cria base de conhecimento coletivo

---

## BAIXA PRIORIDADE

### 12. Gamificação Avançada: Conquistas Sazonais e Eventos
**Descrição:** Eventos temporários com achievements especiais.

### 13. Integração com Calendário (Google Calendar / Outlook)
**Descrição:** Sincronizar agendamentos com calendário profissional.

### 14. Análise de Sentimento do Chat
**Descrição:** Análise do tom emocional das conversas.

### 15. Badges Visuais Customizáveis e Profiles
**Descrição:** Perfis públicos com badges conquistadas.

---

## Cronograma

| Fase | Prazo | Melhorias |
|------|-------|-----------|
| 1 | 2-3 semanas | 1, 2, 3 |
| 2 | 4-6 semanas | 4, 6, 11 |
| 3 | 8-12 semanas | 7, 10, 9 |
| 4 | Longo prazo | 8, 5, 12-15 |

---

## Matriz de Priorização

| # | Título | Prioridade | Impacto | Esforço | ROI |
|---|--------|-----------|--------|--------|-----|
| 1 | Feedback em Tempo Real | ALTA | Muito Alto | Alto | Excelente |
| 2 | Sistema de Metas | ALTA | Muito Alto | Médio | Excelente |
| 3 | Análise de Objeções | ALTA | Alto | Médio | Excelente |
| 4 | Calibração de Avaliações | ALTA | Muito Alto | Muito Alto | Excelente |
| 5 | Segmentação de Personas | ALTA | Alto | Médio-Alto | Bom |
| 6 | Benchmarking de Pares | MÉDIA | Alto | Médio | Bom |
| 7 | Prática Deliberada | MÉDIA | Alto | Médio | Bom |
| 8 | Análise de Voz | MÉDIA | Médio | Alto | Regular |
| 9 | Peer Review | MÉDIA | Médio | Médio | Regular |
| 10 | Agenda com Lembretes | MÉDIA | Alto | Baixo | Bom |

---

*Última atualização: 18 de Novembro de 2025*
