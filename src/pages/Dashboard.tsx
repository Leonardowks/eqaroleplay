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
import KPICards from '@/components/KPICards';
import { generatePerformanceReport } from '@/utils/pdfGenerator';
import { generateTechnicalDocumentation } from '@/utils/technicalDocGenerator';
import { FileText, Download } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useBranding } from '@/contexts/BrandingContext';

// Lazy load chart component to reduce initial bundle
const CompetencyChart = lazy(() => import('@/components/CompetencyChart'));

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyConfig, organization } = useTenantContext();
  const { branding } = useBranding();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgDuration: 0,
    avgScore: 0,
    evolution: 0,
    bestScore: 0,
    worstScore: 0,
    totalTime: 0,
    scoreTrend: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [competencyData, setCompetencyData] = useState<any[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [competencyEvolution, setCompetencyEvolution] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

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

    if (sessions && sessions.length > 0) {
      // Get recent sessions
      const recent = sessions
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .slice(0, 5);
      setRecentSessions(recent);
      
      const totalSessions = sessions.length;
      const totalTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
      const avgDuration = totalTime / totalSessions || 0;
      const avgScore = sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / totalSessions || 0;
      
      const scores = sessions.map(s => s.overall_score || 0).filter(s => s > 0);
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
      
      const sortedByDate = [...sessions].sort((a, b) => 
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
      const recentScores = sortedByDate.slice(0, 5).map(s => s.overall_score || 0);
      const previousScores = sortedByDate.slice(5, 10).map(s => s.overall_score || 0);
      
      let scoreTrend = 0;
      if (recentScores.length > 0 && previousScores.length > 0) {
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const previousAvg = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
        scoreTrend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
      }
      
      setStats({
        totalSessions,
        avgDuration: Math.round(avgDuration),
        avgScore: parseFloat(avgScore.toFixed(1)),
        evolution: 12.5,
        bestScore,
        worstScore,
        totalTime,
        scoreTrend: parseFloat(scoreTrend.toFixed(1)),
      });
    }

    // Load competency scores from database
    const { data: competencyScores } = await supabase
      .from('competency_scores')
      .select(`
        competency_name,
        score,
        roleplay_sessions!inner (
          user_id,
          status
        )
      `)
      .eq('roleplay_sessions.user_id', user.id)
      .eq('roleplay_sessions.status', 'completed');

    if (!competencyScores || competencyScores.length === 0) {
      setCompetencyData([]);
    } else {
      const grouped = competencyScores.reduce((acc, item) => {
        if (!acc[item.competency_name]) {
          acc[item.competency_name] = [];
        }
        acc[item.competency_name].push(item.score);
        return acc;
      }, {} as Record<string, number[]>);

      const chartData = Object.entries(grouped).map(([name, scores]) => ({
        competency: name,
        score: (scores.reduce((a, b) => a + b, 0) / scores.length) / 10,
        fullMark: 10,
      }));

      setCompetencyData(chartData);
    }

    // Load competency evolution data
    loadCompetencyEvolution();
    // Load heatmap data
    loadHeatmapData();
  };

  const loadCompetencyEvolution = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('competency_scores')
      .select(`
        session_id,
        score,
        competency_name,
        roleplay_sessions!inner (
          completed_at,
          user_id
        )
      `)
      .eq('roleplay_sessions.user_id', user.id)
      .order('roleplay_sessions.completed_at', { ascending: true });

    if (!data || data.length === 0) {
      setCompetencyEvolution([]);
      return;
    }

    // Group by date and competency_name
    const grouped: Record<string, Record<string, number[]>> = {};
    
    data.forEach((item: any) => {
      const date = new Date(item.roleplay_sessions.completed_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      
      if (!grouped[date]) {
        grouped[date] = {};
      }
      
      const compName = item.competency_name;
      if (!grouped[date][compName]) {
        grouped[date][compName] = [];
      }
      grouped[date][compName].push(item.score);
    });

    // Calculate averages
    const evolutionData = Object.entries(grouped).map(([date, competencies]) => {
      const entry: any = { date };
      Object.entries(competencies).forEach(([name, scores]) => {
        entry[name] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      });
      return entry;
    });

    setCompetencyEvolution(evolutionData);
  };

  const loadHeatmapData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('competency_scores')
      .select(`
        competency_name,
        score,
        roleplay_sessions!inner (
          meeting_type,
          user_id
        )
      `)
      .eq('roleplay_sessions.user_id', user.id);

    if (!data || data.length === 0) {
      setHeatmapData([]);
      return;
    }

    // Group by meeting_type and competency_name
    const grouped: Record<string, Record<string, number[]>> = {};
    
    data.forEach((item: any) => {
      const type = item.roleplay_sessions.meeting_type;
      if (!grouped[type]) {
        grouped[type] = {};
      }
      
      const compName = item.competency_name;
      if (!grouped[type][compName]) {
        grouped[type][compName] = [];
      }
      grouped[type][compName].push(item.score);
    });

    // Calculate averages
    const result = Object.entries(grouped).map(([meetingType, competencies]) => {
      const output: any = { meetingType };
      Object.entries(competencies).forEach(([name, scores]) => {
        output[name] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      });
      return output;
    });

    setHeatmapData(result);
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

  const handleGenerateReport = async () => {
    if (!user || !profile) return;
    
    setGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data && data.analysis) {
        generatePerformanceReport(data, profile.full_name);
        toast({
          title: "Relatório gerado!",
          description: "Seu relatório PDF foi baixado com sucesso.",
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
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

  // Dynamic chart colors
  const CHART_COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
    '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57',
  ];

  // Get competency names from config
  const competencyNames = companyConfig.competencies;

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-6 py-8">
        {/* Welcome section */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Olá, {profile?.full_name || 'Usuário'}! 👋
            </h1>
            <p className="text-muted-foreground">
              {organization?.name ? `${organization.name} • ` : ''}
              Metodologia: {companyConfig.methodology} • Acompanhe seu progresso e desempenho
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleGenerateReport} 
              disabled={generatingReport || stats.totalSessions === 0}
              className="gap-2"
            >
              {generatingReport ? (
                <>
                  <Download className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Relatório de Performance
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => generateTechnicalDocumentation()}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Documentação Técnica
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 sm:mb-8">
          <KPICards
            totalSessions={stats.totalSessions}
            totalTime={stats.totalTime}
            avgScore={stats.avgScore}
            scoreTrend={stats.scoreTrend}
            bestScore={stats.bestScore}
            worstScore={stats.worstScore}
          />
        </div>

        {/* Competency Evolution Chart - dynamic */}
        {competencyEvolution.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Evolução de Competências</h2>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {/* Evolution data available - competency names are dynamic */}
                <p>Dados de evolução carregados para {competencyNames.length} competências</p>
              </div>
            </Card>
          </div>
        )}

        {/* Competency Heatmap - now dynamic */}
        {heatmapData.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <CompetencyHeatmap data={heatmapData} competencyNames={competencyNames} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Radar Chart */}
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Competências — {companyConfig.methodology}</h3>
            <div className="h-[300px] sm:h-[400px]">
              {competencyData.length > 0 ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-full h-full" />
                  </div>
                }>
                  <CompetencyChart data={competencyData} />
                </Suspense>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Complete sua primeira sessão para visualizar suas competências
                  </p>
                  <Button onClick={() => navigate('/roleplay')}>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Sessão
                  </Button>
                </div>
              )}
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
