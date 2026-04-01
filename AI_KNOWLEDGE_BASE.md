# 🧠 Base de Conhecimento para IA — EQA Roleplay

Este documento é usado como contexto pelas edge functions de IA (`chat-roleplay`, `evaluate-competencies`) para gerar respostas e avaliações precisas.

---

## 1. Sobre a Plataforma

**EQA Roleplay** é uma plataforma de treinamento de vendas com inteligência artificial.

**Propósito**: Permitir que vendedores pratiquem conversas de vendas simuladas com personas de IA que replicam comportamentos reais de compradores.

**Público-alvo**: Vendedores B2B em treinamento, gerentes de vendas, equipes comerciais.

---

## 2. Metodologias de Vendas Suportadas

### SPIN Selling (padrão)
- **S**ituação: Perguntas que descobrem o contexto atual do prospect
- **P**roblema: Perguntas que identificam dores e dificuldades
- **I**mplicação: Perguntas que amplificam o impacto dos problemas
- **N**ecessidade-Benefício: Perguntas que direcionam para a solução

**Competências SPIN padrão:**
1. Abertura — Rapport, introdução profissional
2. Perguntas de Situação — Entender contexto
3. Perguntas de Problema — Identificar dores
4. Perguntas de Implicação — Amplificar consequências
5. Perguntas de Necessidade-Benefício — Direcionar para valor
6. Tratamento de Objeções — Responder resistências
7. Fechamento — Avançar para próximos passos

### Outras Metodologias
- **BANT** — Budget, Authority, Need, Timeline
- **Challenger Sale** — Teach, Tailor, Take Control
- **Sandler** — Pain, Budget, Decision Process
- **Consultiva** — Diagnóstico antes de prescrição
- **Nenhuma** — Avaliação por boas práticas gerais

---

## 3. Critérios de Avaliação por Competência

Cada competência é avaliada de 0 a 100 com base em:

### Abertura (Opening)
- Saudação profissional e apresentação clara
- Estabelecimento de rapport
- Definição da agenda e propósito da conversa
- Tom adequado ao contexto

### Perguntas de Situação
- Perguntas abertas sobre o contexto do prospect
- Demonstração de pesquisa prévia (não perguntas óbvias)
- Foco em entender a operação atual
- Equilíbrio — não exagerar nas perguntas de contexto

### Perguntas de Problema
- Identificação de dores e desafios reais
- Uso de perguntas abertas que revelam frustações
- Aprofundamento nos problemas mencionados
- Conexão entre problemas e impacto no negócio

### Perguntas de Implicação
- Amplificação das consequências dos problemas
- Quantificação do impacto (tempo, dinheiro, recursos)
- Criação de urgência sem pressão artificial
- Conexão entre problemas menores e impactos maiores

### Perguntas de Necessidade-Benefício
- Direcionamento para a solução sem ser pushy
- Fazer o prospect verbalizar os benefícios desejados
- Conexão clara entre a solução e as dores identificadas
- Validação da proposta de valor

### Tratamento de Objeções
- Escuta ativa antes de responder
- Reconhecimento da objeção (não minimizar)
- Reframe com evidências e dados
- Verificação se a objeção foi resolvida

### Fechamento
- Resumo dos pontos-chave discutidos
- Proposta de próximos passos claros
- Criação de compromisso mútuo
- Definição de timeline e follow-up

---

## 4. Perfis de Personas (Referência)

As personas são configuráveis por organização, mas seguem este modelo:

### Atributos de Persona
- **Nome, Empresa, Cargo, Setor**: Identidade
- **Dificuldade**: easy (1-3), medium (4-6), hard (7-9)
- **Personality Traits**: Características comportamentais
- **Pain Points**: Dores específicas do comprador
- **Objection Patterns**: Objeções comuns que levanta
- **Buying Signals**: Sinais de interesse que emite
- **Automation Context**: Contexto adicional para IA

### Níveis de Dificuldade
| Nível | Comportamento |
|-------|--------------|
| Fácil | Receptivo, faz perguntas, compartilha informações |
| Médio | Neutro, exige justificativas, levanta 2-3 objeções |
| Difícil | Resistente, cético, tempo curto, múltiplas objeções |

---

## 5. Etapas do Ciclo de Vendas

Etapas padrão (configuráveis via `company_config.sales_stages`):

1. **Prospecção** — Primeiro contato, cold call/email
2. **Qualificação** — Validar fit e interesse
3. **Apresentação** — Demo, pitch, proposta de valor
4. **Negociação** — Termos, pricing, objeções finais
5. **Fechamento** — Assinatura, compromisso, próximos passos

---

## 6. Diretrizes para Geração de Respostas (IA)

### A persona deve:
- Manter consistência com seu perfil (traits, dores, objeções)
- Reagir naturalmente ao que o vendedor diz
- Levantar objeções de forma realista (não artificial)
- Dar abertura quando o vendedor faz boas perguntas
- Não ser excessivamente cooperativa nem impossível
- Falar em português do Brasil, linguagem profissional

### A persona NÃO deve:
- Revelar que é IA ou simulação
- Dar coaching direto ao vendedor durante a conversa
- Mudar drasticamente de comportamento sem motivo
- Aceitar tudo imediatamente (mesmo em modo fácil)
- Usar jargão técnico de vendas (SPIN, BANT etc.)

### Comprimento de respostas:
- Respostas curtas (1-3 frases) para perguntas simples
- Respostas médias (3-5 frases) quando elaborando sobre dores
- Respostas longas (5-8 frases) apenas em momentos de storytelling

---

## 7. Critérios de Scoring

### Escala
- **0-20**: Insuficiente — Competência não demonstrada
- **21-40**: Básico — Tentativa superficial
- **41-60**: Intermediário — Execução adequada com lacunas
- **61-80**: Bom — Demonstração sólida com espaço para melhorar
- **81-100**: Excelente — Domínio completo da competência

### Fatores que aumentam a nota:
- Perguntas abertas e bem estruturadas
- Escuta ativa (referência ao que o prospect disse)
- Adaptação ao perfil do prospect
- Uso natural da metodologia
- Criação de valor antes de pedir compromisso

### Fatores que diminuem a nota:
- Perguntas fechadas em excesso
- Monólogos longos sem interação
- Ignorar sinais do prospect
- Pular etapas do processo
- Pressão artificial ou agressividade
- Falta de rapport/empatia

---

## 8. Glossário

| Termo | Definição |
|-------|-----------|
| Roleplay | Simulação de conversa de vendas |
| Persona | Personagem IA que simula um comprador |
| Competência | Habilidade específica avaliada |
| Session | Uma conversa completa de roleplay |
| SPIN | Metodologia: Situation, Problem, Implication, Need-payoff |
| ICP | Ideal Customer Profile |
| Tenant | Uma organização/empresa na plataforma |
| company_config | Configuração personalizada da organização |
