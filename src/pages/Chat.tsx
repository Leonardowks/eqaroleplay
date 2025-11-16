import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'persona';
  content: string;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [personaName, setPersonaName] = useState<string>('');
  const [meetingType, setMeetingType] = useState<string>('');
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    checkUser();
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);
  };

  const initializeSession = async () => {
    const state = location.state as any;
    if (!state?.personaId || !state?.meetingType) {
      toast({
        title: 'Erro',
        description: 'Informações da sessão não encontradas',
        variant: 'destructive',
      });
      navigate('/roleplay');
      return;
    }

    setPersonaId(state.personaId);
    setPersonaName(state.personaName);
    setMeetingType(state.meetingType);

    // Create new session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: session, error } = await supabase
      .from('roleplay_sessions')
      .insert({
        user_id: user.id,
        persona_id: state.personaId,
        meeting_type: state.meetingType,
        method: state.method,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a sessão',
        variant: 'destructive',
      });
      navigate('/roleplay');
      return;
    }

    setSessionId(session.id);
    setSessionStartTime(new Date(session.started_at));

    // Send initial greeting from persona
    await sendInitialGreeting(session.id, state.personaId);
  };

  const sendInitialGreeting = async (sessionId: string, personaId: string) => {
    const greetings = [
      'Olá! Como posso ajudá-lo hoje?',
      'Oi, tudo bem? Você tem alguns minutos para conversarmos?',
      'Bom dia! Em que posso ser útil?',
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    const { error } = await supabase
      .from('session_messages')
      .insert({
        session_id: sessionId,
        role: 'persona',
        content: greeting,
      });

    if (!error) {
      setMessages([{
        id: crypto.randomUUID(),
        role: 'persona',
        content: greeting,
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !sessionId || !personaId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Show typing indicator
      setIsTyping(true);

      const { data, error } = await supabase.functions.invoke('chat-roleplay', {
        body: {
          message: userMessage,
          personaId,
          sessionId,
        },
      });

      setIsTyping(false);

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Add persona response to UI
      const personaMessage: Message = {
        id: crypto.randomUUID(),
        role: 'persona',
        content: data.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, personaMessage]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    const duration = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);

    const { error } = await supabase
      .from('roleplay_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        overall_score: 7.5, // Mock score for now
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session:', error);
    }

    toast({
      title: 'Sessão finalizada!',
      description: `Duração: ${Math.floor(duration / 60)}min ${duration % 60}s`,
    });

    navigate('/dashboard');
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prospection: '🎯 Prospecção Inicial',
      discovery: '🤝 Reunião de Descoberta',
      presentation: '💡 Apresentação de Solução',
      negotiation: '📊 Negociação Comercial',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="flex-1 container mx-auto px-6 py-8 flex flex-col">
        {/* Session Info */}
        <Card className="p-4 mb-6 bg-card border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{personaName}</h2>
            <p className="text-sm text-muted-foreground">{getMeetingTypeLabel(meetingType)}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleEndSession}>
            <X size={16} className="mr-2" />
            Finalizar Sessão
          </Button>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 p-6 bg-card border-border flex flex-col overflow-hidden mb-6">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl px-4 py-3 max-w-[70%]">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </form>
        </Card>

        {/* Tips */}
        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Dica:</strong> Seja natural e autêntico. A IA está avaliando suas técnicas de vendas em tempo real.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Chat;
