import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para calcular métricas vocais
function calculateVoiceMetrics(messages: any[]) {
  const userMessages = messages.filter(m => m.role === 'user');
  const clientMessages = messages.filter(m => m.role === 'assistant');
  
  const totalUserWords = userMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const totalClientWords = clientMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  
  // Talk/Listen Ratio
  const talkListenRatio = totalClientWords > 0 ? totalUserWords / totalClientWords : 0;
  
  // Filler words (aproximado)
  const fillerWords = ['ééé', 'hmm', 'ahh', 'tipo', 'né', 'então', 'bem', 'assim'];
  const fillerCount = userMessages.reduce((sum, m) => {
    const content = m.content.toLowerCase();
    return sum + fillerWords.reduce((count, filler) => 
      count + (content.match(new RegExp(filler, 'g')) || []).length, 0
    );
  }, 0);
  const totalMinutes = userMessages.length > 0 ? userMessages.length / 2 : 1; // Aproximação
  const fillerWordsPerMinute = fillerCount / totalMinutes;
  
  // Speech speed (words per minute)
  const speechSpeedWpm = totalMinutes > 0 ? totalUserWords / totalMinutes : 0;
  
  // Longest monologue
  const longestMonologue = userMessages.reduce((max, m) => {
    const wordCount = m.content.split(/\s+/).length;
    return wordCount > max ? wordCount : max;
  }, 0);
  const longestMonologueSeconds = Math.round((longestMonologue / 150) * 60); // Assumindo 150 wpm
  
  return {
    talk_listen_ratio: parseFloat(talkListenRatio.toFixed(2)),
    filler_words_per_minute: parseFloat(fillerWordsPerMinute.toFixed(2)),
    speech_speed_wpm: Math.round(speechSpeedWpm),
    longest_monologue_seconds: longestMonologueSeconds
  };
}

