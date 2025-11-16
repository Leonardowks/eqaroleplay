import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { userId } = await req.json();
    const targetUserId = userId || user.id;

    // Fetch user sessions and competency scores
    const { data: sessions } = await supabase
      .from('roleplay_sessions')
      .select('id, meeting_type, overall_score, duration_seconds, completed_at')
      .eq('user_id', targetUserId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    const { data: scores } = await supabase
      .from('competency_scores')
      .select('competency_name, score, spin_category, feedback, session_id')
      .in('session_id', sessions?.map(s => s.id) || []);

    // Prepare analysis context
    const totalSessions = sessions?.length || 0;
    const avgScore = totalSessions > 0 
      ? (sessions?.reduce((acc, s) => acc + (s.overall_score || 0), 0) || 0) / totalSessions
      : 0;
    
    const analysisContext = {
      totalSessions,
      avgScore,
      scoresByCategory: scores?.reduce((acc: any, s) => {
        if (!s.spin_category) return acc;
        if (!acc[s.spin_category]) acc[s.spin_category] = [];
        acc[s.spin_category].push(s.score);
        return acc;
      }, {}),
      competencyScores: scores?.reduce((acc: any, s) => {
        if (!acc[s.competency_name]) acc[s.competency_name] = [];
        acc[s.competency_name].push(s.score);
        return acc;
      }, {}),
      meetingTypes: sessions?.reduce((acc: any, s) => {
        acc[s.meeting_type] = (acc[s.meeting_type] || 0) + 1;
        return acc;
      }, {}),
    };

    const systemPrompt = `Você é um especialista em análise de desempenho de vendas usando a metodologia SPIN Selling e automação de IA.

Analise os dados fornecidos e gere insights profundos e acionáveis sobre o desempenho do vendedor.

Dados do vendedor:
- Total de sessões: ${analysisContext.totalSessions}
- Pontuação média geral: ${analysisContext.avgScore.toFixed(1)}/10
- Distribuição por categoria SPIN: ${JSON.stringify(analysisContext.scoresByCategory)}
- Desempenho por competência: ${JSON.stringify(analysisContext.competencyScores)}
- Tipos de reunião: ${JSON.stringify(analysisContext.meetingTypes)}

Gere uma análise em formato JSON com a seguinte estrutura:
{
  "summary": "Resumo executivo em 2-3 frases",
  "strengths": ["força 1", "força 2", "força 3"],
  "weaknesses": ["ponto fraco 1", "ponto fraco 2"],
  "spinAnalysis": {
    "situation": "análise específica",
    "problem": "análise específica",
    "implication": "análise específica",
    "needPayoff": "análise específica"
  },
  "recommendations": [
    {
      "title": "Título da recomendação",
      "description": "Descrição detalhada",
      "priority": "high|medium|low",
      "impact": "Impacto esperado"
    }
  ],
  "nextSteps": ["ação concreta 1", "ação concreta 2", "ação concreta 3"]
}

Seja específico, use números dos dados fornecidos, e foque em insights acionáveis sobre automação de IA em vendas.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Gere a análise detalhada.' }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    let analysis;
    try {
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/```\n([\s\S]*?)\n```/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[1] : analysisText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', analysisText);
      throw new Error('Failed to parse AI analysis');
    }

    // Save insights to database
    await supabase
      .from('user_insights')
      .insert({
        user_id: targetUserId,
        analysis: analysis,
      });

    return new Response(
      JSON.stringify({ analysis, sessionsData: sessions, scoresData: scores }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
