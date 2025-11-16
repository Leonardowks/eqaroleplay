import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Users, TrendingUp, Clock, Target } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSessions: 0,
    avgScore: 0,
    activeToday: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total sessions
      const { count: sessionsCount } = await supabase
        .from('roleplay_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Average score
      const { data: sessions } = await supabase
        .from('roleplay_sessions')
        .select('overall_score')
        .eq('status', 'completed')
        .not('overall_score', 'is', null);

      const avgScore = sessions?.length
        ? sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / sessions.length
        : 0;

      // Active today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: activeUsers } = await supabase
        .from('roleplay_sessions')
        .select('user_id')
        .gte('started_at', today.toISOString());

      const uniqueActive = new Set(activeUsers?.map(s => s.user_id)).size;

      setStats({
        totalUsers: usersCount || 0,
        totalSessions: sessionsCount || 0,
        avgScore: parseFloat(avgScore.toFixed(1)),
        activeToday: uniqueActive,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Painel Administrativo</h1>
        <p className="text-muted-foreground">Visão geral do sistema EQA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card border-border hover:shadow-glow transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Usuários</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:shadow-glow transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Sessões</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalSessions}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-secondary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:shadow-glow transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pontuação Média</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgScore}/10</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border hover:shadow-glow transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ativos Hoje</p>
              <p className="text-3xl font-bold text-foreground">{stats.activeToday}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Informações do Sistema</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Sistema de gestão e análise de treinamentos de vendas</p>
          <p>Metodologia SPIN Selling com foco em automação de IA</p>
          <p>Acesso completo aos dados de usuários, sessões e competências</p>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
