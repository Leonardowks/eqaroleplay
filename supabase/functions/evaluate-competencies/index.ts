import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyConfig {
  company_name: string;
  segment: string;
  product_description: string;
  ticket_range: string;
  sales_cycle: string;
  icp: {
    buyer_role: string;
    main_pains: string[];
    common_objections: string[];
    sophistication_level: string;
  };
  methodology: string;
  sales_stages: string[];
  competencies: string[];
  tone: string;
}

const DEFAULT_COMPETENCIES = [
  'Abertura',
  'Perguntas de Situação',
  'Perguntas de Problema',
  'Perguntas de Implicação',
  'Perguntas de Necessidade-Benefício',
  'Tratamento de Objeções',
  'Fechamento',
];

const SPIN_CATEGORY_MAP: Record<string, string> = {
  'Abertura': 'opening',
  'Perguntas de Situação': 'situation',
  'Descoberta de Situação': 'situation',
  'Perguntas de Problema': 'problem',
  'Identificação de Problemas': 'problem',
  'Perguntas de Implicação': 'implication',
  'Amplificação de Implicações': 'implication',
  'Perguntas de Necessidade-Benefício': 'need_payoff',
  'Apresentação de Valor': 'need_payoff',
  'Tratamento de Objeções': 'objection_handling',
  'Gestão de Objeções': 'objection_handling',
  'Fechamento': 'closing',
  'Qualificação': 'situation',
  'Diagnóstico': 'problem',
  'Negociação': 'objection_handling',
  'Proposta': 'need_payoff',
  'Follow-up': 'closing',
};

// ─── Voice Metrics ───────────────────────────────────────────────────────────

function calculateVoiceMetrics(messages: any[]) {
  const userMessages = messages.filter(m => m.role === 'user');
  const clientMessages = messages.filter(m => m.role === 'assistant');

  const totalUserWords = userMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  const totalClientWords = clientMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);

  const talkListenRatio = totalClientWords > 0 ? totalUserWords / totalClientWords : 0;

  const fillerWords = ['ééé', 'hmm', 'ahh', 'tipo', 'né', 'então', 'bem', 'assim'];
  const fillerCount = userMessages.reduce((sum, m) => {
    const content = m.content.toLowerCase();
    return sum + fillerWords.reduce((count, filler) =>
      count + (content.match(new RegExp(filler, 'g')) || []).length, 0
    );
  }, 0);
  const totalMinutes = userMessages.length > 0 ? userMessages.length / 2 : 1;
  const fillerWordsPerMinute = fillerCount / totalMinutes;
  const speechSpeedWpm = totalMinutes > 0 ? totalUserWords / totalMinutes : 0;

  const longestMonologue = userMessages.reduce((max, m) => {
    const wordCount = m.content.split(/\s+/).length;
    return wordCount > max ? wordCount : max;
  }, 0);
  const longestMonologueSeconds = Math.round((longestMonologue / 150) * 60);

  return {
    talk_listen_ratio: parseFloat(talkListenRatio.toFixed(2)),
    filler_words_per_minute: parseFloat(fillerWordsPerMinute.toFixed(2)),
    speech_speed_wpm: Math.round(speechSpeedWpm),
    longest_monologue_seconds: longestMonologueSeconds,
  };
}

// ─── AI Helpers ──────────────────────────────────────────────────────────────

