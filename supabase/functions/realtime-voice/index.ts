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

INSTRUÇÕES IMPORTANTES:
- Responda SEMPRE em português brasileiro
- Mantenha respostas naturais e conversacionais (2-4 frases)
- Use o contexto da sua empresa e setor nas respostas
- Seja consistente com seu nível de dificuldade
- NÃO repita informações já discutidas
- Faça objeções realistas baseadas no seu perfil
- Use linguagem natural, como em uma conversa real por telefone
- Evite respostas muito longas - seja direto
- Demonstre emoções adequadas (ceticismo, entusiasmo, preocupação)

LEMBRE-SE: Você está em uma CONVERSA POR VOZ. Fale naturalmente como falaria ao telefone.`;

  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  clientSocket.onopen = () => {
    console.log("Client WebSocket connected");
    console.log("OpenAI Key configured:", !!openAIKey);
    
    // Connect to OpenAI Realtime API
    // Note: Deno WebSocket may not support headers in all versions
    // We'll try the standard approach and handle errors
    const openAIUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
    
    try {
      // Attempt to create WebSocket with Authorization header
      // This syntax is supported in newer Deno versions
      openAISocket = new WebSocket(openAIUrl, {
        headers: {
          "Authorization": `Bearer ${openAIKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      } as any);
      
      console.log("OpenAI WebSocket created");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Failed to create OpenAI WebSocket:", error);
      clientSocket.send(JSON.stringify({
        type: "error",
        error: { message: `Connection failed: ${errorMessage}` }
      }));
      clientSocket.close();
      return;
    }

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
    };

    openAISocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("OpenAI event:", data.type);

        // Configure session after connection
        if (data.type === "session.created" && !sessionConfigured) {
          sessionConfigured = true;
          const sessionConfig = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: systemPrompt,
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000,
              },
              temperature: 0.8,
              max_response_output_tokens: 4096,
            },
          };
          openAISocket!.send(JSON.stringify(sessionConfig));
          console.log("Session configured");
        }

        // Save transcriptions
        if (data.type === "conversation.item.created" && data.item?.role === "assistant") {
          const content = data.item.content?.[0];
          if (content?.transcript) {
            await supabase.from("session_messages").insert({
              session_id: sessionId,
              role: "assistant",
              content: content.transcript,
            });
          }
        }

        if (data.type === "conversation.item.input_audio_transcription.completed") {
          await supabase.from("session_messages").insert({
            session_id: sessionId,
            role: "user",
            content: data.transcript,
          });
        }

        // Forward to client
        clientSocket.send(event.data);
      } catch (error) {
        console.error("Error processing OpenAI message:", error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      clientSocket.send(JSON.stringify({ type: "error", error: "OpenAI connection error" }));
    };

    openAISocket.onclose = () => {
      console.log("OpenAI WebSocket closed");
      clientSocket.close();
    };
  };

  clientSocket.onmessage = (event) => {
    if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
      openAISocket.send(event.data);
    }
  };

  clientSocket.onclose = () => {
    console.log("Client WebSocket closed");
    if (openAISocket) {
      openAISocket.close();
    }
  };

  clientSocket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});
