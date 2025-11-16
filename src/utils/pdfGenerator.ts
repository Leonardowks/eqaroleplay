import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InsightData {
  analysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    spinAnalysis: {
      situation: string;
      problem: string;
      implication: string;
      needPayoff: string;
    };
    recommendations: Array<{
      title: string;
      description: string;
      priority: string;
      impact: string;
    }>;
    nextSteps: string[];
  };
  sessionsData: any[];
  scoresData: any[];
  sessionHighlights?: string[];
  sessionRecommendations?: string[];
  voiceMetrics?: {
    talk_listen_ratio?: number;
    filler_words_per_minute?: number;
    speech_speed_wpm?: number;
    longest_monologue_seconds?: number;
  };
}

export const generatePerformanceReport = (data: InsightData, userName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function to add new page if needed
  const checkAddPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > 270) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246); // primary color
  doc.text('Relatório de Desempenho - EQA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${userName} • ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;

  // Summary Section
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumo Executivo', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(data.analysis.summary, pageWidth - 40);
  doc.text(summaryLines, 20, yPos);
  yPos += summaryLines.length * 6 + 10;

  // Statistics
  checkAddPage(40);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Estatísticas Gerais', 20, yPos);
  yPos += 8;

  const totalSessions = data.sessionsData.length;
  const avgScore = data.sessionsData.reduce((acc, s) => acc + (s.overall_score || 0), 0) / totalSessions;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Sessões', totalSessions.toString()],
      ['Pontuação Média', avgScore.toFixed(2) + '/10'],
      ['Última Atividade', new Date(data.sessionsData[0]?.completed_at).toLocaleDateString('pt-BR')],
    ],
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Strengths Section
  checkAddPage(50);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Pontos Fortes', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  data.analysis.strengths.forEach((strength, index) => {
    checkAddPage(8);
    doc.setTextColor(34, 197, 94); // success color
    doc.text('✓', 22, yPos);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(strength, pageWidth - 50);
    doc.text(lines, 28, yPos);
    yPos += lines.length * 6 + 2;
  });

  yPos += 8;

  // Weaknesses Section
  checkAddPage(50);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Áreas de Melhoria', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  data.analysis.weaknesses.forEach((weakness, index) => {
    checkAddPage(8);
    doc.setTextColor(239, 68, 68); // destructive color
    doc.text('!', 22, yPos);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(weakness, pageWidth - 50);
    doc.text(lines, 28, yPos);
    yPos += lines.length * 6 + 2;
  });

  yPos += 10;

  // Voice Metrics Section (if available)
  if (data.voiceMetrics) {
    checkAddPage(60);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Análise Vocal', 20, yPos);
    yPos += 8;

    const metrics = [
      { label: 'Razão Fala/Escuta', value: data.voiceMetrics.talk_listen_ratio?.toFixed(2) || 'N/A', ideal: 'Ideal: 0.8-1.2' },
      { label: 'Palavras de Preenchimento', value: `${data.voiceMetrics.filler_words_per_minute?.toFixed(1) || 'N/A'}/min`, ideal: 'Ideal: < 3/min' },
      { label: 'Velocidade de Fala', value: `${data.voiceMetrics.speech_speed_wpm || 'N/A'} ppm`, ideal: 'Ideal: 140-160 ppm' },
      { label: 'Maior Monólogo', value: `${data.voiceMetrics.longest_monologue_seconds || 'N/A'}s`, ideal: 'Ideal: < 120s' },
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Valor', 'Referência']],
      body: metrics.map(m => [m.label, m.value, m.ideal]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Session Highlights (if available)
  if (data.sessionHighlights && data.sessionHighlights.length > 0) {
    checkAddPage(50);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Destaques da Sessão', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    data.sessionHighlights.forEach((highlight, index) => {
      checkAddPage(8);
      doc.setTextColor(34, 197, 94);
      doc.text('✓', 22, yPos);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(highlight, pageWidth - 50);
      doc.text(lines, 28, yPos);
      yPos += lines.length * 6 + 2;
    });

    yPos += 8;
  }

  // Session Recommendations (if available)
  if (data.sessionRecommendations && data.sessionRecommendations.length > 0) {
    checkAddPage(50);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Recomendações Imediatas', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    data.sessionRecommendations.forEach((rec, index) => {
      checkAddPage(8);
      doc.setTextColor(59, 130, 246);
      doc.text('→', 22, yPos);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(rec, pageWidth - 50);
      doc.text(lines, 28, yPos);
      yPos += lines.length * 6 + 2;
    });

    yPos += 10;
  }

  // SPIN Analysis
  checkAddPage(80);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Análise SPIN Selling', 20, yPos);
  yPos += 8;

  const spinCategories = [
    { label: 'Situação', key: 'situation', color: [59, 130, 246] },
    { label: 'Problema', key: 'problem', color: [251, 146, 60] },
    { label: 'Implicação', key: 'implication', color: [168, 85, 247] },
    { label: 'Necessidade-Solução', key: 'needPayoff', color: [34, 197, 94] },
  ];

  doc.setFontSize(10);
  spinCategories.forEach(({ label, key, color }) => {
    checkAddPage(20);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(11);
    doc.text(label, 20, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const analysis = data.analysis.spinAnalysis[key as keyof typeof data.analysis.spinAnalysis];
    const lines = doc.splitTextToSize(analysis, pageWidth - 40);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 6;
  });

  // Recommendations
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Recomendações Personalizadas', 20, yPos);
  yPos += 10;

  data.analysis.recommendations.forEach((rec, index) => {
    checkAddPage(40);
    
    const priorityColors: any = {
      high: [239, 68, 68],
      medium: [251, 146, 60],
      low: [34, 197, 94],
    };
    
    const color = priorityColors[rec.priority] || [100, 100, 100];
    
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${index + 1}. ${rec.title}`, 20, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const descLines = doc.splitTextToSize(rec.description, pageWidth - 40);
    doc.text(descLines, 25, yPos);
    yPos += descLines.length * 5 + 3;
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prioridade: ${rec.priority.toUpperCase()} | Impacto: ${rec.impact}`, 25, yPos);
    yPos += 10;
  });

  // Next Steps
  checkAddPage(50);
  yPos += 5;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Próximos Passos', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  data.analysis.nextSteps.forEach((step, index) => {
    checkAddPage(8);
    doc.setTextColor(139, 92, 246);
    doc.text(`${index + 1}.`, 22, yPos);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(step, pageWidth - 50);
    doc.text(lines, 28, yPos);
    yPos += lines.length * 6 + 2;
  });

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Gerado por EQA - Excelência em Qualificação e Automação',
    pageWidth / 2,
    280,
    { align: 'center' }
  );

  // Save the PDF
  doc.save(`relatorio-eqa-${new Date().getTime()}.pdf`);
};