// Função para gerar insights com IA
async function generateInsights(evaluations: any[], conversation: string, overallScore: number, apiKey: string) {
  const insightPrompt = `Com base na análise de competências SPIN Selling a seguir, gere insights estruturados:

SCORE GERAL: ${overallScore}/100

COMPETÊNCIAS AVALIADAS:
${evaluations.map(e => `- ${e.competency}: ${e.score}/100\n  ${e.feedback}`).join('\n\n')}

Gere um JSON com a seguinte estrutura:
{
  "executive_summary": "Resumo executivo de 2-3 frases sobre o desempenho geral",
  "highlights": ["3-5 destaques positivos específicos da sessão"],
  "recommendations": ["3-5 recomendações acionáveis para melhoria"]
}

Seja específico, direto e focado em automação com IA.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Você é um especialista em análise de vendas B2B. Retorne apenas JSON válido.' },
        { role: 'user', content: insightPrompt }
      ],
    }),
  });

  if (!response.ok) {
    console.error('Failed to generate insights, using defaults');
    return {
      executive_summary: 'Sessão concluída com sucesso.',
      highlights: ['Participação ativa na conversa'],
      recommendations: ['Continue praticando suas habilidades SPIN']
    };
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices[0].message.content;
  
  try {
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch {
    return {
      executive_summary: 'Sessão concluída com sucesso.',
      highlights: ['Participação ativa na conversa'],
      recommendations: ['Continue praticando suas habilidades SPIN']
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar sessão e mensagens
    const { data: session, error: sessionError } = await supabase
      .from('roleplay_sessions')
      .select(`
        *,
        personas (
          name,
          role,
          sector,
          difficulty,
          pain_points,
          objection_patterns,
          automation_context
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    const { data: messages, error: messagesError } = await supabase
      .from('session_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      throw new Error('No messages found for session');
    }

    console.log(`Found ${messages.length} messages for session ${sessionId}`);

    // Formatar conversa
    const conversation = messages
      .map(m => `${m.role === 'user' ? 'Vendedor' : 'Cliente'}: ${m.content}`)
      .join('\n\n');

    console.log(`Conversation preview: ${conversation.substring(0, 200)}...`);

    const persona = session.personas;
    const meetingTypeLabels: Record<string, string> = {
      prospecting: 'Prospecção',
      discovery: 'Descoberta',
      presentation: 'Apresentação de Solução',
      negotiation: 'Negociação'
    };

    // System prompt focado em SPIN Selling + Automação IA
    const systemPrompt = `Você é um avaliador especializado em SPIN Selling para vendas B2B de soluções de AUTOMAÇÃO COM IA.

CONTEXTO:
- Tipo de reunião: ${meetingTypeLabels[session.meeting_type] || session.meeting_type}
- Persona: ${persona.name} (${persona.difficulty})
- Setor: ${persona.sector}
- Foco: Vendas de soluções de automação inteligente

Analise a conversa e avalie as 7 competências seguindo critérios SPIN:

1. ABERTURA E RAPPORT (0-100):
   - Conexão inicial (0-25): Empatia, tom adequado
   - Credibilidade (0-25): Casos de sucesso, autoridade em automação IA
   - Agenda clara (0-25): Expectativas alinhadas, tempo respeitado
   - Value proposition inicial (0-25): Gancho de valor mencionado

2. DESCOBERTA DE SITUAÇÃO (0-100):
   - Mapeamento de processos manuais (0-30): "Como funciona seu processo atual de X?"
   - Identificação de volume/escala (0-25): "Quantas horas/semana sua equipe gasta nisso?"
   - Contexto tecnológico (0-25): Ferramentas atuais, integrações necessárias
   - Stakeholders envolvidos (0-20): Quem decide? Quem usa?

3. IDENTIFICAÇÃO DE PROBLEMAS (0-100):
   - Exploração de ineficiências (0-30): Gargalos, erros humanos, lentidão
   - Dores latentes descobertas (0-25): Problemas que o cliente não verbalizou
   - Frustração validada (0-25): Empatia com situação atual
   - Priorização (0-20): Qual problema é mais urgente?

4. AMPLIFICAÇÃO DE IMPLICAÇÕES (0-100):
   - Quantificação de custos (0-30): "Quanto você perde por mês com esse problema?"
   - Impacto no negócio (0-25): Efeito em receita, satisfação, competitividade
   - Urgência criada (0-25): "O que acontece se não resolver isso?"
   - Risco de inação (0-20): Consequências de adiar decisão

5. APRESENTAÇÃO DE VALOR (0-100):
   - ROI articulado (0-30): Economia de tempo/dinheiro com automação
   - Benefícios tangíveis (0-25): Casos de uso específicos
   - Diferenciação (0-25): Por que nossa IA vs. concorrentes?
   - Fit solução-problema (0-20): Conexão clara entre dor e solução

6. GESTÃO DE OBJEÇÕES TÉCNICAS (0-100):
   - Escuta ativa (0-20): Deixou cliente expressar preocupação completamente
   - Validação (0-20): "Entendo sua preocupação com X..."
   - Técnicas persuasivas (0-30): Feel-felt-found, prova social, dados
   - Transformação em benefício (0-30): Objeção virou argumento de venda

7. FECHAMENTO E PRÓXIMOS PASSOS (0-100):
   - Trial close (0-25): "Faz sentido até aqui?"
   - Proposta de ação (0-30): Demo, trial, reunião técnica
   - Comprometimento obtido (0-25): Cliente concordou com próximo passo?
   - Follow-up estruturado (0-20): Data/hora definida

REGRAS DE AVALIAÇÃO:
- Seja RIGOROSO: 90+ só para excelência excepcional
- Considere o tipo de reunião: Prospecção tem mais Situação/Problema, Negociação tem mais Objeções/Fechamento
- Dê feedback ACIONÁVEL: não "melhorar comunicação", mas "pergunte 'Quanto tempo sua equipe gasta nisso?' para quantificar"
- SEMPRE mencione automação com IA no contexto
- Forneça 3-4 sugestões práticas específicas por competência
- Para cada sub_score, forneça feedback específico de 5-10 palavras em "sub_scores_feedback"

Retorne um JSON array com TODAS as 7 competências EXATAMENTE neste formato:
[
  {
    "competency": "Abertura e Rapport",
    "score": 85,
    "sub_scores": {
      "conexao_inicial": 90,
      "credibilidade": 85,
      "agenda_clara": 80,
      "value_proposition": 85
    },
    "sub_scores_feedback": {
      "conexao_inicial": "Excelente empatia demonstrada logo no início",
      "credibilidade": "Mencionou case relevante, mas poderia detalhar mais",
      "agenda_clara": "Agenda foi definida, mas tardiamente na conversa",
      "value_proposition": "Value proposition clara e focada no cliente"
    },
    "feedback": "Excelente abertura! Estabeleceu rapport forte e mencionou case de automação similar. Sugestão: definir agenda mais cedo ('Temos 30 minutos, vamos focar em X, ok?').",
    "ai_suggestions": [
      "Use técnica do espelho: repita últimas palavras do cliente",
      "Mencione case específico do setor dele logo na abertura",
      "Pergunte: 'O que seria um resultado ideal para você hoje?'"
    ],
    "spin_category": "opening"
  },
  {
    "competency": "Descoberta de Situação",
    "score": 75,
    "sub_scores": {
      "mapeamento_processos": 80,
      "volume_escala": 70,
      "contexto_tecnologico": 75,
      "stakeholders": 75
    },
    "sub_scores_feedback": {
      "mapeamento_processos": "Bom mapeamento inicial dos processos atuais",
      "volume_escala": "Poderia quantificar melhor tempo e volume",
      "contexto_tecnologico": "Explorou ferramentas mas faltou profundidade",
      "stakeholders": "Identificou decisores mas não mapeou influenciadores"
    },
    "feedback": "Boa descoberta de situação com perguntas relevantes sobre processos atuais.",
    "ai_suggestions": [
      "Pergunte: 'Quantas horas por semana sua equipe dedica a isso?'",
      "Explore: 'Quais sistemas vocês usam hoje e como eles se integram?'",
      "Mapeie: 'Além de você, quem mais precisa aprovar essa decisão?'"
    ],
    "spin_category": "situation"
  }
]

IMPORTANTE: Gere TODAS as 7 competências com sub_scores e sub_scores_feedback completos.

CONVERSA:
${conversation}`;

    // Chamar Lovable AI para avaliação
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um avaliador SPIN Selling para vendas B2B de automação com IA. Analise a conversa fornecida e retorne APENAS o JSON array com as 7 competências avaliadas. Não adicione explicações ou texto adicional.' },
          { role: 'user', content: systemPrompt }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. Please add credits to your workspace.' 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to generate evaluation');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;

    // Parse JSON do conteúdo
    let evaluations;
    try {
      // Remover markdown code blocks se existirem
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      evaluations = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid evaluation format from AI');
    }

    // Salvar competências no banco (garantir que scores são inteiros)
    const competencyInserts = evaluations.map((comp: any) => ({
      session_id: sessionId,
      competency_name: comp.competency,
      score: Math.round(comp.score),
      feedback: comp.feedback,
      spin_category: comp.spin_category || null,
      sub_scores: comp.sub_scores ? Object.fromEntries(
        Object.entries(comp.sub_scores).map(([k, v]) => [k, Math.round(Number(v))])
      ) : null,
      sub_scores_feedback: comp.sub_scores_feedback || null,
      ai_suggestions: comp.ai_suggestions || null,
    }));

    const { error: insertError } = await supabase
      .from('competency_scores')
      .insert(competencyInserts);

    if (insertError) {
      console.error('Error inserting competency scores:', insertError);
      throw insertError;
    }

    // Calcular overall score (média das 7 competências)
    const overallScore = Math.round(
      evaluations.reduce((sum: number, comp: any) => sum + comp.score, 0) / evaluations.length
    );

    // Calcular métricas vocais
    const voiceMetrics = calculateVoiceMetrics(messages);

    // Gerar insights com IA
    const insights = await generateInsights(evaluations, conversation, overallScore, LOVABLE_API_KEY);

    // Atualizar sessão com overall_score, voice_metrics e insights
    const { error: updateError } = await supabase
      .from('roleplay_sessions')
      .update({ 
        overall_score: overallScore,
        voice_metrics: voiceMetrics,
        highlights: insights.highlights,
        recommendations: insights.recommendations,
        executive_summary: insights.executive_summary
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session score:', updateError);
      throw updateError;
    }

    console.log(`Session ${sessionId} evaluated. Overall score: ${overallScore}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        overallScore,
        competencies: evaluations 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in evaluate-competencies:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});