import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from "@/utils/RealtimeAudio";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { triggerHaptic, triggerSuccessHaptic, triggerErrorHaptic } from "@/utils/haptics";
import { Mic, MicOff, PhoneOff, Volume2, ArrowLeft, Clock, Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import SessionSummaryModal from "@/components/SessionSummaryModal";
import { AudioPerformanceTest } from "@/components/AudioPerformanceTest";
import { AudioDiagnostics } from "@/components/AudioDiagnostics";
import { cn } from "@/lib/utils";

// Feature flag: usar novo sistema de áudio otimizado
const USE_ENHANCED_AUDIO = import.meta.env.VITE_USE_ENHANCED_AUDIO === 'true';
const AUDIO_SAMPLE_RATE = parseInt(import.meta.env.VITE_AUDIO_SAMPLE_RATE || '24000');
const AUDIO_LATENCY_HINT = (import.meta.env.VITE_AUDIO_LATENCY_HINT || 'interactive') as AudioContextLatencyCategory;
const ENABLE_AUDIO_METRICS = import.meta.env.DEV; // Metrics apenas em dev

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const VoiceChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [personaId, setPersonaId] = useState<string>("");
  const [personaName, setPersonaName] = useState<string>("");
  const [meetingType, setMeetingType] = useState<string>("");
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [duration, setDuration] = useState(0);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showPerformanceTest, setShowPerformanceTest] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentAudioProvider, setCurrentAudioProvider] = useState<'openai' | 'elevenlabs'>('openai');

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isReconnectingRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSessionEndedRef = useRef(false);

  // Enhanced audio player (se habilitado)
  const enhancedAudio = USE_ENHANCED_AUDIO ? useAudioPlayer({
    sampleRate: AUDIO_SAMPLE_RATE,
    latencyHint: AUDIO_LATENCY_HINT,
  }) : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting - cleaning up resources");
      
      const cleanup = async () => {
        try {
          // 1. Fechar WebSocket primeiro
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.close();
            console.log('✅ WebSocket closed');
          }
          wsRef.current = null;
          
          // 2. Parar gravação (aguardar cleanup assíncrono)
          if (recorderRef.current) {
            await recorderRef.current.stop();
            recorderRef.current = null;
            console.log('✅ Recorder destroyed');
          }
          
          // 3. Destruir fila de áudio
          if (audioQueueRef.current) {
            await audioQueueRef.current.destroy();
            audioQueueRef.current = null;
            console.log('✅ AudioQueue destroyed');
          }
          
          // 4. AudioContext já foi fechado pelo AudioQueue.destroy()
          audioContextRef.current = null;
          
          // 5. Limpar interval de atividade
          if (activityCheckIntervalRef.current) {
            clearInterval(activityCheckIntervalRef.current);
            activityCheckIntervalRef.current = null;
            console.log('✅ Activity check cleared');
          }
          
          console.log('✅ All resources cleaned up successfully');
        } catch (error) {
          console.error("❌ Error during cleanup:", error);
        }
      };
      
      cleanup();
    };
  }, []);

  // Warn before closing tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isConnected) {
        e.preventDefault();
        e.returnValue = 'Você tem uma sessão ativa. Deseja realmente sair?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isConnected]);

  // Handle tab visibility change to cleanup sessions
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && isConnected && sessionId) {
        console.log('Tab hidden - cleaning up session');
        // Mark session for cleanup but don't fully end it yet
        // This allows recovery if user comes back quickly
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, sessionId]);

  // WebSocket connection stays alive naturally through audio communication
  // No need for manual heartbeat pings

  // Detect iOS/Safari and log mobile info
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    
    // Log mobile debug info
    console.log('=== Mobile Debug Info ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    console.log('iOS:', iOS);
    console.log('Safari:', /Safari/.test(navigator.userAgent));
    console.log('AudioContext support:', 'AudioContext' in window);
    console.log('AudioWorklet support:', 'AudioWorkletNode' in window);
    console.log('MediaDevices support:', 'mediaDevices' in navigator);
    console.log('===');
  }, []);

  // Lock orientation to portrait on mobile
  useEffect(() => {
    if ('orientation' in screen && 'lock' in (screen as any).orientation) {
      try {
        (screen as any).orientation.lock('portrait').catch(() => {
          console.log('Orientation lock not supported');
        });
      } catch (e) {
        console.log('Orientation lock failed');
      }
    }

    return () => {
      if ('orientation' in screen && 'unlock' in (screen as any).orientation) {
        try {
          (screen as any).orientation.unlock();
        } catch (e) {
          console.log('Orientation unlock failed');
        }
      }
    };
  }, []);

  // Check for inactivity and auto-end session after 30 minutes
  useEffect(() => {
    if (!isConnected || !sessionId) return;

    // Update activity on any message
    lastActivityRef.current = Date.now();

    // Check activity every minute
    activityCheckIntervalRef.current = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const thirtyMinutes = 30 * 60 * 1000;

      if (inactiveTime > thirtyMinutes) {
        console.log('Session inactive for 30 minutes - auto-ending');
        toast({
          title: "Sessão Encerrada",
          description: "Sua sessão foi encerrada devido à inatividade.",
          variant: "destructive",
        });
        handleEndSession();
      }
    }, 60000); // Check every minute

    return () => {
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
    };
  }, [isConnected, sessionId]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      initializeSession();
    }
  }, [user]);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected, sessionStartTime]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (profileData) setProfile(profileData);
  };

  const initializeSession = async () => {
    const state = location.state as any;
    if (!state?.personaId || !state?.meetingType) {
      toast({
        title: "Erro",
        description: "Informações da sessão não encontradas",
        variant: "destructive",
      });
      navigate("/roleplay");
      return;
    }

    // Check for existing active voice sessions
    const { data: activeSessions } = await supabase
      .from("roleplay_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("method", "voice");

    if (activeSessions && activeSessions.length > 0) {
      toast({
        title: "Sessão Ativa Detectada",
        description: "Você já possui uma sessão de voz ativa. Finalize-a primeiro.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setPersonaId(state.personaId);
    setPersonaName(state.personaName || "Persona");
    setMeetingType(state.meetingType);

    // Create session
    const { data: sessionData, error } = await supabase
      .from("roleplay_sessions")
      .insert({
        user_id: user.id,
        persona_id: state.personaId,
        meeting_type: state.meetingType,
        method: "voice",
        status: "active",
      })
      .select()
      .single();

    if (error || !sessionData) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão",
        variant: "destructive",
      });
      navigate("/roleplay");
      return;
    }

    setSessionId(sessionData.id);
    setSessionStartTime(new Date(sessionData.started_at));
    
    // On iOS/Safari, we need user interaction to initialize audio
    // This will be handled by the UI button shown only on iOS
    if (!isIOS) {
      setAudioInitialized(true);
    }
    
    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isIOS || audioInitialized) {
        await connectWebSocket(sessionData.id, state.personaId, state.meetingType);
      }
    } catch (error) {
      triggerErrorHaptic();
      const errorMessage = error instanceof Error ? error.message : "É necessário permitir o acesso ao microfone";
      setAudioError(errorMessage);
      toast({
        title: "Permissão Negada",
        description: errorMessage,
        variant: "destructive",
      });
      navigate("/roleplay");
    }
  };

  const initializeAudio = async () => {
    try {
      // Create and resume AudioContext with user gesture (Safari requirement)
      const testContext = new AudioContext();
      await testContext.resume();
      await testContext.close();
      setAudioInitialized(true);
      triggerSuccessHaptic();
      
      // Now connect websocket
      if (sessionId && personaId && meetingType) {
        await connectWebSocket(sessionId, personaId, meetingType);
      }
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      const errorMessage = error instanceof Error ? error.message : "Falha ao inicializar áudio";
      setAudioError(`Erro de inicialização: ${errorMessage}`);
      triggerErrorHaptic();
      toast({
        title: "Erro",
        description: "Falha ao inicializar áudio. Tente executar o diagnóstico.",
        variant: "destructive",
      });
    }
  };

  // Reproduzir áudio do ElevenLabs (formato MP3)
  const playElevenLabsAudio = useCallback(async (base64Audio: string, transcript: string) => {
    try {
      console.log('🎵 Playing ElevenLabs audio (MP3 format)');
      setIsSpeaking(true);
      
      // Converter base64 para Blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Handlers
      audio.onplay = () => {
        console.log('▶️ ElevenLabs audio started');
        setIsSpeaking(true);
        triggerHaptic('medium');
      };
      
      audio.onended = () => {
        console.log('⏹️ ElevenLabs audio ended');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        triggerHaptic('light');
      };
      
      audio.onerror = (e) => {
        console.error('❌ Error playing ElevenLabs audio:', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Erro de Áudio",
          description: "Falha ao reproduzir resposta de voz",
          variant: "destructive",
        });
      };
      
      // Adicionar transcrição às mensagens
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: transcript,
        timestamp: new Date()
      }]);
      
      await audio.play();
      
    } catch (error) {
      console.error('❌ Error in playElevenLabsAudio:', error);
      setIsSpeaking(false);
      toast({
        title: "Erro de Áudio",
        description: "Não foi possível reproduzir o áudio",
        variant: "destructive",
      });
    }
  }, [toast, triggerHaptic]);

  const connectWebSocket = async (sessionId: string, personaId: string, meetingType: string) => {
    try {
      // ✅ Only close if necessary
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'closed') {
          audioContextRef.current = null; // Need to create new
        } else {
          // Reuse existing context
          console.log('♻️ Reusing existing AudioContext');
          await audioContextRef.current.resume();
        }
      }
      
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }

      // Limpar áudio anterior
      if (USE_ENHANCED_AUDIO && enhancedAudio) {
        enhancedAudio.clearQueue();
      } else {
        audioQueueRef.current?.clear();
      }

      // Setup audio system baseado no feature flag
      if (USE_ENHANCED_AUDIO) {
        console.log('🎵 Using enhanced audio system', { 
          sampleRate: AUDIO_SAMPLE_RATE, 
          latencyHint: AUDIO_LATENCY_HINT 
        });
        // Enhanced audio usa seu próprio AudioContext interno
      } else {
        // Only create new if doesn't exist (sistema legado)
        if (!audioContextRef.current) {
          console.log('🎵 Creating AudioContext with config:', {
            sampleRate: AUDIO_SAMPLE_RATE,
            latencyHint: AUDIO_LATENCY_HINT,
          });
          audioContextRef.current = new AudioContext({ 
            sampleRate: AUDIO_SAMPLE_RATE,
            latencyHint: AUDIO_LATENCY_HINT,
          });
          
          // Verificar sample rate real do contexto
          const actualSampleRate = audioContextRef.current.sampleRate;
          if (actualSampleRate !== AUDIO_SAMPLE_RATE) {
            console.warn(`⚠️ AudioContext criado com ${actualSampleRate}Hz mas esperava ${AUDIO_SAMPLE_RATE}Hz!`);
            console.warn('⚠️ Isso causará áudio acelerado ou lento. Ajustando...');
          }
        }
        
        audioQueueRef.current = new AudioQueue(audioContextRef.current, {
          sampleRate: AUDIO_SAMPLE_RATE,
          enableMetrics: ENABLE_AUDIO_METRICS,
        });
        
        // ✅ Monitor AudioContext state
        audioQueueRef.current.monitorAudioContext(() => {
          toast({
            title: "⚠️ Áudio Pausado",
            description: "Reativando reprodução de áudio...",
            duration: 2000,
          });
        });
      }

      // Build WebSocket URL from Supabase URL environment variable
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const wsBaseUrl = supabaseUrl.replace('https://', 'wss://');
      const wsUrl = `${wsBaseUrl}/functions/v1/realtime-voice?sessionId=${sessionId}&personaId=${personaId}&meetingType=${meetingType}`;
      
      wsRef.current = new WebSocket(wsUrl);

      // Connection timeout - 15s to establish connection
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          console.error('[WebSocket] Connection timeout after 15s');
          toast({
            title: "Erro de Conexão",
            description: "Tempo esgotado ao conectar ao sistema de voz",
            variant: "destructive",
          });
          wsRef.current.close();
        }
      }, 15000);

      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionAttempts(0); // Reset on successful connection
        isReconnectingRef.current = false;
        triggerHaptic('medium'); // Haptic feedback on connection
        startRecording();
        
        // ✅ Setup heartbeat to detect inactivity
        if (activityCheckIntervalRef.current) {
          clearInterval(activityCheckIntervalRef.current);
        }
        
        activityCheckIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const timeSinceLastActivity = Date.now() - lastActivityRef.current;
            
            if (timeSinceLastActivity > 10000) { // 10 seconds without activity
              console.warn('⚠️ No activity detected for 10s, checking connection...');
              
              // Send ping to verify connection is alive
              wsRef.current.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
              }));
              
              // If no response in 5s, reconnect
              setTimeout(() => {
                const timeSinceCheck = Date.now() - lastActivityRef.current;
                if (timeSinceCheck > 15000) {
                  console.error('❌ Connection appears dead, reconnecting...');
                  wsRef.current?.close();
                }
              }, 5000);
            }
          }
        }, 5000); // Check every 5 seconds
        
        toast({
          title: "Conectado",
          description: "Você pode começar a falar",
        });
      };

      wsRef.current.onmessage = async (event) => {
        // Ignore messages if session ended
        if (isSessionEndedRef.current) {
          console.log('Session ended, ignoring message');
          return;
        }

        const data = JSON.parse(event.data);
        console.log("Received event:", data.type);

        // Update last activity timestamp on any message
        lastActivityRef.current = Date.now();

        // ====== NOVO: DETECTAR ÁUDIO DO ELEVENLABS ======
        if (data.type === 'elevenlabs_audio') {
          console.log('🎙️ Received ElevenLabs audio');
          setCurrentAudioProvider('elevenlabs');
          await playElevenLabsAudio(data.audio, data.transcript);
          return; // Processar apenas isso, não continuar com lógica OpenAI
        }
        // ====== FIM DO NOVO ======

        if (data.type === "response.audio.delta") {
          // Add natural delay before first audio chunk for more natural feel
          if (!isSpeaking) {
            setIsProcessing(true);
            await new Promise(resolve => setTimeout(resolve, 300));
            setIsProcessing(false);
            triggerHaptic('light'); // Subtle haptic when AI starts speaking
          }
          
          setCurrentAudioProvider('openai'); // Definir provider como OpenAI
          setIsSpeaking(true);
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Use enhanced audio ou sistema legado baseado no feature flag
          if (USE_ENHANCED_AUDIO && enhancedAudio) {
            await enhancedAudio.enqueueAudio(bytes);
          } else {
            await audioQueueRef.current?.addToQueue(bytes);
          }
        }

        if (data.type === "response.audio.done") {
          setIsSpeaking(false);
        }

        if (data.type === "conversation.item.input_audio_transcription.completed") {
          setMessages(prev => [...prev, {
            role: "user",
            content: data.transcript,
            timestamp: new Date(),
          }]);
        }

        if (data.type === "response.audio_transcript.delta") {
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: lastMsg.content + data.delta }
              ];
            }
            return [...prev, {
              role: "assistant",
              content: data.delta,
              timestamp: new Date(),
            }];
          });
        }

        if (data.type === "error") {
          console.error("[WebSocket] Error event received:", {
            error: data.error,
            type: typeof data.error,
            sessionId,
            timestamp: new Date().toISOString()
          });
          
          // Safely extract error message
          let errorMessage = "Erro na conexão de voz";
          let errorDetails = "";
          let errorVariant: "default" | "destructive" = "destructive";
          
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error && typeof data.error === 'object') {
            const errorCode = data.error.code || "";
            errorMessage = data.error.message || "Erro desconhecido";
            errorDetails = data.error.details || "";
            
            // Provide specific, user-friendly messages for common errors
            if (errorMessage.includes("API version mismatch")) {
              errorMessage = "Erro de compatibilidade com a API de voz";
              errorDetails = "Por favor, tente novamente. Se o problema persistir, contate o suporte.";
              errorVariant = "destructive";
            } else if (errorMessage.includes("beta client secret")) {
              errorMessage = "Erro de autenticação com o serviço de voz";
              errorDetails = "Reinicie a sessão de voz para tentar novamente.";
              errorVariant = "destructive";
            } else if (errorCode === "rate_limit_exceeded") {
              errorMessage = "Limite de uso excedido";
              errorDetails = "Aguarde alguns instantes antes de tentar novamente.";
              errorVariant = "default";
            } else if (errorCode === "invalid_request_error") {
              errorMessage = "Erro de configuração do sistema";
              errorDetails = "Reinicie a sessão de voz.";
              errorVariant = "destructive";
            } else if (data.error.recoverable) {
              console.log("[WebSocket] Error is recoverable, connection maintained");
              errorMessage = "Problema temporário detectado";
              errorDetails = "A conexão foi mantida, continue normalmente.";
              errorVariant = "default";
            }
          }
          
          toast({
            title: errorVariant === "destructive" ? "Erro" : "Aviso",
            description: errorMessage + (errorDetails ? ` ${errorDetails}` : ""),
            variant: errorVariant,
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("[WebSocket] Error event:", {
          error,
          type: error.type,
          readyState: wsRef.current?.readyState,
          url: wsRef.current?.url,
          sessionId,
          timestamp: new Date().toISOString()
        });
        
        setIsConnected(false);
        
        // Provide more detailed, user-friendly error messages
        let errorTitle = "Erro de Conexão";
        let errorDescription = "Não foi possível conectar ao sistema de voz";
        
        const readyState = wsRef.current?.readyState;
        if (readyState === WebSocket.CONNECTING) {
          errorTitle = "Falha ao Conectar";
          errorDescription = "O servidor de voz não respondeu. Verifique sua conexão e tente novamente.";
        } else if (readyState === WebSocket.CLOSING) {
          errorTitle = "Conexão Encerrando";
          errorDescription = "A conexão está sendo encerrada. Aguarde...";
        } else if (readyState === WebSocket.CLOSED) {
          errorTitle = "Conexão Perdida";
          errorDescription = "A conexão com o servidor de voz foi perdida. Tente reconectar.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
          duration: 4000,
        });
      };

      wsRef.current.onclose = (event) => {
        console.log("[WebSocket] Connection closed:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          sessionId,
          connectionAttempts,
          timestamp: new Date().toISOString()
        });
        
        setIsConnected(false);
        stopRecording();

        // Provide specific close reason messages
        let closeTitle = "Conexão Encerrada";
        let closeDescription = "A sessão de voz foi encerrada";
        
        if (event.code === 1000) {
          closeDescription = "Sessão encerrada normalmente";
        } else if (event.code === 1001) {
          closeDescription = "Servidor desconectou. Tente novamente.";
        } else if (event.code === 1006) {
          closeTitle = "Conexão Perdida";
          closeDescription = "A conexão foi perdida inesperadamente. Tentando reconectar...";
        } else if (event.code === 1008) {
          closeTitle = "Erro de Protocolo";
          closeDescription = "Erro de comunicação com o servidor. Reinicie a sessão.";
        } else if (event.code === 1011) {
          closeTitle = "Erro no Servidor";
          closeDescription = "O servidor encontrou um erro. Tente novamente em instantes.";
        }

        // Only attempt reconnection if not already reconnecting and haven't exceeded attempts
        if (connectionAttempts < 3 && !isReconnectingRef.current && !event.wasClean) {
          isReconnectingRef.current = true;
          console.log(`[WebSocket] Attempting reconnection (${connectionAttempts + 1}/3)...`);
          
          toast({
            title: "Reconectando...",
            description: `Tentativa ${connectionAttempts + 1} de 3 - ${closeDescription}`,
          });
          
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connectWebSocket(sessionId, personaId, meetingType)
              .catch((err) => {
                console.error("[WebSocket] Reconnection failed:", {
                  error: err,
                  attempt: connectionAttempts + 1
                });
                isReconnectingRef.current = false;
              });
          }, 2000);
        } else if (connectionAttempts >= 3) {
          console.error("[WebSocket] Max reconnection attempts reached");
          toast({
            title: "Falha na Reconexão",
            description: "Não foi possível restabelecer a conexão após 3 tentativas. Por favor, finalize e inicie uma nova sessão de voz.",
            variant: "destructive",
            duration: 8000,
          });
        } else if (event.wasClean) {
          console.log("[WebSocket] Connection closed cleanly (expected)");
          toast({
            title: closeTitle,
            description: closeDescription,
            variant: "default",
            duration: 3000,
          });
        }
      };
    } catch (error) {
      console.error("[WebSocket] Error connecting:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Provide specific error messages based on error type
      let errorTitle = "Erro de Conexão";
      let errorDescription = "Não foi possível estabelecer conexão com o sistema de voz";
      
      if (error instanceof Error) {
        setAudioError(`Erro WebSocket: ${error.message}`);
        
        if (error.message.includes("timeout")) {
          errorTitle = "Tempo Esgotado";
          errorDescription = "A conexão demorou muito para ser estabelecida. Verifique sua internet e tente novamente.";
        } else if (error.message.includes("network")) {
          errorTitle = "Erro de Rede";
          errorDescription = "Problema na conexão de rede. Verifique sua internet.";
        } else if (error.message.includes("refused")) {
          errorTitle = "Conexão Recusada";
          errorDescription = "O servidor não aceitou a conexão. Tente novamente em instantes.";
        }
      } else {
        setAudioError("Erro desconhecido de conexão");
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const startRecording = async () => {
    try {
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Update activity timestamp when sending audio
          lastActivityRef.current = Date.now();
          
          const encoded = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: encoded,
          }));
        }
      });
      await recorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível iniciar gravação";
      setAudioError(`Erro de gravação: ${errorMessage}`);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar gravação. Verifique as permissões do microfone.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleEndSession = useCallback(async () => {
    if (!sessionId || isSessionEndedRef.current) return;

    console.log("Ending session:", sessionId);
    isSessionEndedRef.current = true;
    triggerHaptic('heavy'); // Strong haptic feedback on session end
    
    try {
      // Send end signal to backend before closing
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          console.log("Sending session.end to backend");
          wsRef.current.send(JSON.stringify({ 
            type: 'session.end' 
          }));
          
          // Wait a bit for message to be processed
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error("Error sending session.end:", error);
        }
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      stopRecording();
      
      if (audioQueueRef.current) {
        await audioQueueRef.current.destroy();
      }
    } catch (error) {
      console.error("Error during session cleanup:", error);
    }

    const sessionDuration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);

    if (sessionId) {
      await supabase
        .from("roleplay_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_seconds: sessionDuration,
        })
        .eq("id", sessionId);

      // Validate messages before evaluation
      console.log("Validating messages before evaluation...");
      
      try {
        // Check if messages exist
        const { data: messages, error: msgError } = await supabase
          .from("session_messages")
          .select("id")
          .eq("session_id", sessionId)
          .limit(1);

        if (msgError) {
          console.error("Error checking messages:", msgError);
        }

        if (messages && messages.length > 0) {
          console.log("Messages found, starting AI evaluation for session:", sessionId);
          
          await supabase.functions.invoke('evaluate-competencies', {
            body: { sessionId },
          });
          
          console.log("AI evaluation triggered successfully");
        } else {
          console.warn("No messages found for session, skipping evaluation");
          toast({
            title: "Aviso",
            description: "Nenhuma mensagem foi registrada nesta sessão",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Error during evaluation process:', err);
        toast({
          title: "Erro",
          description: "Erro ao processar avaliação da sessão",
          variant: "destructive",
        });
      }
    }

    setShowSummary(true);
  }, [sessionId, sessionStartTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExitConfirm(true)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Breadcrumbs />

        <div className="bg-card rounded-lg shadow-lg p-8">
          {/* Header Info */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={isConnected ? "default" : "destructive"} className="gap-2">
                {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {isConnected ? "Conectado" : connectionAttempts > 0 ? `Reconectando... (${connectionAttempts}/3)` : "Desconectado"}
              </Badge>
              {/* Badge indicando provider de áudio (apenas em dev) */}
              {import.meta.env.DEV && currentAudioProvider && (
                <Badge variant="outline" className="gap-2">
                  {currentAudioProvider === 'elevenlabs' ? '🎙️ ElevenLabs' : '🤖 OpenAI'}
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-mono text-xl font-bold">{formatDuration(duration)}</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{personaName}</h1>
            <p className="text-muted-foreground capitalize">{meetingType.replace("_", " ")}</p>
          </div>

          {/* Status Visual - Maior no mobile */}
          <div className="flex flex-col items-center justify-center space-y-6 mb-8">
            <div className={cn(
              "rounded-full flex items-center justify-center transition-all",
              // Mobile: 160x160px, Desktop: 128x128px
              "w-40 h-40 md:w-32 md:h-32",
              isSpeaking 
                ? "bg-primary animate-pulse shadow-lg shadow-primary/50" 
                : isRecording 
                ? "bg-secondary animate-pulse" 
                : "bg-muted"
            )}>
              {isSpeaking ? (
                <Volume2 className="w-20 h-20 md:w-16 md:h-16 text-primary-foreground" />
              ) : isRecording ? (
                <Mic className="w-20 h-20 md:w-16 md:h-16 text-secondary-foreground" />
              ) : (
                <MicOff className="w-20 h-20 md:w-16 md:h-16 text-muted-foreground" />
              )}
            </div>

            {/* Status indicators with better mobile visibility */}
            <div className="text-center min-h-[60px] flex items-center justify-center">
              {isSpeaking && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-8 bg-primary animate-pulse rounded" style={{animationDelay: '0ms'}} />
                    <div className="w-1 h-8 bg-primary animate-pulse rounded" style={{animationDelay: '150ms'}} />
                    <div className="w-1 h-8 bg-primary animate-pulse rounded" style={{animationDelay: '300ms'}} />
                  </div>
                  <p className="text-lg font-medium text-primary">
                    {personaName} está falando...
                  </p>
                </div>
              )}
              {!isSpeaking && isRecording && !isProcessing && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <p className="text-lg font-medium text-secondary">
                    Ouvindo...
                  </p>
                </div>
              )}
              {isProcessing && (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Pensando...
                  </p>
                </div>
              )}
              {!isConnected && !isProcessing && (
                <p className="text-lg font-medium text-muted-foreground">
                  Conectando...
                </p>
              )}
            </div>

            {/* Audio Metrics (Dev mode only) */}
            {ENABLE_AUDIO_METRICS && isConnected && (
              <div className="w-full max-w-md bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  <span>Audio Metrics {USE_ENHANCED_AUDIO && '(Enhanced)'}</span>
                </div>
                {USE_ENHANCED_AUDIO && enhancedAudio ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Buffer Status:</span>
                      <Badge variant={
                        enhancedAudio.bufferHealth === 'good' ? 'default' : 
                        enhancedAudio.bufferHealth === 'warning' ? 'secondary' : 
                        'destructive'
                      } className="text-xs px-2 py-0">
                        {enhancedAudio.bufferHealth}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Playing:</span>
                      <span>{enhancedAudio.isPlaying ? '✅' : '⏸️'}</span>
                    </div>
                  </div>
                ) : audioQueueRef.current && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Chunks Played:</span>
                      <span className="font-mono">{audioQueueRef.current.getMetrics().chunksPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gaps Detected:</span>
                      <span className="font-mono">{audioQueueRef.current.getMetrics().gaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <span className="font-mono">{audioQueueRef.current.getMetrics().errors}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transcriptions */}
          {messages.length > 0 && (
            <div className="bg-muted rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Transcrição
              </h3>
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`text-sm ${
                    msg.role === "user" ? "text-foreground" : "text-primary"
                  }`}>
                    <span className="font-semibold">
                      {msg.role === "user" ? "Você" : personaName}:
                    </span>{" "}
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End Button - Maior no mobile */}
          <div className="flex justify-center">
            <Button
              onClick={handleEndSession}
              variant="destructive"
              size="lg"
              className="gap-2 min-w-[200px] min-h-[56px] text-lg touch-manipulation"
              disabled={isSessionEndedRef.current}
            >
              <PhoneOff className="w-6 h-6" />
              Finalizar Sessão
            </Button>
          </div>
        </div>

        {/* iOS Audio Initialization Modal */}
        {isIOS && !audioInitialized && sessionId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-card p-8 rounded-lg text-center max-w-md w-full">
              <Volume2 className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-4">Iniciar Áudio</h2>
              <p className="text-muted-foreground mb-6">
                Para garantir a melhor experiência no iOS, toque no botão abaixo para inicializar o áudio.
              </p>
              <Button onClick={initializeAudio} size="lg" className="w-full touch-manipulation">
                Inicializar Áudio
              </Button>
            </div>
          </div>
        )}

        {/* Audio Error Alert */}
        {audioError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Problema de áudio detectado:</strong> {audioError}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setAudioError(null);
                  setShowDiagnostics(true);
                }}
              >
                Executar Diagnóstico
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Performance Test & Diagnostics (Dev mode) */}
        {ENABLE_AUDIO_METRICS && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDiagnostics(true)}
                className="flex-1"
              >
                Diagnóstico de Áudio
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPerformanceTest(true)}
                className="flex-1"
              >
                Teste de Performance
              </Button>
            </div>

            {showDiagnostics && (
              <AudioDiagnostics onComplete={() => setShowDiagnostics(false)} />
            )}

            {showPerformanceTest && (
              <AudioPerformanceTest />
            )}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-card rounded-lg p-6">
          <h3 className="font-semibold mb-3">💡 Dicas</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Fale naturalmente, como em uma reunião real</li>
            <li>• O sistema detecta automaticamente quando você termina de falar</li>
            <li>• Evite interromper enquanto a persona está falando</li>
            <li>• Use um ambiente silencioso para melhor experiência</li>
            {ENABLE_AUDIO_METRICS && (
              <li className="text-primary">• Use o Diagnóstico de Áudio para testar seu sistema antes de começar</li>
            )}
          </ul>
        </div>
      </main>

      <SessionSummaryModal
        isOpen={showSummary}
        onClose={() => {
          setShowSummary(false);
          navigate('/dashboard');
        }}
        duration={duration}
        sessionId={sessionId}
      />

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da Sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              A sessão de voz será finalizada. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await handleEndSession();
            }}>
              Sim, Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VoiceChat;
