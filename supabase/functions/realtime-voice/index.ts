import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, upgrade",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const personaId = url.searchParams.get("personaId");
  const sessionId = url.searchParams.get("sessionId");
  const meetingType = url.searchParams.get("meetingType");

  if (!personaId || !sessionId || !meetingType) {
    return new Response("Missing required parameters", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openAIKey = Deno.env.get("OPENAI_API_KEY")!;

  if (!openAIKey) {
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch persona
  const { data: persona, error: personaError } = await supabase
    .from("personas")
    .select("*")
    .eq("id", personaId)
    .single();

  if (personaError || !persona) {
    return new Response("Persona not found", { status: 404 });
  }

  // Build system prompt
  const difficultyDescriptions = {
    easy: "Seja receptivo e colaborativo. Aceite propostas facilmente e demonstre interesse genuíno.",
    medium: "Seja profissional mas cauteloso. Faça perguntas sobre detalhes e peça esclarecimentos antes de aceitar.",
    hard: "Seja cético e desafiador. Questione cada afirmação, peça dados concretos e ROI. Negocie preços agressivamente.",
  };

  const meetingInstructions = {
    discovery: "Este é um primeiro contato. Você está avaliando se há fit. Faça perguntas sobre a solução mas também questione se realmente precisa dela.",
    demo: "Você está assistindo uma demonstração. Faça perguntas técnicas, peça para ver funcionalidades específicas e compare com concorrentes que você conhece.",
    negotiation: "Você está negociando preços e condições. Seu orçamento é limitado e você precisa justificar o investimento para seu superior.",
    closing: "Você está pronto para fechar mas tem dúvidas finais sobre implementação, suporte e garantias. Negocie condições de pagamento.",
  };

  const personalityStr = persona.personality_traits
    ? JSON.stringify(persona.personality_traits)
    : "profissional equilibrado";

  const systemPrompt = `Você é ${persona.name}, ${persona.role} na empresa ${persona.company} do setor de ${persona.sector}.

${persona.description || ""}

TRAÇOS DE PERSONALIDADE: ${personalityStr}

NÍVEL DE DIFICULDADE (${persona.difficulty}): ${difficultyDescriptions[persona.difficulty as keyof typeof difficultyDescriptions]}

TIPO DE REUNIÃO (${meetingType}): ${meetingInstructions[meetingType as keyof typeof meetingInstructions]}

INSTRUÇÕES CRÍTICAS PARA CONVERSAÇÃO NATURAL:
- Responda SEMPRE em português brasileiro
- Mantenha respostas CURTAS: 1-2 frases no máximo
- Use linguagem EXTREMAMENTE natural, como telefone
- NÃO use pontos de exclamação excessivos
- Adicione pausas naturais com "então...", "veja bem...", "bom..."
- Demonstre hesitação natural: "hmm...", "deixa eu pensar..."
- NÃO repita informações já discutidas
- Responda de forma CONVERSACIONAL, não formal
- Use contrações: "tá", "né", "pra", "cê"
- Faça uma pergunta por resposta, no máximo

RITMO DE CONVERSA:
- Simule pensamento natural antes de respostas complexas
- Use interjeições: "ah", "hum", "entendi"
- Seja direto e objetivo

LEMBRE-SE: Esta é uma CONVERSA POR VOZ. Seja CONCISO e NATURAL como em um telefonema real.`;

  // Voice mapping by persona gender/personality
  const voiceMapping: Record<string, string> = {
    // Feminine voices
    "Marina E-commerce": "shimmer",        // Young and energetic
    "Juliana Marketing": "coral",          // Professional and confident
    "Fernanda RH": "alloy",                // Neutral and welcoming
    "Patricia CFO": "coral",               // Serious and analytical
    
    // Masculine voices
    "André Pequeno Negócio": "echo",       // Friendly and accessible
    "Dr. Roberto Advogado": "sage",        // Formal and authoritative
    "Gustavo TI": "ash",                   // Technical and direct
    "Ricardo Startup": "echo",             // Young and dynamic
    "Carlos Industrial": "sage",           // Mature and experienced
    "Paulo CFO": "ash",                    // Analytical and direct
  };

  // Select voice with fallback to alloy
  const selectedVoice = voiceMapping[persona.name] || "alloy";
  console.log(`[${sessionId}] Persona: ${persona.name}, Selected Voice: ${selectedVoice}`);

  // Get ephemeral token from OpenAI
  console.log("Requesting ephemeral token from OpenAI...");
  let ephemeralKey: string;
  
  try {
    const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: selectedVoice,
        instructions: systemPrompt,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,              // Menos sensível para evitar cortes
          prefix_padding_ms: 500,      // Mais padding para capturar início
          silence_duration_ms: 1200    // Mais tempo antes de detectar fim
        },
        temperature: 0.9,               // Mais criativo
        max_response_output_tokens: 150 // Limitar para respostas curtas
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to get ephemeral token:", errorText);
      return new Response(`Failed to initialize OpenAI session: ${errorText}`, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    ephemeralKey = tokenData.client_secret.value;
    console.log("Ephemeral token obtained successfully");
  } catch (error) {
    console.error("Error getting ephemeral token:", error);
    return new Response("Failed to initialize OpenAI session", { status: 500 });
  }

  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  console.log(`[${sessionId}] Client WebSocket connection established`);
  
  let openAISocket: WebSocket | null = null;
  let isCleaningUp = false;

  const cleanup = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    console.log(`[${sessionId}] Cleaning up resources`);
    
    // Send cancel command to OpenAI to stop any ongoing response
    if (openAISocket?.readyState === WebSocket.OPEN) {
      try {
        console.log("Sending response.cancel to OpenAI");
        openAISocket.send(JSON.stringify({
          type: 'response.cancel'
        }));
      } catch (error) {
        console.error("Error sending cancel command:", error);
      }
      openAISocket.close();
    }
  };

  clientSocket.onopen = () => {
    console.log(`[${sessionId}] Client WebSocket opened`);
    
    // Connect to OpenAI using ephemeral token
    const openAIUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
    
    try {
      openAISocket = new WebSocket(openAIUrl, [
        `realtime`,
        `openai-insecure-api-key.${ephemeralKey}`,
        `openai-beta.realtime-v1`
      ]);
      
      console.log("Connecting to OpenAI with ephemeral token...");
    } catch (error) {
      console.error("Failed to create OpenAI WebSocket:", error);
      clientSocket.send(JSON.stringify({
        type: "error",
        error: { message: "Connection failed" }
      }));
      clientSocket.close();
      return;
    }

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
      
      // Notify client that connection is ready
      clientSocket.send(JSON.stringify({
        type: "session.created"
      }));
    };

    openAISocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("OpenAI event:", data.type);

        // Forward to client
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(event.data);
        }

        // Save transcriptions
        if (data.type === "conversation.item.input_audio_transcription.completed") {
          // Check if session is still active before saving
          const { data: sessionCheck } = await supabase
            .from('roleplay_sessions')
            .select('status')
            .eq('id', sessionId)
            .single();
          
          if (sessionCheck?.status === 'active') {
            await supabase.from("session_messages").insert({
              session_id: sessionId,
              role: "user",
              content: data.transcript,
            });
          } else {
            console.log(`Session ${sessionId} is no longer active, skipping user message save`);
          }
        }

        if (data.type === "response.audio_transcript.done") {
          // Check if session is still active before saving
          const { data: sessionCheck } = await supabase
            .from('roleplay_sessions')
            .select('status')
            .eq('id', sessionId)
            .single();
          
          if (sessionCheck?.status === 'active') {
            await supabase.from("session_messages").insert({
              session_id: sessionId,
              role: "assistant",
              content: data.transcript,
            });
          } else {
            console.log(`Session ${sessionId} is no longer active, skipping assistant message save`);
          }
        }
      } catch (error) {
        console.error("Error processing OpenAI message:", error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error(`[${sessionId}] OpenAI WebSocket error:`, error);
      clientSocket.send(JSON.stringify({ type: "error", error: "OpenAI connection error" }));
      cleanup();
    };

    openAISocket.onclose = () => {
      console.log(`[${sessionId}] OpenAI disconnected`);
      cleanup();
    };
  };

  clientSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`[${sessionId}] Received from client:`, data.type);
      
      // Handle session end request from client
      if (data.type === 'session.end') {
        console.log('Client requested session end');
        cleanup();
        return;
      }
      
      // Validate message type before forwarding to OpenAI
      const validTypes = [
        'session.update',
        'input_audio_buffer.append',
        'input_audio_buffer.commit',
        'input_audio_buffer.clear',
        'conversation.item.create',
        'conversation.item.truncate',
        'conversation.item.delete',
        'conversation.item.retrieve',
        'response.create',
        'response.cancel'
      ];
      
      if (!validTypes.includes(data.type)) {
        console.log(`[${sessionId}] Ignoring unsupported message type: ${data.type}`);
        return;
      }
      
      // Forward to OpenAI if connected
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error(`[${sessionId}] Error processing client message:`, error);
    }
  };

  clientSocket.onclose = () => {
    console.log(`[${sessionId}] Client disconnected`);
    cleanup();
  };

  clientSocket.onerror = (error) => {
    console.error(`[${sessionId}] Client WebSocket error:`, error);
    cleanup();
  };

  return response;
});
