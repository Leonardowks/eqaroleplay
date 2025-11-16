import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const History = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

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
    loadSessions(user.id);
  };

  const loadSessions = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('roleplay_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (data) {
      setSessions(data);
    }
    setLoading(false);
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prospection: '🎯 Prospecção',
      discovery: '🤝 Descoberta',
      presentation: '💡 Apresentação',
      negotiation: '📊 Negociação',
    };
    return labels[type] || type;
  };

  const getMethodBadge = (method: string) => {
    return method === 'text' ? (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
        Texto
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30">
        Voz
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-accent';
    if (score >= 6) return 'text-primary';
    if (score >= 4) return 'text-secondary';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Histórico de Sessões</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Revise suas sessões anteriores e acompanhe seu progresso.
          </p>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando sessões...</p>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Você ainda não completou nenhuma sessão.
            </p>
            <Button onClick={() => navigate('/roleplay')}>
              Iniciar Primeiro Roleplay
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="p-4 sm:p-6 bg-card border-border hover:shadow-glow transition-shadow"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-bold">
                        {getMeetingTypeLabel(session.meeting_type)}
                      </h3>
                      {getMethodBadge(session.method)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>
                        📅 {format(new Date(session.completed_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </span>
                      <span>
                        🕐 {format(new Date(session.completed_at), 'HH:mm', { locale: ptBR })}
                      </span>
                      <span>
                        ⏱️ {Math.floor(session.duration_seconds / 60)}min {session.duration_seconds % 60}s
                      </span>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="text-center px-4 py-2 bg-muted/30 rounded-lg flex-shrink-0">
                      <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(session.overall_score || 0)}`}>
                        {session.overall_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Pontuação</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/history/${session.id}`)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="mr-2" size={16} />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/history/${session.id}`)}
                        className="w-full sm:w-auto"
                      >
                        <FileText className="mr-2" size={16} />
                        Transcrição
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
