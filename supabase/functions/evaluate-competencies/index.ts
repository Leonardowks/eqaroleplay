import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session and messages
    const { data: session, error: sessionError } = await supabase
      .from('roleplay_sessions')
      .select('*, personas(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    const { data: messages } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      throw new Error('No messages found');
    }

    // Format conversation
    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'Vendedor' : 'Cliente'}: ${m.content}`)
      .join('\n');

    // Call Lovable AI for evaluation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um avaliador de vendas. Analise a conversa e avalie as seguintes competências em uma escala de 0 a 100:
1. Comunicação - Clareza e efetividade da comunicação
2. Escuta Ativa - Capacidade de ouvir e entender o cliente
3. Persuasão - Habilidade de convencer e influenciar
4. Tratamento de Objeções - Gestão de resistências
5. Fechamento - Capacidade de concluir a venda

Retorne APENAS um JSON array com este formato exato:
[
  {"competency": "Comunicação", "score": 85, "feedback": "Ótima clareza..."},
  {"competency": "Escuta Ativa", "score": 70, "feedback": "Bom, mas..."},
  ...
]`,
          },
          {
            role: 'user',
            content: `Tipo de reunião: ${session.meeting_type}\nConversa:\n${conversation}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'evaluate_competencies',
              description: 'Return competency evaluations',
              parameters: {
                type: 'object',
                properties: {
                  evaluations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        competency: { type: 'string' },
                        score: { type: 'number' },
                        feedback: { type: 'string' },
                      },
                      required: ['competency', 'score', 'feedback'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['evaluations'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'evaluate_competencies' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('AI evaluation failed');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const evaluations = JSON.parse(toolCall.function.arguments).evaluations;

    // Save competencies - Convert scores from 0-100 to 0-10 scale
    const competenciesToInsert = evaluations.map((ev: any) => ({
      session_id: sessionId,
      competency_name: ev.competency,
      score: ev.score / 10, // Convert from 0-100 to 0-10
      feedback: ev.feedback,
    }));

    const { error: insertError } = await supabase
      .from('competency_scores')
      .insert(competenciesToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Calculate overall score (convert from 0-100 to 0-10)
    const overallScore = evaluations.reduce((sum: number, ev: any) => sum + ev.score, 0) / evaluations.length / 10;

    // Update session
    await supabase
      .from('roleplay_sessions')
      .update({ overall_score: overallScore })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({ success: true, score: overallScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
