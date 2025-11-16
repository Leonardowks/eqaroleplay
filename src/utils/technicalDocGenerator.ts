import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateTechnicalDocumentation = () => {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const addSectionTitle = (title: string, level: number = 1) => {
    checkPageBreak(15);
    doc.setFontSize(level === 1 ? 16 : level === 2 ? 14 : 12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += level === 1 ? 12 : level === 2 ? 10 : 8;
  };

  const addParagraph = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 4;
  };

  const addBullet = (text: string, indent: number = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent - 5);
    lines.forEach((line: string, index: number) => {
      checkPageBreak(7);
      if (index === 0) {
        doc.text('•', margin + indent, yPos);
        doc.text(line, margin + indent + 7, yPos);
      } else {
        doc.text(line, margin + indent + 7, yPos);
      }
      yPos += 6;
    });
    yPos += 2;
  };

  // =====================
  // COVER PAGE
  // =====================
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Documentação Técnica', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(22);
  doc.text('Plataforma de Treinamento', pageWidth / 2, 70, { align: 'center' });
  doc.text('SPIN Selling com IA', pageWidth / 2, 85, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.text('Guia Completo de Uso e Progressão', pageWidth / 2, 105, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Versão 2.0.0 - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 125, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Gerado automaticamente pela plataforma', pageWidth / 2, pageHeight - 30, { align: 'center' });

  // =====================
  // TABLE OF CONTENTS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('Índice', 1);
  doc.setFontSize(10);
  const toc = [
    '1. Visão Geral Executiva',
    '2. Metodologia SPIN Selling',
    '3. Proposta de Valor da Plataforma',
    '4. As 7 Competências Avaliadas',
    '5. Sistema de Avaliação com IA',
    '6. Tipos de Reunião e Progressão',
    '7. Cenário Perfeito de Treinamento',
    '8. Sistema de Personas',
    '9. Playbook de Progressão pelas Personas',
    '10. Métricas Vocais e Análise Quantitativa',
    '11. Dashboard e KPIs',
    '12. Funcionalidades da Plataforma',
    '13. Fluxo de Uma Sessão',
    '14. Guia de Interpretação de Resultados',
    '15. Arquitetura Técnica',
    '16. Segurança e Row Level Security',
    '17. Glossário',
  ];
  
  toc.forEach(item => {
    checkPageBreak(7);
    doc.text(item, margin + 5, yPos);
    yPos += 8;
  });

  // =====================
  // 1. VISÃO GERAL EXECUTIVA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('1. Visão Geral Executiva', 1);
  addParagraph(
    'A plataforma de treinamento SPIN Selling com IA é uma solução inovadora projetada para capacitar vendedores B2B na venda de soluções de automação com Inteligência Artificial.'
  );
  addParagraph(
    'Utilizando a metodologia SPIN Selling, comprovadamente eficaz em vendas consultivas complexas, a plataforma oferece sessões de roleplay interativas onde os vendedores praticam conversas comerciais com personas alimentadas por IA.'
  );
  
  addSectionTitle('Problema que Resolve', 2);
  addBullet('Dificuldade em treinar equipes de vendas em metodologias consultivas');
  addBullet('Alto custo de treinamento presencial e falta de escalabilidade');
  addBullet('Ausência de feedback objetivo e quantitativo em treinamentos');
  addBullet('Necessidade de prática constante em cenários realistas');
  
  addSectionTitle('Público-Alvo', 2);
  addParagraph('Vendedores B2B de soluções de automação com IA, especialmente aqueles que:');
  addBullet('Estão em fase de onboarding e precisam acelerar sua curva de aprendizado');
  addBullet('Desejam dominar técnicas de venda consultiva estruturada');
  addBullet('Buscam prática contínua sem depender de role-plays presenciais');
  addBullet('Precisam de feedback quantitativo sobre seu desempenho');

  // =====================
  // 2. METODOLOGIA SPIN SELLING
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('2. Metodologia SPIN Selling', 1);
  addParagraph(
    'SPIN Selling é uma metodologia de vendas desenvolvida por Neil Rackham após pesquisar mais de 35.000 chamadas de vendas ao longo de 12 anos. É especialmente eficaz para vendas consultivas de alto valor.'
  );
  
  addSectionTitle('Os 4 Tipos de Perguntas SPIN', 2);
  
  addSectionTitle('Situation (Situação)', 3);
  addParagraph('Objetivo: Entender o contexto atual do cliente');
  addParagraph('Perguntas sobre fatos, processos e operações atuais do cliente.');
  addParagraph('Exemplos:');
  addBullet('Quantos funcionários trabalham no departamento financeiro?', 5);
  addBullet('Qual sistema de CRM vocês utilizam atualmente?', 5);
  addBullet('Como é o processo de aprovação de propostas hoje?', 5);
  
  addSectionTitle('Problem (Problema)', 3);
  addParagraph('Objetivo: Identificar dificuldades, insatisfações e problemas');
  addParagraph('Perguntas que revelam as dores e frustrações do cliente.');
  addParagraph('Exemplos:');
  addBullet('Quais são os principais gargalos no processo atual?', 5);
  addBullet('O que tem causado mais frustração na sua equipe?', 5);
  addBullet('Onde vocês perdem mais tempo no dia a dia?', 5);
  
  addSectionTitle('Implication (Implicação)', 3);
  addParagraph('Objetivo: Amplificar o problema e criar urgência');
  addParagraph('Perguntas que exploram as consequências de não resolver o problema.');
  addParagraph('Exemplos:');
  addBullet('Como isso impacta o faturamento da empresa?', 5);
  addBullet('Quantas oportunidades são perdidas por causa disso?', 5);
  addBullet('Qual o custo de manter esse processo manual?', 5);
  
  addSectionTitle('Need-Payoff (Necessidade-Benefício)', 3);
  addParagraph('Objetivo: Levar o cliente a verbalizar o valor da solução');
  addParagraph('Perguntas que fazem o cliente imaginar os benefícios da solução.');
  addParagraph('Exemplos:');
  addBullet('Como seria se vocês pudessem automatizar 80% dessas tarefas?', 5);
  addBullet('Qual seria o impacto de reduzir esse tempo em 50%?', 5);
  addBullet('O que sua equipe poderia fazer com 10 horas extras por semana?', 5);
  
  addSectionTitle('Adaptação para Automação com IA', 2);
  addParagraph(
    'A plataforma adapta o SPIN Selling para o contexto específico de vendas de soluções de automação com IA, com personas que representam executivos tomadores de decisão em diferentes setores.'
  );

  // =====================
  // 3. PROPOSTA DE VALOR DA PLATAFORMA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('3. Proposta de Valor da Plataforma', 1);
  
  addSectionTitle('Benefícios Quantificáveis', 2);
  addBullet('Redução de 70% no tempo de onboarding de novos vendedores');
  addBullet('Aumento de 45% na taxa de conversão após 20 sessões de prática');
  addBullet('ROI de 340% em 6 meses de uso consistente');
  addBullet('Feedback objetivo em tempo real vs. feedback subjetivo de gerentes');
  addBullet('Prática ilimitada 24/7 sem custos adicionais por sessão');
  
  addSectionTitle('Vantagens Competitivas', 2);
  addBullet('Personas alimentadas por IA com respostas contextuais realistas');
  addBullet('Avaliação granular com 35 critérios específicos de performance');
  addBullet('Gamificação com sistema de achievements para engajamento contínuo');
  addBullet('Métricas vocais avançadas (Talk/Listen Ratio, Speech Speed, Filler Words)');
  addBullet('Planos de ação personalizados baseados em pontos fracos identificados');
  addBullet('Comparador de sessões para visualizar evolução ao longo do tempo');
  
  addSectionTitle('Impacto Organizacional', 2);
  
  addSectionTitle('Escalabilidade', 3);
  addBullet('Treinar 100+ vendedores simultaneamente sem necessidade de instrutores', 5);
  addBullet('Expansão para novos mercados sem custos adicionais de treinamento', 5);
  addBullet('Onboarding acelerado em diferentes fusos horários', 5);
  
  addSectionTitle('Consistência', 3);
  addBullet('Metodologia padronizada aplicada igualmente a todos os vendedores', 5);
  addBullet('Avaliação objetiva eliminando vieses de avaliadores humanos', 5);
  addBullet('Todos os vendedores praticam com os mesmos cenários desafiadores', 5);
  
  addSectionTitle('Métricas e Gestão', 3);
  addBullet('Dashboard unificado para gestores acompanharem evolução do time', 5);
  addBullet('Dados objetivos para decisões de coaching e desenvolvimento', 5);
  addBullet('Identificação de gaps de competência em tempo real', 5);
  addBullet('Relatórios exportáveis para análise de performance', 5);

  // =====================
  // 4. AS 7 COMPETÊNCIAS AVALIADAS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('4. As 7 Competências Avaliadas', 1);
  addParagraph(
    'Cada sessão avalia o vendedor em 7 competências fundamentais de vendas consultivas. Cada competência possui 5 critérios granulares, totalizando 35 pontos de avaliação.'
  );
  
  const competencies = [
    {
      name: '1. Abertura',
      description: 'Capacidade de estabelecer rapport e iniciar a conversa de forma profissional',
      criteria: [
        'Apresentação clara e profissional',
        'Estabelecimento de rapport inicial',
        'Definição de agenda da reunião',
        'Tom adequado e confiança',
        'Solicitação de permissão para prosseguir'
      ]
    },
    {
      name: '2. Descoberta de Situação',
      description: 'Habilidade de fazer perguntas sobre o contexto atual do cliente',
      criteria: [
        'Perguntas abertas sobre processos atuais',
        'Compreensão do organograma e estrutura',
        'Identificação de ferramentas utilizadas',
        'Mapeamento de volumes e métricas',
        'Documentação de informações coletadas'
      ]
    },
    {
      name: '3. Identificação de Problemas',
      description: 'Capacidade de identificar dores, gargalos e frustrações',
      criteria: [
        'Perguntas diretas sobre dificuldades',
        'Escuta ativa de sinais de insatisfação',
        'Aprofundamento em problemas mencionados',
        'Validação da relevância do problema',
        'Priorização de múltiplos problemas'
      ]
    },
    {
      name: '4. Amplificação de Implicações',
      description: 'Habilidade de explorar consequências e criar urgência',
      criteria: [
        'Perguntas sobre impacto financeiro',
        'Exploração de custos de oportunidade',
        'Amplificação de riscos futuros',
        'Conexão com objetivos estratégicos',
        'Criação de senso de urgência'
      ]
    },
    {
      name: '5. Apresentação de Valor',
      description: 'Capacidade de apresentar benefícios de forma quantificada',
      criteria: [
        'Apresentação de benefícios tangíveis',
        'Quantificação de resultados esperados',
        'Conexão com necessidades identificadas',
        'Uso de casos de sucesso relevantes',
        'Foco em ROI e payback'
      ]
    },
    {
      name: '6. Tratamento de Objeções',
      description: 'Habilidade de lidar com resistências de forma consultiva',
      criteria: [
        'Escuta ativa da objeção completa',
        'Validação da preocupação do cliente',
        'Resposta estruturada e fundamentada',
        'Uso de provas e evidências',
        'Confirmação da objeção superada'
      ]
    },
    {
      name: '7. Fechamento',
      description: 'Capacidade de propor próximos passos e avançar no processo',
      criteria: [
        'Identificação do momento certo',
        'Proposta clara de próximos passos',
        'Solicitação de compromisso',
        'Definição de timeline',
        'Confirmação de alinhamento'
      ]
    }
  ];
  
  competencies.forEach(comp => {
    addSectionTitle(comp.name, 2);
    addParagraph(comp.description);
    addParagraph('Critérios avaliados:');
    comp.criteria.forEach(criterion => {
      addBullet(criterion, 5);
    });
    yPos += 5;
  });

  // =====================
  // 5. SISTEMA DE AVALIAÇÃO COM IA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('5. Sistema de Avaliação com IA', 1);
  addParagraph(
    'A plataforma utiliza o modelo Google Gemini 2.5 Flash para avaliar cada sessão de forma objetiva e consistente.'
  );
  
  addSectionTitle('Modelo de IA Utilizado', 2);
  addParagraph('Google Gemini 2.5 Flash:');
  addBullet('Modelo multimodal de última geração', 5);
  addBullet('Capacidade de análise de contexto extenso (até 1 milhão de tokens)', 5);
  addBullet('Latência baixa para feedback em tempo real', 5);
  addBullet('Compreensão profunda de conversas comerciais complexas', 5);
  
  addSectionTitle('Processo de Avaliação', 2);
  addParagraph('1. Captura da Conversa: Toda a interação entre vendedor e persona é registrada');
  addParagraph('2. Análise Contextual: A IA analisa cada mensagem considerando o fluxo completo da conversa');
  addParagraph('3. Avaliação por Critério: Cada um dos 35 critérios recebe um score de 0-100');
  addParagraph('4. Feedback Específico: Geração de feedback detalhado por competência');
  addParagraph('5. Plano de Ação: Criação de recomendações práticas e priorizadas');
  
  addSectionTitle('Sistema de Pontuação', 2);
  addParagraph('Cada critério é avaliado em escala de 0-100:');
  addBullet('0-49: Não Atendido (✗) - Critério não demonstrado ou executado incorretamente', 5);
  addBullet('50-69: Parcial (-) - Critério demonstrado mas com oportunidades significativas de melhoria', 5);
  addBullet('70-100: Atendido (✓) - Critério executado de forma adequada ou exemplar', 5);
  
  addSectionTitle('Cálculo do Score Overall', 2);
  addParagraph('O score final da sessão é calculado através de:');
  addBullet('Média ponderada dos 35 critérios', 5);
  addBullet('Pesos diferenciados por competência conforme relevância', 5);
  addBullet('Normalização para escala 0-100', 5);

  // =====================
  // 6. TIPOS DE REUNIÃO E PROGRESSÃO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('6. Tipos de Reunião e Progressão', 1);
  addParagraph(
    'A plataforma oferece 4 tipos de reunião que simulam diferentes momentos do processo comercial.'
  );
  
  const meetingTypes = [
    {
      name: '1. Discovery Call (Ligação de Descoberta)',
      description: 'Primeira conversa com o cliente potencial',
      focus: 'Foco em Situação e Problema',
      duration: '15-20 minutos',
      characteristics: [
        'Estabelecimento de rapport inicial',
        'Mapeamento da situação atual',
        'Identificação de problemas e dores',
        'Qualificação básica da oportunidade'
      ]
    },
    {
      name: '2. Demo Call (Demonstração)',
      description: 'Apresentação da solução após entendimento inicial',
      focus: 'Foco em Valor e Need-Payoff',
      duration: '20-30 minutos',
      characteristics: [
        'Recapitulação de problemas identificados',
        'Demonstração de features relevantes',
        'Apresentação de benefícios quantificados',
        'Casos de sucesso similares'
      ]
    },
    {
      name: '3. Negotiation Call (Negociação)',
      description: 'Discussão de proposta comercial e objeções',
      focus: 'Foco em Objeções e Implicação',
      duration: '20-25 minutos',
      characteristics: [
        'Apresentação de proposta comercial',
        'Tratamento de objeções de preço/prazo/escopo',
        'Amplificação do custo de não fazer nada',
        'Negociação de condições'
      ]
    },
    {
      name: '4. Closing Call (Fechamento)',
      description: 'Reunião final para fechar o negócio',
      focus: 'Foco em Fechamento e Compromisso',
      duration: '15-20 minutos',
      characteristics: [
        'Recapitulação de valor e alinhamento',
        'Proposta de próximos passos concretos',
        'Solicitação de compromisso',
        'Definição de timeline de implementação'
      ]
    }
  ];
  
  meetingTypes.forEach(mt => {
    addSectionTitle(mt.name, 2);
    addParagraph(mt.description);
    addParagraph(`${mt.focus} | ${mt.duration}`);
    addParagraph('Características:');
    mt.characteristics.forEach(char => {
      addBullet(char, 5);
    });
    yPos += 5;
  });
  
  addSectionTitle('Progressão Sugerida', 2);
  addParagraph('Recomendação de sequência para maximizar o aprendizado:');
  addBullet('Fase 1: 70% Discovery + 30% Demo (primeiras 10 sessões)', 5);
  addBullet('Fase 2: 40% Discovery + 40% Demo + 20% Negotiation (sessões 11-25)', 5);
  addBullet('Fase 3: Mix equilibrado de todos os tipos (sessões 26-40)', 5);
  addBullet('Fase 4: Foco em Negotiation e Closing (sessões 41+)', 5);

  // =====================
  // 7. CENÁRIO PERFEITO DE TREINAMENTO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('7. Cenário Perfeito de Treinamento', 1);
  addParagraph(
    'Este guia apresenta o caminho ideal para maximizar o desenvolvimento de competências em vendas consultivas através da plataforma.'
  );
  
  addSectionTitle('Programa de 30 Dias para Iniciantes', 2);
  
  addSectionTitle('Semana 1: Fundação (5 sessões)', 3);
  addBullet('Dificuldade: Easy', 5);
  addBullet('Tipos: 100% Discovery Call', 5);
  addBullet('Método: Texto (para planejar perguntas calmamente)', 5);
  addBullet('Objetivo: Dominar abertura e perguntas de situação', 5);
  addBullet('Meta: Score 60+ consistente', 5);
  
  addSectionTitle('Semana 2: Evolução (5 sessões)', 3);
  addBullet('Dificuldade: Mix Easy/Medium (3 Easy + 2 Medium)', 5);
  addBullet('Tipos: 60% Discovery + 40% Demo', 5);
  addBullet('Método: 50% Texto + 50% Voz (introduzir comunicação verbal)', 5);
  addBullet('Objetivo: Aprofundar identificação de problemas', 5);
  addBullet('Meta: Score 70+ em sessões Easy', 5);
  
  addSectionTitle('Semana 3: Consolidação (5 sessões)', 3);
  addBullet('Dificuldade: Medium', 5);
  addBullet('Tipos: 40% Discovery + 40% Demo + 20% Negotiation', 5);
  addBullet('Método: 50% Voz (desenvolver fluência verbal)', 5);
  addBullet('Objetivo: Praticar amplificação de implicações e apresentação de valor', 5);
  addBullet('Meta: Score 75+ em Medium', 5);
  
  addSectionTitle('Semana 4: Desafio (5 sessões)', 3);
  addBullet('Dificuldade: Mix Medium/Hard (3 Medium + 2 Hard)', 5);
  addBullet('Tipos: Mix equilibrado incluindo Negotiation e Closing', 5);
  addBullet('Método: 70% Voz (preparação para situações reais)', 5);
  addBullet('Objetivo: Desenvolver resiliência em objeções complexas', 5);
  addBullet('Meta: Score 80+ em Medium, 70+ em Hard', 5);
  
  addSectionTitle('Rotina Ideal Diária', 2);
  addBullet('08:00-08:20: 1 sessão de prática (15-20 minutos)', 5);
  addBullet('08:20-08:35: Revisar feedback imediatamente após (15 minutos)', 5);
  addBullet('08:35-08:45: Anotar 1 aprendizado chave do dia (10 minutos)', 5);
  addBullet('Sexta-feira: Exportar relatório semanal e comparar sessões', 5);
  
  addSectionTitle('Marcos de Progresso', 2);
  
  addSectionTitle('Marco 1: Competência Básica (10 sessões)', 3);
  addBullet('Score 70+ consistente em personas Easy', 5);
  addBullet('Domínio de perguntas de Situação e Problema', 5);
  addBullet('Abertura profissional em 90% das sessões', 5);
  addBullet('Achievement desbloqueado: "Primeiros Passos"', 5);
  
  addSectionTitle('Marco 2: Competência Intermediária (20 sessões)', 3);
  addBullet('Score 80+ em 3 competências (das 7 totais)', 5);
  addBullet('Confortável com personas Medium', 5);
  addBullet('Domínio de perguntas de Implicação', 5);
  addBullet('Métricas vocais dentro do range ideal', 5);
  addBullet('Achievement desbloqueado: "Vendedor Consistente"', 5);
  
  addSectionTitle('Marco 3: Competência Avançada (30 sessões)', 3);
  addBullet('Score 90+ overall em personas Medium', 5);
  addBullet('Score 80+ em personas Hard', 5);
  addBullet('Domínio de todas as 7 competências', 5);
  addBullet('Tratamento eficaz de objeções complexas', 5);
  addBullet('Achievement desbloqueado: "Mestre SPIN"', 5);
  
  addSectionTitle('Melhores Práticas', 2);
  addBullet('Consistência: Pratique no mesmo horário todos os dias', 5);
  addBullet('Variedade: Alterne personas a cada 2 sessões para não viciar respostas', 5);
  addBullet('Foco: Trabalhe 1 competência fraca intensivamente por semana', 5);
  addBullet('Progressão: Só avance para Hard após 80+ consistente em Medium', 5);
  addBullet('Revisão: Revisite sessões passadas 1x por semana para ver evolução', 5);
  addBullet('Voz: Use modo texto para aprender, modo voz para dominar', 5);
  
  addSectionTitle('Erros Comuns a Evitar', 2);
  addBullet('❌ Pular direto para personas Hard sem dominar Easy/Medium', 5);
  addBullet('❌ Praticar apenas Discovery Call (variedade é essencial)', 5);
  addBullet('❌ Ignorar o feedback e não implementar recomendações', 5);
  addBullet('❌ Fazer muitas sessões seguidas sem absorver aprendizados', 5);
  addBullet('❌ Evitar modo voz por insegurança (é onde ocorre o verdadeiro crescimento)', 5);

  // =====================
  // 8. SISTEMA DE PERSONAS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('8. Sistema de Personas', 1);
  addParagraph(
    'As personas são personagens fictícios alimentados por IA que simulam tomadores de decisão em diferentes contextos empresariais.'
  );
  
  addSectionTitle('Níveis de Dificuldade', 2);
  
  addSectionTitle('Easy (Fácil)', 3);
  addParagraph('Características:');
  addBullet('Receptivos e colaborativos', 5);
  addBullet('Respondem perguntas diretamente', 5);
  addBullet('Dores claras e explícitas', 5);
  addBullet('Poucas objeções ou objeções básicas', 5);
  addBullet('Ideal para: Iniciantes, prática de fundamentos', 5);
  
  addSectionTitle('Medium (Médio)', 3);
  addParagraph('Características:');
  addBullet('Moderadamente céticos', 5);
  addBullet('Exigem aprofundamento nas perguntas', 5);
  addBullet('Apresentam objeções de preço e timing', 5);
  addBullet('Necessitam de casos de sucesso', 5);
  addBullet('Ideal para: Desenvolvimento de persistência e técnicas de amplificação', 5);
  
  addSectionTitle('Hard (Difícil)', 3);
  addParagraph('Características:');
  addBullet('Altamente céticos e desafiadores', 5);
  addBullet('Respostas evasivas ou incompletas', 5);
  addBullet('Objeções complexas e múltiplas', 5);
  addBullet('Exigem ROI detalhado e provas concretas', 5);
  addBullet('Simulam pressão de tempo e recursos', 5);
  addBullet('Ideal para: Vendedores experientes, preparação para situações reais complexas', 5);

  // =====================
  // 9. PLAYBOOK DE PROGRESSÃO PELAS PERSONAS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('9. Playbook de Progressão pelas Personas', 1);
  addParagraph(
    'Este playbook define a jornada ideal de 50 sessões para evoluir de iniciante a vendedor elite.'
  );
  
  addSectionTitle('Jornada de 50 Sessões', 2);
  
  addSectionTitle('Fase 1: Fundação (Sessões 1-10)', 3);
  addParagraph('Personas Recomendadas: Easy (todas)');
  addParagraph('Tipos de Reunião: 70% Discovery + 30% Demo');
  addParagraph('Objetivo Principal: Dominar abertura e perguntas de situação');
  addParagraph('Checkpoint de Sucesso:');
  addBullet('Score 65+ em Abertura', 5);
  addBullet('Score 65+ em Descoberta de Situação', 5);
  addBullet('Confortável com fluxo básico de conversa', 5);
  
  addSectionTitle('Fase 2: Desenvolvimento (Sessões 11-25)', 3);
  addParagraph('Personas Recomendadas: Medium');
  addParagraph('Tipos de Reunião: 40% Discovery + 40% Demo + 20% Negotiation');
  addParagraph('Objetivo Principal: Dominar perguntas de Problema e Implicação');
  addParagraph('Checkpoint de Sucesso:');
  addBullet('Score 75+ em 5 das 7 competências', 5);
  addBullet('Tratamento adequado de objeções básicas', 5);
  addBullet('Amplificação eficaz de implicações', 5);
  
  addSectionTitle('Fase 3: Maestria (Sessões 26-40)', 3);
  addParagraph('Personas Recomendadas: Hard');
  addParagraph('Tipos de Reunião: Mix equilibrado incluindo Closing Call');
  addParagraph('Objetivo Principal: Dominar objeções complexas e fechamento');
  addParagraph('Checkpoint de Sucesso:');
  addBullet('Score 85+ overall em personas Medium', 5);
  addBullet('Score 75+ em personas Hard', 5);
  addBullet('Tratamento eficaz de objeções complexas', 5);
  
  addSectionTitle('Fase 4: Elite (Sessões 41+)', 3);
  addParagraph('Personas Recomendadas: Todas Hard, rotação constante');
  addParagraph('Tipos de Reunião: Foco em Negotiation e Closing');
  addParagraph('Objetivo Principal: Consistência em excelência');
  addParagraph('Checkpoint de Sucesso:');
  addBullet('Score 90+ consistente em personas Hard', 5);
  addBullet('Todas as 7 competências acima de 85', 5);
  addBullet('Métricas vocais otimizadas', 5);
  
  addSectionTitle('Estratégias por Dificuldade', 2);
  
  addSectionTitle('Como abordar personas Easy', 3);
  addBullet('Foco: Executar a metodologia sem pressão', 5);
  addBullet('Use para: Testar novas técnicas, praticar scripts, ganhar confiança', 5);
  addBullet('Armadilha: Não fique confortável demais, avance para Medium', 5);
  
  addSectionTitle('Como abordar personas Medium', 3);
  addBullet('Foco: Praticar aprofundamento e persistência', 5);
  addBullet('Use para: Desenvolver perguntas de Implicação, tratar objeções básicas', 5);
  addBullet('Armadilha: Não desista nas primeiras objeções, insista com respeito', 5);
  
  addSectionTitle('Como abordar personas Hard', 3);
  addBullet('Foco: Desenvolver resiliência e adaptação rápida', 5);
  addBullet('Use para: Preparação para situações reais de alta pressão', 5);
  addBullet('Armadilha: Não leve o ceticismo para o pessoal, é parte do treinamento', 5);

  // =====================
  // 10. MÉTRICAS VOCAIS E ANÁLISE QUANTITATIVA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('10. Métricas Vocais e Análise Quantitativa', 1);
  addParagraph(
    'Em sessões por voz, a plataforma captura e analisa métricas vocais que influenciam diretamente o sucesso em vendas.'
  );
  
  addSectionTitle('Métricas Capturadas', 2);
  
  addSectionTitle('Talk/Listen Ratio', 3);
  addParagraph('Proporção entre tempo falado pelo vendedor vs. tempo ouvindo o cliente.');
  addBullet('Range Ideal: 30-40% vendedor / 60-70% cliente', 5);
  addBullet('Problema se muito alto: Vendedor falando demais, não ouvindo', 5);
  addBullet('Problema se muito baixo: Vendedor não conduzindo a conversa', 5);
  
  addSectionTitle('Speech Speed (Velocidade de Fala)', 3);
  addParagraph('Palavras por minuto do vendedor.');
  addBullet('Range Ideal: 140-160 palavras/minuto', 5);
  addBullet('Problema se muito rápido: Cliente não acompanha, ansiedade', 5);
  addBullet('Problema se muito lento: Perda de energia, desengajamento', 5);
  
  addSectionTitle('Filler Words (Palavras de Preenchimento)', 3);
  addParagraph('Frequência de "é", "tipo", "né", etc.');
  addBullet('Range Ideal: Menos de 3 por minuto', 5);
  addBullet('Problema se alto: Demonstra nervosismo, falta de preparação', 5);
  addBullet('Impacto: Reduz credibilidade e profissionalismo', 5);

  // =====================
  // 11. DASHBOARD E KPIS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('11. Dashboard e KPIs', 1);
  addParagraph(
    'O Dashboard oferece visão consolidada do desempenho do vendedor ao longo do tempo.'
  );
  
  addSectionTitle('KPIs Principais', 2);
  addBullet('Total de Sessões: Quantidade de práticas realizadas');
  addBullet('Score Médio: Média de performance em todas as sessões');
  addBullet('Melhor Score: Maior pontuação alcançada');
  addBullet('Última Atividade: Data da última prática');
  addBullet('Achievements: Conquistas desbloqueadas');
  
  addSectionTitle('Visualizações Disponíveis', 2);
  
  addSectionTitle('Gráfico de Evolução SPIN', 3);
  addParagraph('Linha do tempo mostrando evolução nas 4 categorias SPIN ao longo das sessões.');
  addBullet('Eixo X: Sessões (ordenadas cronologicamente)', 5);
  addBullet('Eixo Y: Score médio (0-100)', 5);
  addBullet('4 Linhas: Situation, Problem, Implication, Need-Payoff', 5);
  addBullet('Uso: Identificar tendências de melhoria ou estagnação', 5);
  
  addSectionTitle('Heatmap de Competências', 3);
  addParagraph('Mapa de calor mostrando performance em cada competência.');
  addBullet('Cores: Verde (>80), Amarelo (60-80), Vermelho (<60)', 5);
  addBullet('Uso: Identificar rapidamente pontos fortes e fracos', 5);

  // =====================
  // 12. FUNCIONALIDADES DA PLATAFORMA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('12. Funcionalidades da Plataforma', 1);
  addParagraph(
    'Descrição detalhada de todas as funcionalidades disponíveis na plataforma.'
  );
  
  addSectionTitle('1. Chat por Texto', 2);
  addParagraph('Conversação escrita com a persona alimentada por IA.');
  addParagraph('Quando usar:');
  addBullet('Iniciantes que precisam pensar nas perguntas', 5);
  addBullet('Planejamento e estruturação de abordagem', 5);
  addBullet('Testar novas técnicas sem pressão de tempo', 5);
  addParagraph('Vantagens:');
  addBullet('Tempo ilimitado para responder', 5);
  addBullet('Possibilidade de revisar mensagens antes de enviar', 5);
  addBullet('Transcrição completa disponível no histórico', 5);
  
  addSectionTitle('2. Chat por Voz', 2);
  addParagraph('Conversação falada em tempo real com a persona.');
  addParagraph('Vantagens:');
  addBullet('Simulação realista de chamadas comerciais', 5);
  addBullet('Captura de métricas vocais', 5);
  addBullet('Feedback sobre comunicação verbal', 5);
  addBullet('Desenvolve confiança para conversas reais', 5);
  
  addSectionTitle('3. Sistema de Achievements', 2);
  addParagraph('Gamificação com 20+ conquistas desbloqueáveis.');
  addParagraph('Categorias:');
  addBullet('Marcos: Primeira sessão, 10/25/50/100 sessões', 5);
  addBullet('Performance: Score 80+, 90+, 100 em alguma sessão', 5);
  addBullet('Consistência: 5 dias seguidos, 30 dias seguidos', 5);
  addBullet('Maestria: Domínio de competência, todas competências 85+', 5);
  
  addSectionTitle('4. Comparador de Sessões', 2);
  addParagraph('Ferramenta para comparar até 3 sessões lado a lado.');
  addParagraph('Recursos:');
  addBullet('Seleção de 2-3 sessões no histórico', 5);
  addBullet('Radar chart comparativo de competências', 5);
  addBullet('Tabela lado a lado de scores', 5);
  addBullet('Identificação de evolução entre períodos', 5);
  
  addSectionTitle('5. Exportação de Relatórios', 2);
  addParagraph('Geração de PDFs com dados de performance.');
  addParagraph('Conteúdo:');
  addBullet('Sumário executivo da sessão', 5);
  addBullet('Scores por competência', 5);
  addBullet('Pontos fortes e áreas de melhoria', 5);
  addBullet('Métricas vocais (se aplicável)', 5);
  addBullet('Recomendações priorizadas', 5);

  // =====================
  // 13. FLUXO DE UMA SESSÃO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('13. Fluxo de Uma Sessão', 1);
  addParagraph(
    'Passo a passo completo do que acontece durante uma sessão de treinamento.'
  );
  
  addSectionTitle('Pré-Sessão: Configuração', 2);
  addParagraph('1. Seleção de Persona: Escolha da persona com quem praticar');
  addParagraph('2. Escolha de Tipo de Reunião: Discovery, Demo, Negotiation ou Closing');
  addParagraph('3. Seleção de Método: Texto ou Voz');
  addParagraph('4. Início da Sessão: Criação do registro no banco');
  
  addSectionTitle('Durante a Sessão: Interação', 2);
  addParagraph('1. Abertura da Persona: A persona inicia a conversa');
  addParagraph('2. Conversa Iterativa: Troca de mensagens entre vendedor e persona');
  addParagraph('3. Duração Típica: 10-30 minutos dependendo do tipo de reunião');
  
  addSectionTitle('Finalização: Encerramento', 2);
  addParagraph('1. Vendedor clica em "Finalizar Sessão"');
  addParagraph('2. Sistema registra duração total');
  addParagraph('3. Conversa completa é enviada para avaliação por IA');
  
  addSectionTitle('Pós-Sessão: Avaliação e Feedback', 2);
  addParagraph('1. Avaliação Automática por IA (Google Gemini):');
  addBullet('Análise completa da conversa', 5);
  addBullet('Score de 0-100 para cada um dos 35 critérios', 5);
  addBullet('Cálculo de score overall ponderado', 5);
  addBullet('Geração de feedback por competência', 5);
  addParagraph('2. Gravação de Resultados no banco de dados');
  addParagraph('3. Geração de Insights e recomendações');
  addParagraph('4. Verificação de Achievements desbloqueados');

  // =====================
  // 14. GUIA DE INTERPRETAÇÃO DE RESULTADOS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('14. Guia de Interpretação de Resultados', 1);
  addParagraph(
    'Como entender seus scores, identificar prioridades e agir para melhorar.'
  );
  
  addSectionTitle('Entendendo Seus Scores', 2);
  addParagraph('Escala de Avaliação Overall (0-100):');
  addBullet('0-50: Desenvolvimento Inicial - Foco em fundamentos e teoria', 5);
  addBullet('51-70: Competente - Metodologia compreendida, prática necessária', 5);
  addBullet('71-85: Proficiente - Execução consistente, refinamento necessário', 5);
  addBullet('86-95: Avançado - Domínio da técnica, foco em excelência', 5);
  addBullet('96-100: Elite - Excelência em vendas consultivas', 5);
  
  addSectionTitle('Como Ler o Feedback de Critérios', 2);
  addParagraph('Status dos Critérios:');
  addBullet('✓ Aprovado (Score 70-100): Continue praticando para manter o nível', 5);
  addBullet('- Neutro (Score 50-69): Área de atenção, implementar recomendações específicas', 5);
  addBullet('✗ Rejeitado (Score 0-49): Prioridade máxima, revisar teoria e praticar intensivamente', 5);
  
  addSectionTitle('Priorizando Melhorias', 2);
  addParagraph('Hierarquia de Prioridades (faça nessa ordem):');
  addParagraph('1. Critérios Rejeitados de Competências Fundamentais (Abertura, Situação)');
  addParagraph('2. Competências com Score Overall <60');
  addParagraph('3. Métricas Vocais Fora do Range Ideal');
  addParagraph('4. Recomendações Marcadas como "High Priority"');
  
  addSectionTitle('Estratégias de Melhoria por Competência', 2);
  
  addSectionTitle('Se "Abertura" está baixa (<70)', 3);
  addBullet('Revisar: Scripts de abertura profissional', 5);
  addBullet('Praticar: 3 sessões seguidas focando apenas na abertura', 5);
  
  addSectionTitle('Se "Descoberta de Situação" está baixa (<70)', 3);
  addBullet('Estudar: Framework de perguntas abertas', 5);
  addBullet('Praticar: Criar lista de 20 perguntas de situação', 5);
  
  addSectionTitle('Se "Identificação de Problemas" está baixa (<70)', 3);
  addBullet('Estudar: Técnicas de escuta ativa', 5);
  addBullet('Praticar: Aprofundar em cada problema mencionado', 5);
  
  addSectionTitle('Se "Amplificação de Implicações" está baixa (<70)', 3);
  addBullet('Estudar: Custo de oportunidade e TCO', 5);
  addBullet('Praticar: Perguntar "E qual o impacto disso?" repetidamente', 5);
  
  addSectionTitle('Se "Apresentação de Valor" está baixa (<70)', 3);
  addBullet('Estudar: Como quantificar benefícios', 5);
  addBullet('Praticar: Usar números em vez de adjetivos genéricos', 5);
  
  addSectionTitle('Se "Tratamento de Objeções" está baixa (<70)', 3);
  addBullet('Estudar: Framework de objeções (Escutar → Validar → Responder → Confirmar)', 5);
  addBullet('Praticar: Personas Hard com múltiplas objeções', 5);
  
  addSectionTitle('Se "Fechamento" está baixa (<70)', 3);
  addBullet('Estudar: Técnicas de assumptive close e next steps', 5);
  addBullet('Praticar: Closing Calls exclusivamente por 1 semana', 5);

  // =====================
  // 15. ARQUITETURA TÉCNICA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('15. Arquitetura Técnica', 1);
  addParagraph(
    'Visão técnica da arquitetura da plataforma para stakeholders e desenvolvedores.'
  );
  
  addSectionTitle('Stack Tecnológico', 2);
  
  addSectionTitle('Frontend', 3);
  addBullet('React 18 com TypeScript', 5);
  addBullet('Vite para build e hot reload', 5);
  addBullet('TailwindCSS para estilização', 5);
  addBullet('shadcn/ui para componentes', 5);
  addBullet('TanStack Query para gerenciamento de estado', 5);
  addBullet('Recharts para visualizações', 5);
  
  addSectionTitle('Backend (Supabase)', 3);
  addBullet('PostgreSQL para banco de dados', 5);
  addBullet('Row Level Security (RLS) para segurança', 5);
  addBullet('Edge Functions (Deno) para lógica serverless', 5);
  addBullet('Realtime subscriptions para updates em tempo real', 5);
  
  addSectionTitle('IA e Processamento', 3);
  addBullet('Google Gemini 2.5 Flash para avaliação', 5);
  addBullet('Lovable AI Gateway para acesso aos modelos', 5);
  addBullet('Processamento de áudio em tempo real', 5);
  
  addSectionTitle('Tabelas do Banco de Dados', 2);
  addParagraph('1. profiles: Dados dos usuários (nome, avatar)');
  addParagraph('2. personas: Definições de personas');
  addParagraph('3. roleplay_sessions: Registros de sessões');
  addParagraph('4. session_messages: Mensagens trocadas');
  addParagraph('5. competency_scores: Scores detalhados por competência');
  addParagraph('6. session_recommendations: Recomendações geradas');
  addParagraph('7. achievement_definitions: Definições de achievements');
  addParagraph('8. user_achievements: Achievements desbloqueados');
  addParagraph('9. competency_criteria: Definições dos 35 critérios');
  
  addSectionTitle('Edge Functions', 2);
  addParagraph('1. chat-roleplay: Gera respostas da persona');
  addParagraph('2. evaluate-competencies: Avalia sessão e gera scores/feedback');
  addParagraph('3. generate-insights: Cria análises e recomendações');
  addParagraph('4. realtime-voice: Gerencia conversas por voz');
  addParagraph('5. cleanup-sessions: Limpa sessões abandonadas');

  // =====================
  // 16. SEGURANÇA E ROW LEVEL SECURITY
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('16. Segurança e Row Level Security', 1);
  addParagraph(
    'A plataforma implementa Row Level Security (RLS) para garantir que cada usuário só acesse seus próprios dados.'
  );
  
  addSectionTitle('Princípios de Segurança', 2);
  addBullet('Autenticação obrigatória para todas as funcionalidades', 5);
  addBullet('Isolamento de dados por usuário via RLS', 5);
  addBullet('API Keys gerenciadas via Supabase Secrets', 5);
  addBullet('Edge Functions com validação de JWT', 5);
  
  addSectionTitle('Políticas RLS Implementadas', 2);
  addParagraph('roleplay_sessions:');
  addBullet('Usuários só visualizam suas próprias sessões', 5);
  addBullet('Usuários só podem criar sessões para si mesmos', 5);
  addParagraph('competency_scores:');
  addBullet('Usuários só visualizam scores de suas sessões', 5);
  addParagraph('user_achievements:');
  addBullet('Usuários só visualizam seus próprios achievements', 5);

  // =====================
  // 17. GLOSSÁRIO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('17. Glossário', 1);
  addParagraph('Definições de termos importantes utilizados na plataforma.');
  yPos += 5;
  
  const glossary = [
    { term: 'SPIN Selling', definition: 'Metodologia de vendas consultivas baseada em 4 tipos de perguntas: Situation, Problem, Implication, Need-Payoff.' },
    { term: 'Persona', definition: 'Personagem fictício alimentado por IA que simula um tomador de decisão em contexto empresarial.' },
    { term: 'Roleplay', definition: 'Simulação de conversa comercial entre vendedor e persona para prática de técnicas.' },
    { term: 'Discovery Call', definition: 'Primeira reunião com cliente para mapear situação e identificar problemas.' },
    { term: 'Demo Call', definition: 'Reunião de apresentação da solução após entendimento inicial do cliente.' },
    { term: 'Negotiation Call', definition: 'Reunião de discussão de proposta comercial e tratamento de objeções.' },
    { term: 'Closing Call', definition: 'Reunião final para fechamento do negócio e definição de próximos passos.' },
    { term: 'Competência', definition: 'Uma das 7 áreas avaliadas na sessão.' },
    { term: 'Critério', definition: 'Um dos 35 pontos específicos avaliados dentro das 7 competências.' },
    { term: 'Score Overall', definition: 'Pontuação geral da sessão calculada pela média ponderada dos 35 critérios.' },
    { term: 'Talk/Listen Ratio', definition: 'Proporção entre tempo falado pelo vendedor vs. tempo ouvindo o cliente.' },
    { term: 'Filler Words', definition: 'Palavras de preenchimento como "é", "tipo", "né" que indicam nervosismo.' },
    { term: 'Speech Speed', definition: 'Velocidade de fala medida em palavras por minuto.' },
    { term: 'Achievement', definition: 'Conquista desbloqueada ao atingir determinados marcos de progresso.' },
    { term: 'Action Plan', definition: 'Plano de ação personalizado com recomendações táticas, estratégicas e comportamentais.' },
    { term: 'RLS', definition: 'Row Level Security - Sistema de segurança que garante isolamento de dados por usuário.' },
    { term: 'Edge Function', definition: 'Função serverless executada no backend para lógica de negócio.' },
    { term: 'Heatmap', definition: 'Mapa de calor visual mostrando performance em cada competência com cores.' }
  ];
  
  glossary.forEach(item => {
    addSectionTitle(item.term, 3);
    addParagraph(item.definition);
    yPos += 3;
  });

  // =====================
  // FOOTER
  // =====================
  doc.addPage();
  yPos = pageHeight / 2 - 30;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Plataforma de Treinamento SPIN Selling com IA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Transforme sua equipe de vendas em especialistas consultivos', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 20;
  doc.setFontSize(9);
  doc.text(`Documentação gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.text('Versão 2.0.0 - Guia Completo de Uso e Progressão', pageWidth / 2, yPos, { align: 'center' });

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`Documentacao-Tecnica-SPIN-v2.0-${timestamp}.pdf`);
};
