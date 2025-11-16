import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Trophy, Clock, Target, TrendingUp, Play, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Lazy load chart component to reduce initial bundle
const CompetencyChart = lazy(() => import('@/components/CompetencyChart'));

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgDuration: 0,
    avgScore: 0,
    evolution: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [competencyData, setCompetencyData] = useState<any[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);

  useEffect(() => {
    checkUser();
    loadDashboardData();
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
  };

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load sessions stats
    const { data: sessions } = await supabase
      .from('roleplay_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // Load active sessions count
    const { data: activeSessions } = await supabase
      .from('roleplay_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    setActiveSessionsCount(activeSessions?.length || 0);

    if (sessions) {
      // Get recent sessions
      const recent = sessions
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .slice(0, 5);
      setRecentSessions(recent);
      
      const totalSessions = sessions.length;
      const avgDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / totalSessions || 0;
      const avgScore = sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / totalSessions || 0;
      
      setStats({
        totalSessions,
        avgDuration: Math.round(avgDuration),
        avgScore: parseFloat(avgScore.toFixed(1)),
        evolution: 12.5, // Mocked for now
      });
    }

    // Load competency scores
    const competencies = [
      'Descoberta de Processos',
      'Identificação de Dor',
      'Apresentação de Valor',
      'Técnicas de IA',
      'Gestão de Objeções',
      'Proposta Comercial',
      'Fechamento',
    ];

    // Mock data for now
    const mockData = competencies.map(name => ({
      competency: name,
      score: Math.random() * 10,
      fullMark: 10,
    }));
    
    setCompetencyData(mockData);
  };

  // Cleanup orphaned sessions
  const cleanupSessions = async () => {
    if (!user) return;
    
    setIsCleaningUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('cleanup-sessions', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error cleaning sessions:', error);
        toast({
          title: "Erro ao limpar sessões",
          description: "Não foi possível limpar as sessões órfãs.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sessões limpas",
        description: data.message || "Sessões órfãs finalizadas com sucesso.",
      });

      // Reload dashboard data
      loadDashboardData();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao limpar as sessões.",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Memoize meeting type labels for better performance
  const getMeetingTypeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      prospection: 'Prospecção',
      discovery: 'Descoberta',
      presentation: 'Apresentação',
      negotiation: 'Negociação',
    };
    return (type: string) => labels[type] || type;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-6 py-8">
        {/* Welcome section */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Olá, {profile?.full_name || 'Vendedor'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Confira seu desempenho e continue treinando.
            </p>
          </div>
          <div className="flex gap-2">
            {activeSessionsCount > 0 && (
              <Button 
                onClick={() => navigate('/active-sessions')}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Clock className="w-4 h-4" />
                {activeSessionsCount} Sessão(ões) Ativa(s)
              </Button>
            )}
            <Button 
              onClick={cleanupSessions}
              variant="outline"
              size="sm"
              disabled={isCleaningUp}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isCleaningUp ? 'Limpando...' : 'Limpar Órfãs'}
            </Button>
          </div>
        </div>

        {/* Metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                <Play className="text-primary" size={20} />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1">{stats.totalSessions}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Sessões Realizadas</p>
          </Card>

          <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-secondary/10 rounded-lg">
                <Clock className="text-secondary" size={20} />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1">{Math.floor(stats.avgDuration / 60)}min</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Duração Média</p>
          </Card>

          <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-accent/10 rounded-lg">
                <Trophy className="text-accent" size={20} />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1">{stats.avgScore.toFixed(1)}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Pontuação Geral</p>
          </Card>

          <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-glow transition-shadow">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="text-primary" size={20} />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1 text-primary">+{stats.evolution}%</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Taxa de Evolução</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Radar Chart */}
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Competências</h3>
            <div className="h-[300px] sm:h-[400px]">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-full" />
                </div>
              }>
                <CompetencyChart data={competencyData} />
              </Suspense>
            </div>
          </Card>

          {/* Recent sessions */}
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Últimas Sessões</h3>
            <div className="space-y-3 sm:space-y-4">
              {recentSessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma sessão completada ainda. Comece a treinar!
                </p>
              ) : (
                recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition gap-2 sm:gap-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium mb-1 text-sm sm:text-base">
                        {getMeetingTypeLabel(session.meeting_type)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(session.completed_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-bold text-primary">
                        {session.overall_score?.toFixed(1) || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.method === 'text' ? 'Texto' : 'Voz'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* CTA */}
        <Card className="p-8 bg-gradient-primary text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Pronto para treinar?</h2>
          <p className="mb-6 opacity-90">
            Escolha uma persona e comece um novo roleplay agora mesmo.
          </p>
          <button
            onClick={() => navigate('/roleplay')}
            className="px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-opacity-90 transition"
          >
            Iniciar Roleplay
          </button>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
