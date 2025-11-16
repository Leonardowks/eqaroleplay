import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateTechnicalDocumentation = () => {
  const doc = new jsPDF();
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper function to add section title
  const addSectionTitle = (title: string, level: number = 1) => {
    checkPageBreak(15);
    doc.setFontSize(level === 1 ? 16 : 14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += level === 1 ? 12 : 10;
  };

  // Helper function to add paragraph
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

  // =====================
  // COVER PAGE
  // =====================
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Documentação Técnica', pageWidth / 2, 60, { align: 'center' });
  
  doc.setFontSize(22);
  doc.text('Plataforma de Treinamento', pageWidth / 2, 75, { align: 'center' });
  doc.text('SPIN Selling com IA', pageWidth / 2, 90, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Versão 1.0.0 - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 110, { align: 'center' });
  
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
    '3. As 7 Competências Avaliadas',
    '4. Sistema de Avaliação com IA',
    '5. Tipos de Reunião e Progressão',
    '6. Sistema de Personas',
    '7. Métricas Vocais e Análise Quantitativa',
    '8. Dashboard e KPIs',
    '9. Fluxo de Uma Sessão',
    '10. Arquitetura Técnica',
    '11. Segurança e RLS Policies',
    '12. Glossário',
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
  addParagraph(
    '• Dificuldade em treinar equipes de vendas em metodologias consultivas\n' +
    '• Alto custo de treinamento presencial e falta de escalabilidade\n' +
    '• Ausência de feedback objetivo e quantitativo em treinamentos\n' +
    '• Necessidade de prática constante em cenários realistas'
  );
  
  addSectionTitle('Público-Alvo', 2);
  addParagraph(
    'Vendedores B2B de soluções de automação com IA, especialmente aqueles que:\n' +
    '• Vendem para decisores técnicos (CTO, Head of Engineering)\n' +
    '• Precisam dominar vendas consultivas complexas\n' +
    '• Buscam melhorar suas técnicas de descoberta e qualificação\n' +
    '• Desejam feedback objetivo sobre seu desempenho'
  );

  // =====================
  // 2. METODOLOGIA SPIN SELLING
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('2. Metodologia SPIN Selling', 1);
  addParagraph(
    'SPIN Selling é uma metodologia de vendas consultivas desenvolvida por Neil Rackham após analisar mais de 35.000 chamadas comerciais. O acrônimo SPIN representa quatro tipos de perguntas:'
  );
  
  addSectionTitle('As 4 Categorias SPIN', 2);
  
  checkPageBreak(40);
  autoTable(doc, {
    startY: yPos,
    head: [['Categoria', 'Descrição', 'Objetivo']],
    body: [
      ['Situation', 'Perguntas sobre a situação atual do cliente', 'Entender o contexto e ambiente'],
      ['Problem', 'Perguntas que revelam dificuldades e insatisfações', 'Identificar dores explícitas'],
      ['Implication', 'Perguntas sobre consequências dos problemas', 'Amplificar a urgência'],
      ['Need-payoff', 'Perguntas sobre valor da solução', 'Fazer o cliente vender para si mesmo'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  addSectionTitle('Adaptação para Automação com IA', 2);
  addParagraph(
    'Nossa plataforma adapta o SPIN Selling especificamente para a venda de soluções de automação com IA, focando em:\n' +
    '• Descoberta de processos manuais e repetitivos\n' +
    '• Quantificação do tempo gasto em tarefas automatizáveis\n' +
    '• Identificação de erros humanos e seus custos\n' +
    '• Apresentação de ROI de automação\n' +
    '• Gestão de objeções técnicas sobre IA'
  );

  // =====================
  // 3. AS 7 COMPETÊNCIAS AVALIADAS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('3. As 7 Competências Avaliadas', 1);
  addParagraph(
    'A plataforma avalia o desempenho dos vendedores em 7 competências críticas, cada uma com 4-5 sub-critérios específicos. Todas as competências são pontuadas de 0 a 100.'
  );

  // Competência 1
  addSectionTitle('3.1. Abertura e Rapport', 2);
  addParagraph('Estabelecer conexão inicial e criar ambiente propício para a conversa.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Saudação', '20', 'Cumprimento profissional e apresentação clara'],
      ['Contexto', '25', 'Explica propósito da conversa de forma concisa'],
      ['Permissão', '20', 'Pede permissão para prosseguir e confirma disponibilidade'],
      ['Tom', '15', 'Usa tom apropriado e demonstra empatia'],
      ['Transição', '20', 'Transição suave para fase de descoberta'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Competência 2
  addSectionTitle('3.2. Descoberta de Situação', 2);
  addParagraph('Entender o contexto atual do cliente antes de propor soluções.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Processo Atual', '30', 'Mapeia processos e fluxos de trabalho existentes'],
      ['Ferramentas', '20', 'Identifica sistemas e ferramentas em uso'],
      ['Equipe', '15', 'Entende tamanho e estrutura da equipe'],
      ['Volume', '20', 'Quantifica volume de trabalho e demanda'],
      ['Escuta', '15', 'Demonstra escuta ativa e faz anotações'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Competência 3
  doc.addPage();
  yPos = margin;
  addSectionTitle('3.3. Identificação de Problemas', 2);
  addParagraph('Revelar dificuldades, gargalos e insatisfações do cliente.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Gargalos', '25', 'Identifica pontos de lentidão no processo'],
      ['Erros', '25', 'Descobre problemas de qualidade e retrabalho'],
      ['Tempo', '20', 'Quantifica tempo gasto em tarefas manuais'],
      ['Frustração', '15', 'Capta insatisfação da equipe'],
      ['Validação', '15', 'Confirma e valida problemas identificados'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Competência 4
  addSectionTitle('3.4. Amplificação de Implicações', 2);
  addParagraph('Expandir as consequências dos problemas para criar urgência.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Custo', '30', 'Quantifica impacto financeiro dos problemas'],
      ['Escala', '20', 'Explora como problemas crescem com o tempo'],
      ['Oportunidade', '25', 'Discute oportunidades perdidas'],
      ['Competitividade', '15', 'Relaciona com posição competitiva'],
      ['Urgência', '10', 'Cria senso de urgência para mudança'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Competência 5
  doc.addPage();
  yPos = margin;
  addSectionTitle('3.5. Apresentação de Valor', 2);
  addParagraph('Apresentar a solução de forma conectada aos problemas e necessidades.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Conexão', '30', 'Liga solução aos problemas específicos'],
      ['Funcionalidades', '25', 'Explica características relevantes'],
      ['ROI', '25', 'Demonstra retorno sobre investimento'],
      ['Diferenciação', '10', 'Destaca diferenciais competitivos'],
      ['Prova', '10', 'Usa casos de sucesso e dados'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Competência 6
  addSectionTitle('3.6. Gestão de Objeções Técnicas', 2);
  addParagraph('Lidar com resistências e preocupações sobre a solução.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Escuta', '20', 'Ouve objeção completamente sem interromper'],
      ['Validação', '20', 'Valida a preocupação do cliente'],
      ['Clarificação', '20', 'Faz perguntas para entender a raiz da objeção'],
      ['Resposta', '25', 'Responde com evidências e exemplos'],
      ['Confirmação', '15', 'Confirma se objeção foi superada'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Competência 7
  doc.addPage();
  yPos = margin;
  addSectionTitle('3.7. Fechamento e Próximos Passos', 2);
  addParagraph('Conduzir o cliente para a decisão e definir próximas ações.');
  
  checkPageBreak(35);
  autoTable(doc, {
    startY: yPos,
    head: [['Sub-critério', 'Peso', 'Descrição']],
    body: [
      ['Resumo', '20', 'Recapitula pontos-chave da conversa'],
      ['Acordo', '25', 'Verifica alinhamento e interesse'],
      ['Proposta', '25', 'Define claramente próximos passos'],
      ['Timeline', '15', 'Estabelece prazos e datas'],
      ['Compromisso', '15', 'Obtém comprometimento do cliente'],
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // =====================
  // 4. SISTEMA DE AVALIAÇÃO COM IA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('4. Sistema de Avaliação com IA', 1);
  addParagraph(
    'A plataforma utiliza Inteligência Artificial avançada para analisar automaticamente cada sessão de roleplay e fornecer feedback detalhado e objetivo.'
  );
  
  addSectionTitle('Modelo de IA Utilizado', 2);
  addParagraph(
    'Google Gemini 2.5 Flash - Modelo equilibrado com excelente desempenho em:\n' +
    '• Análise de conversas e contexto\n' +
    '• Identificação de padrões de comunicação\n' +
    '• Avaliação objetiva baseada em critérios\n' +
    '• Geração de feedback construtivo'
  );
  
  addSectionTitle('Processo de Avaliação', 2);
  addParagraph(
    '1. Captura: Toda a conversa entre vendedor e persona é registrada\n' +
    '2. Análise: IA processa mensagens identificando competências demonstradas\n' +
    '3. Pontuação: Cada competência recebe score de 0-100 com base nos sub-critérios\n' +
    '4. Feedback: Sistema gera feedback textual específico para cada competência\n' +
    '5. Insights: Análise consolidada com pontos fortes e áreas de melhoria\n' +
    '6. Recomendações: Sugestões personalizadas de desenvolvimento'
  );
  
  addSectionTitle('Tempo de Resposta', 2);
  addParagraph(
    'A análise completa de uma sessão leva em média 15-30 segundos, dependendo da duração da conversa. O feedback está disponível imediatamente após o encerramento da sessão.'
  );

  // =====================
  // 5. TIPOS DE REUNIÃO E PROGRESSÃO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('5. Tipos de Reunião e Progressão', 1);
  addParagraph(
    'A plataforma simula 4 tipos de reuniões comerciais, representando as diferentes fases do ciclo de vendas B2B:'
  );
  
  checkPageBreak(50);
  autoTable(doc, {
    startY: yPos,
    head: [['Tipo', 'Objetivo Principal', 'Foco SPIN', 'Duração Típica']],
    body: [
      ['Prospecção Inicial', 'Qualificar e despertar interesse', 'Situation + Problem', '15-20 min'],
      ['Descoberta', 'Entender dores e necessidades', 'Problem + Implication', '30-45 min'],
      ['Apresentação', 'Demonstrar solução e valor', 'Need-payoff + Valor', '45-60 min'],
      ['Negociação', 'Fechar negócio e próximos passos', 'Objeções + Fechamento', '30-45 min'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  addSectionTitle('Progressão Sugerida', 2);
  addParagraph(
    'Recomenda-se que vendedores pratiquem nesta ordem:\n' +
    '1. Prospecção (3-5 sessões) - Dominar abertura e qualificação\n' +
    '2. Descoberta (5-7 sessões) - Aperfeiçoar perguntas SPIN\n' +
    '3. Apresentação (5-7 sessões) - Melhorar demonstração de valor\n' +
    '4. Negociação (3-5 sessões) - Praticar fechamento e objeções\n\n' +
    'Total recomendado: 20-25 sessões para domínio completo'
  );

  // =====================
  // 6. SISTEMA DE PERSONAS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('6. Sistema de Personas', 1);
  addParagraph(
    'As personas são personagens alimentados por IA que simulam decisores reais em empresas. Cada persona tem:'
  );
  addParagraph(
    '• Perfil profissional (cargo, empresa, setor)\n' +
    '• Personalidade e estilo de comunicação\n' +
    '• Dores e desafios específicos\n' +
    '• Padrões de objeção realistas\n' +
    '• Sinais de compra característicos\n' +
    '• Contexto de automação relevante'
  );
  
  addSectionTitle('Níveis de Dificuldade', 2);
  
  checkPageBreak(40);
  autoTable(doc, {
    startY: yPos,
    head: [['Nível', 'Características', 'Recomendado Para']],
    body: [
      [
        'Easy',
        'Receptivo, compartilha informações facilmente, poucas objeções',
        'Iniciantes, primeiras 5-10 sessões'
      ],
      [
        'Medium',
        'Moderadamente cético, exige mais perguntas, objeções padrão',
        'Intermediários, após 10 sessões'
      ],
      [
        'Hard',
        'Muito cético, evasivo, objeções complexas, exige domínio SPIN',
        'Avançados, após 20+ sessões'
      ],
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [51, 51, 51] },
    columnStyles: { 1: { cellWidth: 60 }, 2: { cellWidth: 50 } },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  addSectionTitle('Exemplos de Personas', 2);
  addParagraph(
    '• Marcus Chen (CTO, TechCorp) - Easy: Aberto a inovação, busca eficiência\n' +
    '• Sarah Williams (CFO, FinanceHub) - Medium: Focada em ROI, cautelosa\n' +
    '• Robert Johnson (COO, MegaCorp) - Hard: Altamente cético, múltiplas objeções'
  );

  // =====================
  // 7. MÉTRICAS VOCAIS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('7. Métricas Vocais e Análise Quantitativa', 1);
  addParagraph(
    'Em sessões por voz, a plataforma captura e analisa métricas quantitativas de comunicação:'
  );
  
  checkPageBreak(50);
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'O que Mede', 'Range Ideal', 'Impacto']],
    body: [
      [
        'Talk/Listen Ratio',
        'Proporção entre falar e ouvir',
        '40/60 a 45/55',
        'Vendedores devem ouvir mais que falar'
      ],
      [
        'Filler Words/Min',
        'Frequência de "né", "tipo", "ah"',
        '< 3 por minuto',
        'Muitos fillers reduzem credibilidade'
      ],
      [
        'Speech Speed',
        'Palavras por minuto',
        '140-160 WPM',
        'Muito rápido = ansiedade; Lento = tédio'
      ],
      [
        'Longest Monologue',
        'Maior sequência sem pausa',
        '< 90 segundos',
        'Monólogos longos indicam falta de escuta'
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
    columnStyles: { 0: { cellWidth: 35 }, 2: { cellWidth: 30 } },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // =====================
  // 8. DASHBOARD E KPIs
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('8. Dashboard e KPIs', 1);
  addParagraph(
    'O dashboard fornece visão consolidada do progresso e desempenho do vendedor:'
  );
  
  addSectionTitle('Métricas Principais', 2);
  addParagraph(
    '• Total de Sessões: Quantidade de roleplays completados\n' +
    '• Tempo Total de Prática: Horas investidas em treinamento\n' +
    '• Score Médio: Média de todas as avaliações (0-100)\n' +
    '• Melhor Score: Maior pontuação alcançada\n' +
    '• Pior Score: Menor pontuação (para identificar dificuldades)\n' +
    '• Tendência: Indicador de evolução (↑ melhorando, ↓ decaindo, → estável)'
  );
  
  addSectionTitle('Gráficos e Visualizações', 2);
  addParagraph(
    '• Radar Chart de Competências: Mostra força em cada uma das 7 competências\n' +
    '• Evolução SPIN: Linha temporal mostrando progresso nas 4 categorias SPIN\n' +
    '• Heatmap: Cruzamento entre tipo de reunião e competências\n' +
    '• Histórico de Sessões: Lista das últimas 10 sessões com scores'
  );

  // =====================
  // 9. FLUXO DE UMA SESSÃO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('9. Fluxo de Uma Sessão', 1);
  
  addSectionTitle('Etapa 1: Configuração', 2);
  addParagraph(
    '• Usuário acessa página /roleplay\n' +
    '• Seleciona persona (por exemplo: Marcus Chen - CTO)\n' +
    '• Escolhe tipo de reunião (Prospecção, Descoberta, Apresentação ou Negociação)\n' +
    '• Define método: Texto (chat) ou Voz (chamada simulada)\n' +
    '• Sistema cria registro na tabela roleplay_sessions com status "active"'
  );
  
  addSectionTitle('Etapa 2: Roleplay', 2);
  addParagraph(
    '• Se texto: Interface de chat em tempo real\n' +
    '• Se voz: Transcrição automática de áudio para texto\n' +
    '• Edge function chat-roleplay processa cada mensagem\n' +
    '• Persona responde com base em seu perfil e contexto\n' +
    '• Todas as mensagens são salvas em session_messages'
  );
  
  addSectionTitle('Etapa 3: Encerramento', 2);
  addParagraph(
    '• Usuário clica em "Encerrar Sessão"\n' +
    '• Sistema atualiza status para "completed"\n' +
    '• Calcula duration_seconds (tempo total da sessão)\n' +
    '• Captura voice_metrics se foi sessão por voz'
  );
  
  addSectionTitle('Etapa 4: Avaliação Automática', 2);
  addParagraph(
    '• Edge function evaluate-competencies é invocada\n' +
    '• IA analisa toda a conversa contra os critérios SPIN\n' +
    '• Gera score (0-100) para cada uma das 7 competências\n' +
    '• Calcula sub_scores para cada sub-critério\n' +
    '• Cria feedback textual específico\n' +
    '• Salva tudo em competency_scores\n' +
    '• Calcula overall_score (média ponderada)'
  );
  
  addSectionTitle('Etapa 5: Geração de Insights', 2);
  addParagraph(
    '• Edge function generate-insights é invocada\n' +
    '• Consolida dados de múltiplas sessões do usuário\n' +
    '• Identifica padrões, pontos fortes e fracos\n' +
    '• Gera executive_summary\n' +
    '• Lista highlights (momentos positivos)\n' +
    '• Cria recommendations (ações de melhoria)\n' +
    '• Salva em user_insights'
  );
  
  addSectionTitle('Etapa 6: Exibição de Resultados', 2);
  addParagraph(
    '• Usuário é redirecionado para /session-detail/[id]\n' +
    '• Visualiza overall_score com indicador visual\n' +
    '• Vê breakdown por competência com gráfico de barras\n' +
    '• Lê executive_summary e highlights\n' +
    '• Acessa recommendations específicas\n' +
    '• Pode baixar PDF completo do relatório'
  );

  // =====================
  // 10. ARQUITETURA TÉCNICA
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('10. Arquitetura Técnica', 1);
  
  addSectionTitle('Stack Tecnológico', 2);
  addParagraph(
    'Frontend:\n' +
    '• React 18.3 + TypeScript\n' +
    '• Vite (build tool)\n' +
    '• Tailwind CSS (estilização)\n' +
    '• Shadcn/ui (componentes)\n' +
    '• React Router (navegação)\n' +
    '• Recharts (gráficos)\n' +
    '• TanStack Query (cache e sincronização)'
  );
  
  addParagraph(
    'Backend:\n' +
    '• Supabase (BaaS completo)\n' +
    '• PostgreSQL (banco de dados)\n' +
    '• Edge Functions (Deno runtime)\n' +
    '• Row Level Security (RLS)\n' +
    '• Realtime subscriptions'
  );
  
  addParagraph(
    'Inteligência Artificial:\n' +
    '• Lovable AI Gateway\n' +
    '• Google Gemini 2.5 Flash\n' +
    '• Análise de linguagem natural\n' +
    '• Geração de feedback contextual'
  );

  addSectionTitle('Tabelas do Banco de Dados', 2);
  
  checkPageBreak(60);
  autoTable(doc, {
    startY: yPos,
    head: [['Tabela', 'Propósito', 'Relações']],
    body: [
      ['profiles', 'Dados dos usuários', 'Vinculada a auth.users'],
      ['personas', 'Personagens para roleplay', 'Independente'],
      ['roleplay_sessions', 'Sessões de treinamento', 'user_id → profiles, persona_id → personas'],
      ['session_messages', 'Mensagens das conversas', 'session_id → roleplay_sessions'],
      ['competency_scores', 'Avaliações por competência', 'session_id → roleplay_sessions'],
      ['user_insights', 'Análises consolidadas', 'user_id → profiles'],
      ['user_roles', 'Papéis e permissões', 'user_id → profiles'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
    columnStyles: { 2: { cellWidth: 60 } },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  addSectionTitle('Edge Functions', 2);
  
  checkPageBreak(50);
  autoTable(doc, {
    startY: yPos,
    head: [['Função', 'Propósito', 'Modelo IA']],
    body: [
      ['chat-roleplay', 'Conversa em tempo real com persona', 'Gemini 2.5 Flash'],
      ['evaluate-competencies', 'Avalia sessão nas 7 competências', 'Gemini 2.5 Flash'],
      ['generate-insights', 'Gera análise consolidada', 'Gemini 2.5 Flash'],
      ['realtime-voice', 'Transcrição de áudio para texto', 'Gemini 2.5 Flash'],
      ['cleanup-sessions', 'Limpa sessões abandonadas', 'N/A'],
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // =====================
  // 11. SEGURANÇA E RLS
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('11. Segurança e Row Level Security', 1);
  addParagraph(
    'A plataforma implementa Row Level Security (RLS) em todas as tabelas sensíveis, garantindo que usuários só acessem seus próprios dados.'
  );
  
  addSectionTitle('Políticas de Acesso', 2);
  
  checkPageBreak(60);
  autoTable(doc, {
    startY: yPos,
    head: [['Tabela', 'Política', 'Regra']],
    body: [
      ['profiles', 'SELECT', 'auth.uid() = id OR has_role(admin)'],
      ['profiles', 'UPDATE', 'auth.uid() = id'],
      ['roleplay_sessions', 'SELECT', 'auth.uid() = user_id OR has_role(admin)'],
      ['roleplay_sessions', 'INSERT', 'auth.uid() = user_id'],
      ['roleplay_sessions', 'UPDATE', 'auth.uid() = user_id'],
      ['competency_scores', 'SELECT', 'session.user_id = auth.uid() OR has_role(admin)'],
      ['competency_scores', 'INSERT', 'session.user_id = auth.uid()'],
      ['user_insights', 'SELECT', 'auth.uid() = user_id'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 51, 51] },
    columnStyles: { 2: { cellWidth: 80 } },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  addSectionTitle('Autenticação', 2);
  addParagraph(
    '• JWT tokens fornecidos por Supabase Auth\n' +
    '• Auto-confirm de email habilitado (desenvolvimento)\n' +
    '• Session management automático\n' +
    '• Protected routes no frontend'
  );

  // =====================
  // 12. GLOSSÁRIO
  // =====================
  doc.addPage();
  yPos = margin;
  
  addSectionTitle('12. Glossário', 1);
  
  checkPageBreak(80);
  autoTable(doc, {
    startY: yPos,
    head: [['Termo', 'Definição']],
    body: [
      ['SPIN Selling', 'Metodologia de vendas consultivas baseada em 4 tipos de perguntas'],
      ['Situation', 'Perguntas sobre a situação atual do cliente'],
      ['Problem', 'Perguntas que identificam dificuldades e insatisfações'],
      ['Implication', 'Perguntas sobre consequências dos problemas'],
      ['Need-payoff', 'Perguntas sobre o valor da solução'],
      ['Persona', 'Personagem simulado alimentado por IA para roleplay'],
      ['Roleplay', 'Simulação de conversa comercial para treinamento'],
      ['Edge Function', 'Função serverless que roda na borda (próximo ao usuário)'],
      ['RLS', 'Row Level Security - Segurança a nível de linha no banco'],
      ['JWT', 'JSON Web Token - Token de autenticação'],
      ['Overall Score', 'Pontuação geral da sessão (0-100)'],
      ['Sub-scores', 'Pontuações detalhadas por sub-critério'],
      ['Talk/Listen Ratio', 'Proporção entre tempo falando e ouvindo'],
      ['Filler Words', 'Palavras de preenchimento ("né", "tipo", "ah")'],
      ['ROI', 'Return on Investment - Retorno sobre investimento'],
    ],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [51, 51, 51] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 130 } },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // =====================
  // FOOTER - ÚLTIMA PÁGINA
  // =====================
  doc.addPage();
  yPos = pageHeight / 2 - 30;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Documentação Técnica Completa', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma de Treinamento SPIN Selling com IA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 30;
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text('Versão 1.0.0', pageWidth / 2, yPos + 10, { align: 'center' });
  
  yPos += 30;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Este documento foi gerado automaticamente pela plataforma', pageWidth / 2, yPos, { align: 'center' });
  doc.text('e reflete o estado atual do sistema.', pageWidth / 2, yPos + 7, { align: 'center' });

  // Save PDF
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`Documentacao_Tecnica_SPIN_${timestamp}.pdf`);
};
