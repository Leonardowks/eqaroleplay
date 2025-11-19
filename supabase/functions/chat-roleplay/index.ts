import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, personaId, sessionId } = await req.json();
    console.log('Received request:', { message, personaId, sessionId });

    if (!message || !personaId || !sessionId) {
      throw new Error('Missing required fields: message, personaId, or sessionId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch persona details
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      throw new Error('Persona not found');
    }

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('roleplay_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found or unauthorized');
    }

    // Check if session is still active
    if (session.status !== 'active') {
      return new Response(
        JSON.stringify({ 
          error: 'Sessão já foi finalizada',
          code: 'SESSION_ENDED' 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch previous messages for context
    const { data: previousMessages } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Build conversation context
    const conversationHistory = previousMessages?.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    // Use custom prompt if available, otherwise build default
    const systemPrompt = persona.custom_prompt
      ? persona.custom_prompt
      : buildSystemPrompt(persona, session.meeting_type, session.method);
    console.log('System prompt:', persona.custom_prompt ? 'Using custom prompt' : 'Using default prompt');

    // Save user message to database
    const { error: saveUserError } = await supabase
      .from('session_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message
      });

    if (saveUserError) {
      console.error('Error saving user message:', saveUserError);
    }

    // Get OpenAI API key from database or environment
    let OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      const { data: apiConfig, error: apiConfigError } = await supabase
        .from('api_configurations')
        .select('api_key')
        .eq('provider', 'openai')
        .eq('is_active', true)
        .single();

      if (apiConfigError || !apiConfig?.api_key) {
        console.error('Error fetching OpenAI API key:', apiConfigError);
        throw new Error('OPENAI_API_KEY not configured. Please add it in Admin Settings or as environment variable.');
      }

      OPENAI_API_KEY = apiConfig.api_key;
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const personaResponse = aiData.choices[0].message.content;
    console.log('AI response:', personaResponse);

    // Save persona response to database
    const { error: savePersonaError } = await supabase
      .from('session_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: personaResponse
      });

    if (savePersonaError) {
      console.error('Error saving persona message:', savePersonaError);
    }

    return new Response(
      JSON.stringify({ 
        response: personaResponse,
        personaName: persona.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in chat-roleplay function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function buildSystemPrompt(persona: any, meetingType: string, method: string): string {
  const difficultyInstructions = {
    easy: 'Você é receptivo e entusiasmado. Faz perguntas simples e diretas. É fácil de convencer se o vendedor mostrar benefícios claros.',
    medium: 'Você é cauteloso mas interessado. Faz perguntas mais profundas sobre ROI e implementação. Precisa de evidências concretas.',
    hard: 'Você é muito crítico e cético. Questiona profundamente cada afirmação. Foca em riscos, custos e detalhes técnicos. É difícil de impressionar.'
  };

  const meetingTypeContext = {
    prospection: 'Esta é uma primeira reunião de prospecção. O vendedor está te contatando pela primeira vez para entender se há fit. Você pode estar ocupado ou meio desinteressado inicialmente.',
    discovery: 'Esta é uma reunião de descoberta. O vendedor já passou pela prospecção e agora quer entender profundamente seus processos, dores e necessidades. Compartilhe detalhes sobre seus desafios.',
    presentation: 'Esta é uma reunião de apresentação de solução. O vendedor vai te mostrar como a automação com IA pode resolver seus problemas. Faça perguntas específicas sobre a solução.',
    negotiation: 'Esta é uma reunião de negociação comercial. O vendedor vai apresentar proposta e valores. Você deve negociar, questionar preços, prazos e condições.'
  };

  const personalityPrompt = persona.personality_traits ? 
    `\n\nCaracterísticas de personalidade: ${JSON.stringify(persona.personality_traits, null, 2)}` : '';

  return `Você é ${persona.name}, ${persona.role} na ${persona.company} (setor: ${persona.sector}).

DESCRIÇÃO: ${persona.description}

NÍVEL DE DIFICULDADE (${persona.difficulty}): ${difficultyInstructions[persona.difficulty as keyof typeof difficultyInstructions]}

CONTEXTO DA REUNIÃO: ${meetingTypeContext[meetingType as keyof typeof meetingTypeContext]}
${personalityPrompt}

INSTRUÇÕES CRÍTICAS:
1. Permaneça SEMPRE no personagem. Você NÃO é uma IA, você é ${persona.name}.
2. Responda de forma natural e humana, como em uma conversa real de negócios.
3. Seja autêntico ao seu cargo e setor - use linguagem e preocupações apropriadas.
4. ${method === 'text' ? 'Suas respostas devem ser concisas (2-4 frases na maioria das vezes).' : 'Fale de forma natural como em uma conversa por voz.'}
5. NÃO mencione que é um roleplay ou simulação.
6. Seja realista com objeções e dúvidas baseadas no seu perfil.
7. Baseie suas respostas no contexto da conversa anterior.

COMPORTAMENTO POR TIPO DE REUNIÃO:
- Prospecção: Seja breve, mostre que está ocupado, mas educado
- Descoberta: Compartilhe desafios reais do seu setor, seja detalhista
- Apresentação: Questione a solução, peça exemplos concretos
- Negociação: Foque em números, prazos, garantias e condições

Responda sempre em português do Brasil (pt-BR).`;
}
