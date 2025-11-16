import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from "@/utils/RealtimeAudio";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import Header from "@/components/Header";

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

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);

      const wsUrl = `wss://wzronlqzkxqzohugajvz.supabase.co/functions/v1/realtime-voice?sessionId=${sessionId}&personaId=${personaId}&meetingType=${meetingType}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
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
          toast({
            title: "Erro",
            description: data.error || "Erro na conexão",
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
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
    stopRecording();
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    audioQueueRef.current?.clear();
    
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    if (sessionId) {
      const durationSeconds = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      
      await supabase
        .from("roleplay_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          overall_score: 75,
        })
        .eq("id", sessionId);
    }

    toast({
      title: "Sessão Finalizada",
      description: "Redirecionando para o dashboard...",
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 1500);
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
        <div className="bg-card rounded-lg shadow-lg p-8">
          {/* Header Info */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{personaName}</h1>
            <p className="text-muted-foreground capitalize">{meetingType.replace("_", " ")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Duração: {formatDuration(duration)}
            </p>
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
    </div>
  );
};

export default VoiceChat;
