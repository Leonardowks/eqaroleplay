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

  console.log(`[${sessionId}] 🚀 Step 1: Fetching persona...`);
  
  // Fetch persona
  const { data: persona, error: personaError } = await supabase
    .from("personas")
    .select("*")
    .eq("id", personaId)
    .single();

  if (personaError || !persona) {
    console.error(`[${sessionId}] ❌ Error fetching persona:`, personaError);
    return new Response("Persona not found", { status: 404 });
  }

  console.log(`[${sessionId}] ✅ Step 1: Persona found - ${persona.name}`);

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

Se o vendedor demonstrar valor real, mostre interesse gradual.
Se a abordagem for fraca ou genérica, seja mais resistente.

Mantenha o papel consistente durante toda a conversa.`;

  // Voice mapping by persona gender/personality
  const voiceMapping: Record<string, string> = {
    // Feminine voices
    "Marina E-commerce": "shimmer",
    "Juliana Marketing": "coral",
    "Fernanda RH": "alloy",
    "Patricia CFO": "coral",
    
    // Masculine voices
    "André Pequeno Negócio": "echo",
    "Dr. Roberto Advogado": "sage",
    "Gustavo TI": "ash",
    "Ricardo Startup": "echo",
    "Carlos Industrial": "sage",
    "Paulo CFO": "ash",
  };

  const selectedVoice = voiceMapping[persona.name] || "alloy";
  console.log(`[${sessionId}] ✅ Step 2: Voice selected - ${selectedVoice}`);

  // Get ephemeral token from OpenAI FIRST before any WebSocket upgrade
  console.log(`[${sessionId}] 🔑 Step 3: Requesting ephemeral token from OpenAI...`);
  
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
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[${sessionId}] ❌ Failed to get ephemeral token:`, errorText);
      return new Response(`Failed to initialize OpenAI session: ${errorText}`, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    ephemeralKey = tokenData.client_secret.value;
    console.log(`[${sessionId}] ✅ Step 3: Ephemeral token obtained`);
  } catch (error) {
    console.error(`[${sessionId}] ❌ Error getting ephemeral token:`, error);
    return new Response("Failed to initialize OpenAI session", { status: 500 });
  }

  // Connect to OpenAI BEFORE upgrading client WebSocket
  // Using native Deno WebSocket with ephemeral token (no custom headers needed)
  console.log(`[${sessionId}] 🔌 Step 4: Connecting to OpenAI WebSocket...`);
  
  const openAISocket = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
    ["realtime", `openai-insecure-api-key.${ephemeralKey}`]
  );

  // Message queue to buffer client messages until OpenAI is ready
  const messageQueue: string[] = [];
  let isOpenAIReady = false;
  let sessionConfigured = false;
  let clientSocket: WebSocket;

  // Connection timeout - fail if OpenAI doesn't connect in 10 seconds
  const connectionTimeout = setTimeout(() => {
    if (!isOpenAIReady) {
      console.error(`[${sessionId}] ❌ OpenAI connection timeout after 10 seconds!`);
      openAISocket.close();
      if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          type: "error",
          error: "Failed to connect to AI service - timeout"
        }));
        clientSocket.close();
      }
    }
  }, 10000);

  // OpenAI socket handlers
  openAISocket.onopen = () => {
    console.log(`[${sessionId}] ✅ Step 4: OpenAI WebSocket connected - READY TO RECEIVE AUDIO`);
    clearTimeout(connectionTimeout);
    isOpenAIReady = true;

    // Process any queued messages from client
    if (messageQueue.length > 0) {
      console.log(`[${sessionId}] 📦 Processing ${messageQueue.length} queued messages...`);
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg && openAISocket.readyState === WebSocket.OPEN) {
          openAISocket.send(msg);
        }
      }
      console.log(`[${sessionId}] ✅ Queue processed successfully`);
    }
  };

  openAISocket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      // Log critical events only
      if (data.type === "session.created") {
        console.log(`[${sessionId}] 🎯 Session created, configuring...`);
        
        // Send session configuration AFTER receiving session.created
        if (!sessionConfigured) {
          openAISocket.send(
            JSON.stringify({
              type: "session.update",
              session: {
                instructions: systemPrompt,
                voice: selectedVoice,
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "whisper-1",
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 600,
                  silence_duration_ms: 1500,
                  create_response: true,
                },
                temperature: 0.9,
                max_response_output_tokens: 150,
              },
            })
          );
          sessionConfigured = true;
          console.log(`[${sessionId}] ✅ Session configured with VAD and instructions`);
        }
      } else if (data.type === "session.updated") {
        console.log(`[${sessionId}] ✅ Session update confirmed`);
      } else if (data.type === "response.audio.delta") {
        console.log(`[${sessionId}] 🔊 Audio chunk: ${data.delta?.length || 0} bytes`);
      } else if (data.type === "response.audio.done") {
        console.log(`[${sessionId}] ✅ Audio response completed`);
      } else if (data.type === "response.audio_transcript.delta") {
        console.log(`[${sessionId}] 📝 Transcript delta: "${data.delta}"`);
      } else if (data.type === "conversation.item.input_audio_transcription.completed") {
        console.log(`[${sessionId}] 🎤 User said: "${data.transcript}"`);
        
        // Save user message to database
        await supabase.from("session_messages").insert({
          session_id: sessionId,
          role: "user",
          content: data.transcript,
        });
      } else if (data.type === "response.audio_transcript.done") {
        console.log(`[${sessionId}] 📝 Full AI transcript: "${data.transcript}"`);
        
        // Save assistant message to database
        if (data.transcript) {
          await supabase.from("session_messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: data.transcript,
          });
        }
      } else if (data.type === "error") {
        console.error(`[${sessionId}] ❌ OpenAI error:`, JSON.stringify(data.error));
      } else if (data.type === "response.created") {
        console.log(`[${sessionId}] 🤖 AI response started`);
      } else if (data.type === "response.done") {
        console.log(`[${sessionId}] ✅ AI response finished`);
      }

      // Forward to client
      if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data);
      }
    } catch (error) {
      console.error(`[${sessionId}] ❌ Error handling OpenAI message:`, error);
    }
  };

  openAISocket.onerror = (error) => {
    console.error(`[${sessionId}] ❌ OpenAI WebSocket error:`, error);
    clearTimeout(connectionTimeout);
  };

  openAISocket.onclose = () => {
    console.log(`[${sessionId}] ⚠️ OpenAI WebSocket closed`);
    
    // Attempt reconnection if client is still connected
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN && !isOpenAIReady) {
      console.log(`[${sessionId}] 🔄 Connection failed, client will need to reconnect`);
    }
    
    cleanup();
  };

  // NOW upgrade client WebSocket AFTER OpenAI setup
  console.log(`[${sessionId}] 🔄 Step 5: Upgrading client WebSocket...`);
  const upgradeResult = Deno.upgradeWebSocket(req);
  clientSocket = upgradeResult.socket;
  const response = upgradeResult.response;

  // Client socket handlers
  clientSocket.onopen = () => {
    console.log(`[${sessionId}] ✅ Step 5: Client WebSocket connected`);
    console.log(`[${sessionId}] 🎉 FULL SYSTEM READY - Audio pipeline established`);
  };

  clientSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "session.end") {
        console.log(`[${sessionId}] 🛑 Client requested session end`);
        cleanup();
        return;
      }

      // Queue messages if OpenAI not ready yet, otherwise forward directly
      if (!isOpenAIReady) {
        messageQueue.push(event.data);
        console.log(`[${sessionId}] 📦 Message queued (OpenAI not ready). Queue size: ${messageQueue.length}`);
      } else if (openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
        
        // Only log non-audio-buffer messages to reduce noise
        if (data.type !== "input_audio_buffer.append") {
          console.log(`[${sessionId}] ➡️ Forwarded to OpenAI: ${data.type}`);
        }
      } else {
        console.warn(`[${sessionId}] ⚠️ OpenAI socket not ready, message dropped: ${data.type}`);
      }
    } catch (error) {
      console.error(`[${sessionId}] ❌ Error handling client message:`, error);
    }
  };

  clientSocket.onerror = (error) => {
    console.error(`[${sessionId}] ❌ Client WebSocket error:`, error);
  };

  clientSocket.onclose = () => {
    console.log(`[${sessionId}] 🔌 Client WebSocket closed`);
    cleanup();
  };

  const cleanup = () => {
    console.log(`[${sessionId}] 🧹 Cleaning up connections...`);
    clearTimeout(connectionTimeout);
    
    if (openAISocket.readyState === WebSocket.OPEN || openAISocket.readyState === WebSocket.CONNECTING) {
      openAISocket.close();
    }
    if (clientSocket && (clientSocket.readyState === WebSocket.OPEN || clientSocket.readyState === WebSocket.CONNECTING)) {
      clientSocket.close();
    }
    
    // Clear message queue
    messageQueue.length = 0;
    console.log(`[${sessionId}] ✅ Cleanup complete`);
  };

  return response;
});
