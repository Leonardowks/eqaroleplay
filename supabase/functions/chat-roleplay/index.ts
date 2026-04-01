import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

function buildSystemPrompt(config: CompanyConfig | null, persona: any, stage: string, method: string): string {
  if (!config) {
    return buildLegacyPrompt(persona, stage, method);
  }

  const objections = persona.objection_patterns
    ? (Array.isArray(persona.objection_patterns) ? persona.objection_patterns.join(', ') : JSON.stringify(persona.objection_patterns))
    : 'objeções realistas do setor';

  const buyingSignals = persona.buying_signals
    ? (Array.isArray(persona.buying_signals) ? persona.buying_signals.join(', ') : JSON.stringify(persona.buying_signals))
    : 'interesse em ROI e resultados';

  const competencies = config.competencies?.join(', ') || 'comunicação, negociação, fechamento';

  return `You are ${persona.name}, ${persona.role} at ${persona.company} in the ${persona.sector} sector.

CONTEXT:
- The salesperson is selling: ${config.product_description}
- Company segment: ${config.segment}
- Typical ticket: ${config.ticket_range}
- Sales cycle: ${config.sales_cycle}

YOUR PROFILE:
- ${persona.description || 'Professional buyer in your sector'}
- Sophistication level: ${config.icp?.sophistication_level || 'intermediario'}
- Resistance level: ${persona.resistance_level || (persona.difficulty === 'easy' ? 3 : persona.difficulty === 'hard' ? 8 : 5)}/10
- Your typical objections: ${objections}
- You show interest when: ${buyingSignals}

CURRENT SALES STAGE BEING PRACTICED: ${stage}

SALES METHODOLOGY IN USE: ${config.methodology}
${config.methodology !== 'Nenhuma' ? `The salesperson should follow ${config.methodology} principles.` : 'No formal methodology — evaluate natural flow and good practices.'}

BEHAVIOR RULES:
- Respond naturally as this persona would in real life
- In Portuguese (Brazil)
- Show your objections at appropriate moments (do not give in too easily)
- If the salesperson demonstrates competency in: ${competencies}, acknowledge it subtly
- Difficulty: ${persona.difficulty} — adjust how cooperative you are accordingly
- Tone: ${config.tone || 'profissional e consultivo'}
- ${method === 'text' ? 'Keep responses concise (2-4 sentences most of the time).' : 'Speak naturally as in a voice conversation.'}

You are in a simulated sales call. Respond only as the persona, never break character. Never mention this is a simulation or roleplay.`;
}

function buildLegacyPrompt(persona: any, meetingType: string, method: string): string {
  const difficultyInstructions: Record<string, string> = {
    easy: 'Você é receptivo e entusiasmado. Faz perguntas simples e diretas. É fácil de convencer se o vendedor mostrar benefícios claros.',
    medium: 'Você é cauteloso mas interessado. Faz perguntas mais profundas sobre ROI e implementação. Precisa de evidências concretas.',
    hard: 'Você é muito crítico e cético. Questiona profundamente cada afirmação. Foca em riscos, custos e detalhes técnicos. É difícil de impressionar.',
  };

  const meetingTypeContext: Record<string, string> = {
    prospection: 'Esta é uma primeira reunião de prospecção. O vendedor está te contatando pela primeira vez.',
    discovery: 'Esta é uma reunião de descoberta. O vendedor quer entender profundamente seus processos e dores.',
    presentation: 'Esta é uma reunião de apresentação de solução.',
    negotiation: 'Esta é uma reunião de negociação comercial.',
  };

  const personalityPrompt = persona.personality_traits
    ? `\n\nCaracterísticas de personalidade: ${JSON.stringify(persona.personality_traits)}`
    : '';

  return `Você é ${persona.name}, ${persona.role} na ${persona.company} (setor: ${persona.sector}).

DESCRIÇÃO: ${persona.description || ''}

NÍVEL DE DIFICULDADE (${persona.difficulty}): ${difficultyInstructions[persona.difficulty] || difficultyInstructions.medium}

CONTEXTO DA REUNIÃO: ${meetingTypeContext[meetingType] || meetingTypeContext.discovery}
${personalityPrompt}

INSTRUÇÕES CRÍTICAS:
1. Permaneça SEMPRE no personagem. Você NÃO é uma IA, você é ${persona.name}.
2. Responda de forma natural e humana, como em uma conversa real de negócios.
3. Seja autêntico ao seu cargo e setor.
4. ${method === 'text' ? 'Suas respostas devem ser concisas (2-4 frases).' : 'Fale de forma natural como em uma conversa por voz.'}
5. NÃO mencione que é um roleplay ou simulação.
6. Seja realista com objeções e dúvidas.
7. Baseie suas respostas no contexto da conversa anterior.

Responda sempre em português do Brasil (pt-BR).`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, personaId, sessionId, organization_id, is_preview, preview_history, meeting_type } = await req.json();
    console.log('Received request:', { message, personaId, sessionId, organization_id, is_preview });

    if (!message || !personaId) {
      throw new Error('Missing required fields: message, personaId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Preview mode: skip session validation and message persistence
    if (is_preview) {
      const [personaResult, orgResult] = await Promise.all([
        supabase.from('personas').select('*').eq('id', personaId).single(),
        organization_id
          ? supabase.from('organizations').select('company_config').eq('id', organization_id).single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (personaResult.error || !personaResult.data) throw new Error('Persona not found');

      const persona = personaResult.data;
      const companyConfig = orgResult.data?.company_config as CompanyConfig | null;
      const stage = meeting_type || 'Prospecção';
      const systemPrompt = buildSystemPrompt(companyConfig, persona, stage, 'text');

      const conversationHistory = (preview_history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured.');

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
            { role: 'user', content: message },
          ],
          temperature: 0.8,
          max_tokens: 500,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        throw new Error('AI service error');
      }

      const aiData = await aiResponse.json();
      const personaResponse = aiData.choices[0].message.content;

      return new Response(
        JSON.stringify({ response: personaResponse, personaName: persona.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normal mode: require sessionId
    if (!sessionId) {
      throw new Error('Missing required field: sessionId');
    }

    // Fetch persona, session, and optionally org config in parallel
    const [personaResult, sessionResult, orgResult] = await Promise.all([
      supabase.from('personas').select('*').eq('id', personaId).single(),
      supabase.from('roleplay_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single(),
      organization_id
        ? supabase.from('organizations').select('company_config').eq('id', organization_id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (personaResult.error || !personaResult.data) throw new Error('Persona not found');
    if (sessionResult.error || !sessionResult.data) throw new Error('Session not found or unauthorized');

    const persona = personaResult.data;
    const session = sessionResult.data;
    const companyConfig = orgResult.data?.company_config as CompanyConfig | null;

    if (session.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Sessão já foi finalizada', code: 'SESSION_ENDED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch previous messages
    const { data: previousMessages } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory = previousMessages?.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    })) || [];

    // Build dynamic system prompt
    const systemPrompt = buildSystemPrompt(companyConfig, persona, session.meeting_type, session.method);
    console.log('System prompt built with:', companyConfig ? 'company_config' : 'legacy fallback');

    // Save user message
    await supabase.from('session_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
    });

    // Get OpenAI key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured.');
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
          { role: 'user', content: message },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) throw new Error('Rate limit exceeded. Please try again.');
      if (aiResponse.status === 402) throw new Error('AI credits exhausted.');
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const personaResponse = aiData.choices[0].message.content;

    // Save persona response
    await supabase.from('session_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: personaResponse,
    });

    return new Response(
      JSON.stringify({ response: personaResponse, personaName: persona.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-roleplay function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
