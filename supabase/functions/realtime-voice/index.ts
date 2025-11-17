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
    .select("*, voice_provider, elevenlabs_voice_id")
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

  // Connect directly to OpenAI Realtime Beta API
  console.log(`[${sessionId}] 🔌 Step 3: Connecting directly to OpenAI WebSocket (Beta API)...`);
  console.log(`[${sessionId}] 📋 Using Beta model: gpt-4o-realtime-preview-2024-12-17, voice: ${selectedVoice}`);
  console.log(`[${sessionId}] 📋 WebSocket config:`, {
    url: `wss://api.openai.com/v1/realtime`,
    model: "gpt-4o-realtime-preview-2024-12-17",
    protocol: "Beta API with direct API key"
  });
  
  const openAISocket = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
    ["realtime", `openai-insecure-api-key.${openAIKey}`, "openai-beta.realtime-v1"]
  );

  // Message queue to buffer client messages until OpenAI is ready
  const messageQueue: string[] = [];
  let isOpenAIReady = false;
  let sessionConfigured = false;
  let clientSocket: WebSocket;

  // Helper function to get timestamp with milliseconds
  const startTime = new Date();
  const getTimestamp = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds().toString().padStart(3, '0');
  };

  // Event counters for session summary
  const eventCounts = {
    audioDeltas: 0,
    transcripts: 0,
    errors: 0,
    clientMessages: 0
  };

  // Helper function to generate audio with ElevenLabs
  async function generateElevenLabsAudio(
    text: string, 
    voiceId: string
  ): Promise<ArrayBuffer> {
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!elevenLabsKey) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    console.log(`[${sessionId}] 🎙️ Generating audio with ElevenLabs (voice: ${voiceId})`);
    
    const startTime = Date.now();
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2", // Suporta PT-BR
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${sessionId}] ❌ ElevenLabs API Error:`, response.status, errorText);
      throw new Error(`ElevenLabs API failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const duration = Date.now() - startTime;
    
    console.log(`[${sessionId}] ✅ ElevenLabs audio generated: ${audioBuffer.byteLength} bytes in ${duration}ms`);
    
    return audioBuffer;
  }

  console.log(`[${getTimestamp()}] 🔌 Session ${sessionId} - Client connecting to voice chat`);

  // Connection timeout - increased to 30s for more stability
  const connectionTimeout = setTimeout(() => {
    if (!isOpenAIReady) {
      console.error(`[${sessionId}] ❌ OpenAI connection timeout after 30 seconds!`);
      console.error(`[${sessionId}] 📊 Connection state:`, {
        isReady: isOpenAIReady,
        configured: sessionConfigured,
        queuedMessages: messageQueue.length,
        socketReadyState: openAISocket.readyState
      });
      openAISocket.close();
      if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          type: "error",
          error: "Failed to connect to AI service - timeout"
        }));
        clientSocket.close();
      }
    }
  }, 30000);

  // OpenAI socket handlers
  openAISocket.onopen = () => {
    console.log(`[${getTimestamp()}] ✅ OpenAI WebSocket CONNECTED`);
    console.log(`[${getTimestamp()}] 📊 Connection details:`, {
      readyState: openAISocket.readyState,
      protocol: openAISocket.protocol,
      url: openAISocket.url,
      queuedMessages: messageQueue.length
    });
    clearTimeout(connectionTimeout);
    isOpenAIReady = true;

    // Process any queued messages from client
    if (messageQueue.length > 0) {
      console.log(`[${getTimestamp()}] 📦 Processing ${messageQueue.length} queued messages...`);
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg && openAISocket.readyState === WebSocket.OPEN) {
          console.log(`[${getTimestamp()}] 📤 Sending queued message:`, msg.substring(0, 100));
          openAISocket.send(msg);
        }
      }
      console.log(`[${getTimestamp()}] ✅ Queue processed successfully`);
    }
  };

  // Flag para controlar bloqueio de áudio OpenAI (quando usar ElevenLabs)
  let shouldBlockOpenAIAudio = false;

  openAISocket.onmessage = async (event) => {
    try {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        console.error(`[${getTimestamp()}] ❌ Failed to parse OpenAI message:`, parseError);
        eventCounts.errors++;
        return;
      }
      
      // Count audio deltas and transcripts
      if (data.type === "response.audio.delta") {
        eventCounts.audioDeltas++;
      } else if (data.type === "response.audio_transcript.delta") {
        eventCounts.transcripts++;
      }
      
      // Log ALL events for debugging (except audio deltas to reduce noise)
      if (data.type !== "response.audio.delta") {
        console.log(`[${getTimestamp()}] 📨 Received event: ${data.type}`);
      }

      // Log critical events with details
      if (data.type === "session.created") {
        console.log(`[${sessionId}] 🎯 SESSION CREATED - Configuring now...`);
        console.log(`[${sessionId}] 📋 Session details:`, JSON.stringify({
          id: data.session?.id,
          model: data.session?.model,
          voice: data.session?.voice,
          modalities: data.session?.modalities,
          input_audio_format: data.session?.input_audio_format,
          output_audio_format: data.session?.output_audio_format,
          turn_detection: data.session?.turn_detection,
        }, null, 2));
        
        // Send complete configuration via session.update
        try {
          const sessionConfig = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: systemPrompt,
              voice: selectedVoice,
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1",
              },
        turn_detection: {
          type: "server_vad",
          threshold: 0.7,
          prefix_padding_ms: 900,
          silence_duration_ms: 2000,
          create_response: true
        },
              temperature: 0.9,
              max_response_output_tokens: 150,
            },
          };
          
          console.log(`[${sessionId}] 📤 Sending session.update with config:`, JSON.stringify({
            modalities: sessionConfig.session.modalities,
            voice: sessionConfig.session.voice,
            formats: `${sessionConfig.session.input_audio_format}→${sessionConfig.session.output_audio_format}`,
            vad: sessionConfig.session.turn_detection.type,
            instructionsLength: systemPrompt.length
          }, null, 2));
          
          openAISocket.send(JSON.stringify(sessionConfig));
          console.log(`[${sessionId}] ✅ session.update sent, waiting for confirmation...`);
        } catch (error) {
          console.error(`[${sessionId}] ❌ CRITICAL: Failed to send session.update:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Don't mark as configured if update fails
          if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
              type: "error",
              error: {
                message: "Failed to configure session",
                recoverable: false
              }
            }));
          }
          return;
        }
      } else if (data.type === "session.updated") {
        console.log(`[${sessionId}] ✅ Session configuration confirmed`);
        sessionConfigured = true;
        console.log(`[${sessionId}] 🎉 System fully operational`);
      } else if (data.type === "error") {
        console.error(`[${sessionId}] ❌ OpenAI error:`, JSON.stringify(data.error, null, 2));
        
        // Categorize error types
        const errorType = data.error?.type || "unknown";
        const errorCode = data.error?.code || "unknown";
        const errorMessage = data.error?.message || "Unknown error";
        
        console.error(`[${sessionId}] 📋 Error details:`, {
          type: errorType,
          code: errorCode,
          message: errorMessage,
          param: data.error?.param,
        });
        
        // Determine if error is recoverable
        const recoverableErrors = ["rate_limit_exceeded", "server_error"];
        const isRecoverable = recoverableErrors.includes(errorCode) || errorType === "server_error";
        
        // Forward simplified error to client
        if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: "error",
            error: {
              message: errorMessage,
              code: errorCode,
              recoverable: isRecoverable
            }
          }));
        }
        
        // Log but don't crash - let system continue unless critical
        if (!isRecoverable && errorType === "invalid_request_error") {
          console.error(`[${sessionId}] 🚨 Critical error - cannot continue`);
        } else {
          console.log(`[${sessionId}] ⚠️ Non-critical error - continuing...`);
        }
      } else if (data.type === "response.audio.delta") {
        console.log(`[${sessionId}] 🔊 Audio chunk: ${data.delta?.length || 0} bytes`);
      } else if (data.type === "response.audio.done") {
        console.log(`[${sessionId}] ✅ Audio response completed`);
      } else if (data.type === "response.audio_transcript.delta") {
        console.log(`[${sessionId}] 📝 Transcript delta: "${data.delta}"`);
      } else if (data.type === "conversation.item.input_audio_transcription.completed") {
        console.log(`[${sessionId}] 🎤 User said: "${data.transcript}"`);
        
        // Save user message to database with retry logic
        const maxRetries = 3;
        let retryCount = 0;
        let saved = false;

        while (retryCount < maxRetries && !saved) {
          try {
            console.log(`[${sessionId}] 💾 Saving user message (attempt ${retryCount + 1}/${maxRetries})...`);
            
            const { error: msgError } = await supabase.from("session_messages").insert({
              session_id: sessionId,
              role: "user",
              content: data.transcript,
            });

            if (msgError) {
              console.error(`[${sessionId}] ❌ Error saving user message:`, {
                attempt: retryCount + 1,
                maxRetries,
                error: msgError,
                sessionId,
                transcript: data.transcript.substring(0, 50) + '...'
              });
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
              }
            } else {
              console.log(`[${sessionId}] ✅ User message saved:`, {
                length: data.transcript.length,
                preview: data.transcript.substring(0, 50) + '...'
              });
              saved = true;
            }
          } catch (err) {
            console.error(`[${sessionId}] ❌ Exception saving user message:`, {
              attempt: retryCount + 1,
              error: err,
              sessionId
            });
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
            }
          }
        }

        if (!saved) {
          console.error(`[${sessionId}] 🚨 CRITICAL: Failed to save user message after ${maxRetries} attempts`, {
            transcript: data.transcript,
            sessionId
          });
        }
      } else if (data.type === "response.audio_transcript.done") {
        console.log(`[${sessionId}] 📝 Full AI transcript: "${data.transcript}"`);
        
        // ====== NOVA LÓGICA PARA ELEVENLABS ======
        // Se persona usa ElevenLabs, gerar áudio customizado
        if (persona.voice_provider === "elevenlabs" && persona.elevenlabs_voice_id && data.transcript) {
          try {
            console.log(`[${sessionId}] 🔄 Intercepting OpenAI audio, using ElevenLabs instead`);
            
            // Gerar áudio com ElevenLabs
            const audioBuffer = await generateElevenLabsAudio(
              data.transcript,
              persona.elevenlabs_voice_id
            );
            
            // Converter para base64
            const uint8Array = new Uint8Array(audioBuffer);
            let binary = '';
            const chunkSize = 0x8000;
            
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
              binary += String.fromCharCode(...chunk);
            }
            
            const base64Audio = btoa(binary);
            
            // Enviar para cliente com flag especial
            if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: "elevenlabs_audio",
                audio: base64Audio,
                transcript: data.transcript,
                provider: "elevenlabs",
                format: "mp3"
              }));
              
              console.log(`[${sessionId}] ✅ Sent ElevenLabs audio to client (${audioBuffer.byteLength} bytes)`);
            }
            
            // Ainda enviar transcrição para cliente
            if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: "response.audio_transcript.done",
                transcript: data.transcript
              }));
            }
            
            // Salvar mensagem no banco (mesmo código de antes)
            const maxRetries = 3;
            let retryCount = 0;
            let saved = false;

            while (retryCount < maxRetries && !saved) {
              try {
                console.log(`[${sessionId}] 💾 Saving assistant message (attempt ${retryCount + 1}/${maxRetries})...`);
                
                const { error: msgError } = await supabase.from("session_messages").insert({
                  session_id: sessionId,
                  role: "assistant",
                  content: data.transcript,
                });

                if (msgError) {
                  console.error(`[${sessionId}] ❌ Error saving assistant message:`, {
                    attempt: retryCount + 1,
                    maxRetries,
                    error: msgError,
                    sessionId,
                    transcript: data.transcript.substring(0, 50) + '...'
                  });
                  retryCount++;
                  if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                  }
                } else {
                  console.log(`[${sessionId}] ✅ Assistant message saved:`, {
                    length: data.transcript.length,
                    preview: data.transcript.substring(0, 50) + '...'
                  });
                  saved = true;
                }
              } catch (err) {
                console.error(`[${sessionId}] ❌ Exception saving assistant message:`, {
                  attempt: retryCount + 1,
                  error: err,
                  sessionId
                });
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                }
              }
            }

            if (!saved) {
              console.error(`[${sessionId}] 🚨 CRITICAL: Failed to save assistant message after ${maxRetries} attempts`, {
                transcript: data.transcript,
                sessionId
              });
            }
            
            // Retornar para não processar áudio OpenAI
            return;
            
          } catch (error) {
            console.error(`[${sessionId}] ❌ ElevenLabs generation failed, falling back to OpenAI:`, error);
            // Em caso de erro, continuar com OpenAI (fallback)
          }
        }
        // ====== FIM DA NOVA LÓGICA ======
        
        // Save assistant message to database with retry logic (fallback OpenAI)
        if (data.transcript) {
          const maxRetries = 3;
          let retryCount = 0;
          let saved = false;

          while (retryCount < maxRetries && !saved) {
            try {
              console.log(`[${sessionId}] 💾 Saving assistant message (attempt ${retryCount + 1}/${maxRetries})...`);
              
              const { error: msgError } = await supabase.from("session_messages").insert({
                session_id: sessionId,
                role: "assistant",
                content: data.transcript,
              });

              if (msgError) {
                console.error(`[${sessionId}] ❌ Error saving assistant message:`, {
                  attempt: retryCount + 1,
                  maxRetries,
                  error: msgError,
                  sessionId,
                  transcript: data.transcript.substring(0, 50) + '...'
                });
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                }
              } else {
                console.log(`[${sessionId}] ✅ Assistant message saved:`, {
                  length: data.transcript.length,
                  preview: data.transcript.substring(0, 50) + '...'
                });
                saved = true;
              }
            } catch (err) {
              console.error(`[${sessionId}] ❌ Exception saving assistant message:`, {
                attempt: retryCount + 1,
                error: err,
                sessionId
              });
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
              }
            }
          }

          if (!saved) {
            console.error(`[${sessionId}] 🚨 CRITICAL: Failed to save assistant message after ${maxRetries} attempts`, {
              transcript: data.transcript,
              sessionId
            });
          }
        }
      } else if (data.type === "error") {
        console.error(`[${sessionId}] ❌ OpenAI error event:`, JSON.stringify(data.error, null, 2));
        // Already handled above, this catches duplicate error events
      } else if (data.type === "response.created") {
        console.log(`[${sessionId}] 🤖 AI response started`);
        
        // Ativar bloqueio de áudio se persona usa ElevenLabs
        if (persona.voice_provider === "elevenlabs" && persona.elevenlabs_voice_id) {
          shouldBlockOpenAIAudio = true;
          console.log(`[${sessionId}] 🚫 Blocking OpenAI audio chunks (will use ElevenLabs)`);
        } else {
          shouldBlockOpenAIAudio = false;
        }
      } else if (data.type === "response.done") {
        console.log(`[${sessionId}] ✅ AI response finished`);
        
        // Resetar flag para próxima resposta
        shouldBlockOpenAIAudio = false;
      }

      // Forward to client (with error handling)
      if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        try {
          // Bloquear eventos de áudio OpenAI se vamos usar ElevenLabs
          const shouldBlock = shouldBlockOpenAIAudio && (
            data.type === "response.audio.delta" || 
            data.type === "response.audio.done"
          );
          
          if (shouldBlock) {
            console.log(`[${sessionId}] 🚫 Blocked ${data.type} (using ElevenLabs instead)`);
          } else {
            clientSocket.send(event.data);
          }
        } catch (error) {
          console.error(`[${sessionId}] ⚠️ Failed to forward message to client:`, error);
          // Continue anyway - don't crash the system
        }
      }
    } catch (error) {
      console.error(`[${sessionId}] ❌ Critical error handling OpenAI message:`, {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't throw - keep the connection alive
    }
  };

  openAISocket.onerror = (error) => {
    console.error(`[${sessionId}] ❌ OpenAI WebSocket ERROR:`, {
      error: error,
      errorType: typeof error,
      readyState: openAISocket.readyState,
      readyStateText: ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][openAISocket.readyState],
      url: openAISocket.url,
      protocol: openAISocket.protocol,
      isReady: isOpenAIReady,
      configured: sessionConfigured,
      timestamp: new Date().toISOString()
    });
    clearTimeout(connectionTimeout);
    
    // Notify client of connection issues
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      try {
        clientSocket.send(JSON.stringify({
          type: "error",
          error: {
            message: "Voice connection interrupted",
            recoverable: true
          }
        }));
      } catch (e) {
        console.error(`[${sessionId}] ⚠️ Failed to notify client of error:`, e);
      }
    }
  };

  openAISocket.onclose = (event) => {
    console.log(`[${sessionId}] ⚠️ OpenAI WebSocket CLOSED:`, {
      code: event.code,
      reason: event.reason || "No reason provided",
      wasClean: event.wasClean,
      isReady: isOpenAIReady,
      configured: sessionConfigured,
      timestamp: new Date().toISOString()
    });
    
    // Attempt reconnection if client is still connected
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN && !isOpenAIReady) {
      console.log(`[${sessionId}] 🔄 Connection failed before ready, client will need to reconnect`);
    }
    
    cleanup();
  };

  // NOW upgrade client WebSocket AFTER OpenAI setup
  console.log(`[${sessionId}] 🔄 Step 4: Upgrading client WebSocket...`);
  const upgradeResult = Deno.upgradeWebSocket(req);
  clientSocket = upgradeResult.socket;
  const response = upgradeResult.response;

  // Client socket handlers
  clientSocket.onopen = () => {
    console.log(`[${sessionId}] ✅ Step 4: Client WebSocket connected`);
    console.log(`[${sessionId}] 🎉 FULL SYSTEM READY - Audio pipeline established`);
  };

  clientSocket.onmessage = (event) => {
    try {
      eventCounts.clientMessages++;
      let data;
      
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        console.error(`[${getTimestamp()}] ❌ Failed to parse client message:`, parseError);
        eventCounts.errors++;
        return;
      }

      if (data.type === "session.end") {
        console.log(`[${getTimestamp()}] 🛑 Client requested session end`);
        cleanup();
        return;
      }

      // Queue messages if OpenAI not ready yet, otherwise forward directly
      if (!isOpenAIReady) {
        messageQueue.push(event.data);
        console.log(`[${getTimestamp()}] 📦 Message queued (OpenAI not ready). Queue size: ${messageQueue.length}`);
      } else if (openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
        
        // Only log non-audio-buffer messages to reduce noise
        if (data.type !== "input_audio_buffer.append") {
          console.log(`[${getTimestamp()}] ➡️ Forwarded to OpenAI: ${data.type}`);
        }
      } else {
        console.warn(`[${getTimestamp()}] ⚠️ OpenAI socket not ready, message dropped: ${data.type}`);
      }
    } catch (error) {
      console.error(`[${getTimestamp()}] ❌ Error handling client message:`, error);
      eventCounts.errors++;
    }
  };

  clientSocket.onerror = (error) => {
    console.error(`[${getTimestamp()}] ❌ Client WebSocket error:`, error);
    eventCounts.errors++;
  };

  clientSocket.onclose = () => {
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1);
    
    console.log(`[${getTimestamp()}] 🔌 Client WebSocket closed`);
    console.log(`[${getTimestamp()}] 📊 Session Summary:`);
    console.log(`  ⏱️  Duration: ${duration}s`);
    console.log(`  🎵 Audio deltas: ${eventCounts.audioDeltas}`);
    console.log(`  📝 Transcripts: ${eventCounts.transcripts}`);
    console.log(`  💬 Client messages: ${eventCounts.clientMessages}`);
    console.log(`  ❌ Errors: ${eventCounts.errors}`);
    
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
