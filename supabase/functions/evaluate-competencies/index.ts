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

    // Formatar conversa
    const conversation = messages
      .map(m => `${m.role === 'user' ? 'Vendedor' : 'Cliente'}: ${m.content}`)
      .join('\n\n');

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

Retorne um JSON array EXATAMENTE neste formato:
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
    "feedback": "Excelente abertura! Estabeleceu rapport forte e mencionou case de automação similar. Sugestão: definir agenda mais cedo ('Temos 30 minutos, vamos focar em X, ok?').",
    "ai_suggestions": [
      "Use técnica do espelho: repita últimas palavras do cliente",
      "Mencione case específico do setor dele logo na abertura",
      "Pergunte: 'O que seria um resultado ideal para você hoje?'"
    ],
    "spin_category": "opening"
  }
]

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
          { role: 'system', content: systemPrompt }
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

    // Salvar competências no banco
    const competencyInserts = evaluations.map((comp: any) => ({
      session_id: sessionId,
      competency_name: comp.competency,
      score: comp.score,
      feedback: comp.feedback,
      spin_category: comp.spin_category || null,
      sub_scores: comp.sub_scores || null,
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

    // Atualizar sessão com overall_score
    const { error: updateError } = await supabase
      .from('roleplay_sessions')
      .update({ overall_score: overallScore })
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