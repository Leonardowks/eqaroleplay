import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Calendar, MessageSquare, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Competency {
  id: string;
  competency_name: string;
  score: number;
  feedback: string | null;
}

const SessionDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && sessionId) {
      loadSessionData();
    }
  }, [user, sessionId]);

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

  const loadSessionData = async () => {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from('roleplay_sessions')
      .select('*, personas(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      toast({
        title: 'Erro',
        description: 'Sessão não encontrada',
        variant: 'destructive',
      });
      navigate('/history');
      return;
    }

    setSession(sessionData);

    const { data: messagesData } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      setMessages(messagesData);
    }

    const { data: competenciesData } = await supabase
      .from('competency_scores')
      .select('*')
      .eq('session_id', sessionId);

    if (competenciesData) {
      setCompetencies(competenciesData);
    }

    setLoading(false);
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cold_call': 'Cold Call',
      'discovery': 'Discovery',
      'demo': 'Demonstração',
      'negotiation': 'Negociação',
      'objection_handling': 'Tratamento de Objeções',
    };
    return labels[type] || type;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/history')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Histórico
        </Button>

        <Breadcrumbs />

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {session.personas?.name}
                </h1>
                <p className="text-muted-foreground">
                  {session.personas?.role} - {session.personas?.company}
                </p>
              </div>
              <Badge variant={session.method === 'voice' ? 'default' : 'secondary'}>
                {session.method === 'voice' ? 'Voz' : 'Texto'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(session.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">{formatDuration(session.duration_seconds || 0)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{getMeetingTypeLabel(session.meeting_type)}</p>
                </div>
              </div>

              {session.overall_score && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pontuação</p>
                    <p className="font-medium">{session.overall_score.toFixed(1)}/100</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {competencies.length > 0 && (
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Competências Avaliadas</h2>
              <div className="space-y-4">
                {competencies.map((comp) => (
                  <div key={comp.id} className="border-l-4 border-primary pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{comp.competency_name}</h3>
                      <span className="text-lg font-semibold text-primary">
                        {comp.score.toFixed(1)}/100
                      </span>
                    </div>
                    {comp.feedback && (
                      <p className="text-sm text-muted-foreground">{comp.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Transcrição da Conversa</h2>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma mensagem gravada nesta sessão
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary/10 ml-auto max-w-[80%]'
                        : 'bg-muted max-w-[80%]'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {msg.role === 'user' ? 'Você' : session.personas?.name}
                    </p>
                    <p className="text-foreground">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/roleplay')} size="lg">
              Fazer Outro Roleplay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
