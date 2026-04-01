import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SPINScores {
  situation: number;
  problem: number;
  implication: number;
  needPayoff: number;
}

interface Suggestion {
  type: 'tip' | 'warning' | 'success';
  message: string;
  competency?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId } = await req.json();
    console.log('Received request with', messages?.length || 0, 'messages');

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          scores: { situation: 0, problem: 0, implication: 0, needPayoff: 0 },
          suggestions: [],
          overallScore: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError) {
      console.error('Auth error:', userError.message);
      throw new Error('Unauthorized: ' + userError.message);
    }

    if (!user) {
      console.error('No user found for token');
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Get OpenAI API key from database
    console.log('Fetching OpenAI API key...');
    const { data: apiConfig, error: apiConfigError } = await supabase
      .from('api_configurations')
      .select('api_key')
      .eq('provider', 'openai')
      .eq('is_active', true)
      .single();

    if (apiConfigError) {
      console.error('Error fetching API key:', apiConfigError.message, apiConfigError.code);
      throw new Error('OpenAI API key not configured: ' + apiConfigError.message);
    }

    if (!apiConfig?.api_key) {
      console.error('No active OpenAI API key found');
      throw new Error('OpenAI API key not configured');
    }

    console.log('OpenAI API key found, length:', apiConfig.api_key.length);

    // Format messages for analysis
    const userMessages = messages
      .filter((m: Message) => m.role === 'user')
      .map((m: Message) => m.content)
      .join('\n---\n');

    const analysisPrompt = `Você é um especialista em análise de técnicas de vendas SPIN Selling.

Analise as seguintes mensagens do VENDEDOR em uma conversa de roleplay de vendas e avalie o uso das técnicas SPIN:

MENSAGENS DO VENDEDOR:
${userMessages}

INSTRUÇÕES:
1. Avalie cada competência SPIN de 0 a 100:
   - Situação (S): Perguntas sobre contexto atual, processos, ferramentas usadas
   - Problema (P): Perguntas sobre dificuldades, dores, insatisfações
   - Implicação (I): Perguntas sobre consequências dos problemas, impactos negativos
   - Necessidade-Payoff (N): Perguntas sobre benefícios desejados, valor da solução

2. Gere 1-2 sugestões contextuais para melhorar a performance

3. Calcule um score geral (média ponderada: S=15%, P=25%, I=35%, N=25%)

Responda APENAS em JSON válido no formato:
{
  "scores": {
    "situation": <0-100>,
    "problem": <0-100>,
    "implication": <0-100>,
    "needPayoff": <0-100>
  },
  "suggestions": [
    {
      "type": "tip|warning|success",
      "message": "sugestão contextual em português",
      "competency": "situation|problem|implication|needPayoff"
    }
  ],
  "overallScore": <0-100>
}`;

    // Call OpenAI API
    console.log('Calling OpenAI API for analysis...');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiConfig.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    console.log('AI API response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI service error: ' + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    // Parse JSON from response
    let analysisResult;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, responseText);
      // Return default values if parsing fails
      analysisResult = {
        scores: { situation: 30, problem: 30, implication: 20, needPayoff: 20 },
        suggestions: [{
          type: 'tip',
          message: 'Continue fazendo perguntas abertas para entender melhor o cliente',
          competency: 'situation'
        }],
        overallScore: 25
      };
    }

    // Validate and ensure proper structure
    const scores: SPINScores = {
      situation: Math.min(100, Math.max(0, analysisResult.scores?.situation || 0)),
      problem: Math.min(100, Math.max(0, analysisResult.scores?.problem || 0)),
      implication: Math.min(100, Math.max(0, analysisResult.scores?.implication || 0)),
      needPayoff: Math.min(100, Math.max(0, analysisResult.scores?.needPayoff || 0)),
    };

    const suggestions: Suggestion[] = (analysisResult.suggestions || []).slice(0, 3);
    const overallScore = Math.min(100, Math.max(0, analysisResult.overallScore || 0));

    console.log('Analysis complete:', { scores, overallScore, suggestionsCount: suggestions.length });

    return new Response(
      JSON.stringify({ scores, suggestions, overallScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-spin function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
