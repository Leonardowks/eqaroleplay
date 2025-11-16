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
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Histórico de Sessões</h1>
          <p className="text-muted-foreground">
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
                className="p-6 bg-card border-border hover:shadow-glow transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">
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

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(session.overall_score || 0)}`}>
                        {session.overall_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Pontuação</div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye size={16} className="mr-2" />
                        Detalhes
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText size={16} className="mr-2" />
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
