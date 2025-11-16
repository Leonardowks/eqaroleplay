import { useEffect, useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from "@/utils/RealtimeAudio";
import { Mic, MicOff, PhoneOff, Volume2, ArrowLeft, Clock, Wifi, WifiOff } from "lucide-react";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import SessionSummaryModal from "@/components/SessionSummaryModal";

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

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isReconnectingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting - cleaning up resources");
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        stopRecording();
        audioQueueRef.current?.clear();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
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
    
    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await connectWebSocket(sessionData.id, state.personaId, state.meetingType);
    } catch (error) {
      toast({
        title: "Permissão Negada",
        description: "É necessário permitir o acesso ao microfone",
        variant: "destructive",
      });
      navigate("/roleplay");
    }
  };

  const connectWebSocket = async (sessionId: string, personaId: string, meetingType: string) => {
    try {
      // Clean up previous resources if they exist
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
      audioQueueRef.current?.clear();

      // Initialize new audio context and queue
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);

      const wsUrl = `wss://wzronlqzkxqzohugajvz.supabase.co/functions/v1/realtime-voice?sessionId=${sessionId}&personaId=${personaId}&meetingType=${meetingType}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionAttempts(0); // Reset on successful connection
        isReconnectingRef.current = false;
        startRecording();
        
        toast({
          title: "Conectado",
          description: "Você pode começar a falar",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Received event:", data.type);

        if (data.type === "response.audio.delta") {
          setIsSpeaking(true);
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await audioQueueRef.current?.addToQueue(bytes);
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
          console.error("WebSocket error:", data.error);
          
          // Safely extract error message, ensuring it's always a string
          let errorMessage = "Erro na conexão";
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error && typeof data.error === 'object') {
            errorMessage = data.error.message || JSON.stringify(data.error);
          }
          
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao servidor de voz",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket closed");
        setIsConnected(false);
        stopRecording();

        // Only attempt reconnection if not already reconnecting and haven't exceeded attempts
        if (connectionAttempts < 3 && !isReconnectingRef.current) {
          isReconnectingRef.current = true;
          console.log(`Attempting reconnection (${connectionAttempts + 1}/3)...`);
          
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connectWebSocket(sessionId, personaId, meetingType)
              .catch((err) => {
                console.error("Reconnection failed:", err);
                isReconnectingRef.current = false;
              });
          }, 2000);
        } else if (connectionAttempts >= 3) {
          toast({
            title: "Conexão Perdida",
            description: "Não foi possível reconectar. Por favor, tente novamente.",
            variant: "destructive",
          });
        }
      };
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
      toast({
        title: "Erro",
        description: "Não foi possível estabelecer conexão",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    try {
      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
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
      toast({
        title: "Erro",
        description: "Não foi possível iniciar gravação",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleEndSession = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      stopRecording();
      
      if (audioQueueRef.current) {
        audioQueueRef.current.clear();
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
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

      // Trigger AI evaluation
      try {
        await supabase.functions.invoke('evaluate-competencies', {
          body: { sessionId },
        });
      } catch (err) {
        console.error('Error evaluating:', err);
      }
    }

    setShowSummary(true);
  };

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
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-mono text-xl font-bold">{formatDuration(duration)}</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{personaName}</h1>
            <p className="text-muted-foreground capitalize">{meetingType.replace("_", " ")}</p>
          </div>

          {/* Status Visual */}
          <div className="flex flex-col items-center justify-center space-y-6 mb-8">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
              isSpeaking 
                ? "bg-primary animate-pulse shadow-lg shadow-primary/50" 
                : isRecording 
                ? "bg-secondary animate-pulse" 
                : "bg-muted"
            }`}>
              {isSpeaking ? (
                <Volume2 className="w-16 h-16 text-primary-foreground" />
              ) : isRecording ? (
                <Mic className="w-16 h-16 text-secondary-foreground" />
              ) : (
                <MicOff className="w-16 h-16 text-muted-foreground" />
              )}
            </div>

            <div className="text-center">
              {isSpeaking && (
                <p className="text-lg font-medium text-primary">
                  {personaName} está falando...
                </p>
              )}
              {!isSpeaking && isRecording && (
                <p className="text-lg font-medium text-secondary">
                  Você pode falar...
                </p>
              )}
              {!isConnected && (
                <p className="text-lg font-medium text-muted-foreground">
                  Conectando...
                </p>
              )}
            </div>
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

          {/* End Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleEndSession}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              Finalizar Sessão
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-card rounded-lg p-6">
          <h3 className="font-semibold mb-3">💡 Dicas</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Fale naturalmente, como em uma reunião real</li>
            <li>• O sistema detecta automaticamente quando você termina de falar</li>
            <li>• Evite interromper enquanto a persona está falando</li>
            <li>• Use um ambiente silencioso para melhor experiência</li>
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