async function generateInsights(evaluations: any[], overallScore: number, apiKey: string) {
  const insightPrompt = `Com base na análise de competências a seguir, gere insights estruturados:

SCORE GERAL: ${overallScore}/100

COMPETÊNCIAS AVALIADAS:
${evaluations.map(e => `- ${e.competency}: ${e.score}/100\n  ${e.feedback}`).join('\n\n')}

Gere um JSON com a seguinte estrutura:
{
  "executive_summary": "Resumo executivo de 2-3 frases sobre o desempenho geral",
  "highlights": ["3-5 destaques positivos específicos da sessão"],
  "recommendations": ["3-5 recomendações acionáveis para melhoria"]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em análise de vendas B2B. Retorne apenas JSON válido.' },
          { role: 'user', content: insightPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Failed to generate insights');
      return { executive_summary: 'Sessão concluída com sucesso.', highlights: ['Participação ativa'], recommendations: ['Continue praticando'] };
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch {
    return { executive_summary: 'Sessão concluída com sucesso.', highlights: ['Participação ativa'], recommendations: ['Continue praticando'] };
  }
}

async function generateStructuredRecommendations(evaluations: any[], overallScore: number, sessionId: string, apiKey: string, supabase: any) {
  const recommendationsPrompt = `Analise as competências avaliadas e gere recomendações ESTRUTURADAS e PRIORIZADAS.

SCORE GERAL: ${overallScore}/100

COMPETÊNCIAS AVALIADAS:
${evaluations.map(e => `- ${e.competency}: ${e.score}/100\n  ${e.feedback}`).join('\n\n')}

Gere um JSON array com 4-6 recomendações:
[{
  "recommendation_type": "tactical"|"strategic"|"behavioral",
  "priority": "high"|"medium"|"low",
  "title": "string",
  "description": "string",
  "action_items": ["3-4 ações específicas"],
  "related_competency": "string",
  "expected_impact": "string com % ou métrica",
  "time_to_implement": "string"
}]

REGRAS:
- priority: "high" (score < 70), "medium" (70-85), "low" (> 85)
- action_items: 3-4 ações ESPECÍFICAS e MENSURÁVEIS
- Focar nos 2-3 pontos MAIS FRACOS`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em coaching de vendas B2B. Retorne apenas JSON válido.' },
          { role: 'user', content: recommendationsPrompt },
        ],
      }),
    });

    if (!response.ok) return [];

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const recommendations = JSON.parse(cleanContent);

    const inserts = recommendations.map((rec: any) => ({
      session_id: sessionId,
      recommendation_type: rec.recommendation_type,
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      action_items: rec.action_items,
      related_competency: rec.related_competency,
      expected_impact: rec.expected_impact,
      time_to_implement: rec.time_to_implement,
    }));

    const { error } = await supabase.from('session_recommendations').insert(inserts);
    if (error) console.error('Error inserting recommendations:', error);

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

// ─── Dynamic Evaluation Prompt Builder ───────────────────────────────────────

function buildEvaluationPrompt(
  config: CompanyConfig | null,
  persona: any,
  session: any,
  conversation: string,
  criteriaByCompetency: Record<string, any[]>
): string {
  const competencies = config?.competencies?.length ? config.competencies : DEFAULT_COMPETENCIES;
  const methodology = config?.methodology || 'SPIN';
  const methodologyLabel = methodology === 'Nenhuma' ? 'consultative sales' : methodology;

  const meetingTypeLabels: Record<string, string> = {
    prospecting: 'Prospecção', prospection: 'Prospecção',
    discovery: 'Descoberta', presentation: 'Apresentação de Solução',
    negotiation: 'Negociação',
  };

  const competencyList = competencies.map((c, i) => {
    const criteria = criteriaByCompetency[c] || [];
    const criteriaSection = criteria.length > 0
      ? criteria.map((cr: any, idx: number) => `     ${idx + 1}. ${cr.criterion_name} (${cr.criterion_key}): ${cr.evaluation_guide}`).join('\n')
      : '     (avaliar de forma geral)';
    return `${i + 1}. ${c} (0-100):\n${criteriaSection}`;
  }).join('\n\n');

  const contextSection = config
    ? `CONTEXTO DA EMPRESA:
- Produto: ${config.product_description}
- Segmento: ${config.segment}
- Ticket: ${config.ticket_range}
- Ciclo: ${config.sales_cycle}
- ICP: ${config.icp?.buyer_role || 'Comprador'} com dores: ${(config.icp?.main_pains || []).join(', ')}
- Tom esperado: ${config.tone || 'profissional'}`
    : `CONTEXTO: Vendas B2B de automação com IA`;

  return `Você é um avaliador especializado em ${methodologyLabel} para vendas B2B.

${contextSection}

CONTEXTO DA SESSÃO:
- Tipo de reunião: ${meetingTypeLabels[session.meeting_type] || session.meeting_type}
- Persona: ${persona.name} (${persona.difficulty})
- Setor: ${persona.sector}

COMPETÊNCIAS A AVALIAR (score 0-100 cada):

${competencyList}

Para cada competência, retorne:
- competency: nome exato da competência
- score: 0-100
- feedback: observação específica em português sobre o que o vendedor fez ou deixou de fazer
- sub_scores: objeto com sub-critérios e scores 0-100
- sub_scores_feedback: objeto com feedback curto para cada sub-critério
- criterion_approvals: objeto com "approved" (>=70), "neutral" (50-69), "rejected" (<50) para cada sub-critério
- ai_suggestions: array com 3-4 sugestões práticas específicas
- spin_category: categoria SPIN se aplicável (opening, situation, problem, implication, need_payoff, objection_handling, closing) ou null

REGRAS:
- Seja RIGOROSO: 90+ só para excelência excepcional
- Feedback ACIONÁVEL: não "melhorar comunicação", mas "pergunte X antes de Y"
- Avalie APENAS o VENDEDOR, não o comprador
- Responda em português do Brasil

Retorne APENAS um JSON array com TODAS as ${competencies.length} competências.

CONVERSA:
${conversation}`;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, organization_id } = await req.json();

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch session with persona, messages, criteria, and optionally org config in parallel
    const [sessionResult, messagesResult, criteriaResult, orgResult] = await Promise.all([
      supabase
        .from('roleplay_sessions')
        .select('*, personas (name, role, sector, difficulty, pain_points, objection_patterns, automation_context)')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('session_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
      supabase
        .from('competency_criteria')
        .select('*')
        .order('competency_name', { ascending: true }),
      organization_id
        ? supabase.from('organizations').select('company_config').eq('id', organization_id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (sessionResult.error) throw sessionResult.error;
    if (messagesResult.error) throw messagesResult.error;

    const session = sessionResult.data;
    const messages = messagesResult.data;
    const persona = session.personas;
    const companyConfig = orgResult.data?.company_config as CompanyConfig | null;

    if (!messages || messages.length === 0) {
      throw new Error('No messages found for session');
    }

    console.log(`[evaluate] ${messages.length} messages, org: ${organization_id || 'none'}, methodology: ${companyConfig?.methodology || 'SPIN (default)'}`);

    // Organize criteria by competency
    const criteriaByCompetency = (criteriaResult.data || []).reduce((acc: any, c: any) => {
      if (!acc[c.competency_name]) acc[c.competency_name] = [];
      acc[c.competency_name].push(c);
      return acc;
    }, {});

    // Build conversation text
    const conversation = messages
      .map(m => `${m.role === 'user' ? 'Vendedor' : 'Cliente'}: ${m.content}`)
      .join('\n\n');

    // Build dynamic evaluation prompt
    const evaluationPrompt = buildEvaluationPrompt(companyConfig, persona, session, conversation, criteriaByCompetency);

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um avaliador de vendas B2B. Analise a conversa e retorne APENAS o JSON array com as competências avaliadas. Sem texto adicional.' },
          { role: 'user', content: evaluationPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Insufficient credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to generate evaluation');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;

    let evaluations;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      evaluations = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid evaluation format from AI');
    }

    // Save competency scores
    const competencyInserts = evaluations.map((comp: any) => ({
      session_id: sessionId,
      competency_name: comp.competency,
      score: Math.round(comp.score / 10), // 0-100 → 0-10
      feedback: comp.feedback,
      spin_category: comp.spin_category || SPIN_CATEGORY_MAP[comp.competency] || null,
      sub_scores: comp.sub_scores
        ? Object.fromEntries(Object.entries(comp.sub_scores).map(([k, v]) => [k, Math.round(Number(v) / 10)]))
        : null,
      sub_scores_feedback: comp.sub_scores_feedback || null,
      ai_suggestions: comp.ai_suggestions || null,
      criterion_approvals: comp.criterion_approvals || null,
    }));

    const { error: insertError } = await supabase.from('competency_scores').insert(competencyInserts);
    if (insertError) {
      console.error('Error inserting competency scores:', insertError);
      throw insertError;
    }

    // Overall score
    const overallScore = Math.round(evaluations.reduce((sum: number, c: any) => sum + c.score, 0) / evaluations.length);

    // Voice metrics
    const voiceMetrics = calculateVoiceMetrics(messages);

    // Generate insights and recommendations in parallel
    const [insights] = await Promise.all([
      generateInsights(evaluations, overallScore, LOVABLE_API_KEY),
      generateStructuredRecommendations(evaluations, overallScore, sessionId, LOVABLE_API_KEY, supabase),
    ]);

    // Update session
    const { error: updateError } = await supabase
      .from('roleplay_sessions')
      .update({
        overall_score: overallScore,
        voice_metrics: voiceMetrics,
        highlights: insights.highlights,
        recommendations: insights.recommendations,
        executive_summary: insights.executive_summary,
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    // Check achievements
    try {
      await supabase.rpc('check_and_unlock_achievements', { _user_id: session.user_id, _session_id: sessionId });
    } catch (e) {
      console.error('Achievement check failed:', e);
    }

    const { data: newAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', session.user_id)
      .gte('unlocked_at', new Date(Date.now() - 5000).toISOString());

    console.log(`[evaluate] Session ${sessionId} done. Score: ${overallScore}, Competencies: ${evaluations.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        overallScore,
        competencies: evaluations,
        newAchievements: newAchievements?.map(a => a.achievement_id) || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in evaluate-competencies:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
