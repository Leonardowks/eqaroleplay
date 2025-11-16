import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Ranking = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myStats, setMyStats] = useState({
    position: 0,
    avgScore: 0,
    totalSessions: 0,
    trend: 'up' as 'up' | 'down',
  });

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
    loadMyStats(user.id);
  };

  const loadMyStats = async (userId: string) => {
    const { data: sessions } = await supabase
      .from('roleplay_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (sessions && sessions.length > 0) {
      const avgScore = sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / sessions.length;
      setMyStats({
        position: 5, // Mock position
        avgScore: parseFloat(avgScore.toFixed(1)),
        totalSessions: sessions.length,
        trend: 'up',
      });
    }
  };

  // Mock ranking data
  const mockRanking = [
    { position: 1, name: 'Ana Silva', sessions: 45, avgScore: 9.2, bestCompetency: 'Fechamento' },
    { position: 2, name: 'Carlos Mendes', sessions: 38, avgScore: 8.9, bestCompetency: 'Descoberta' },
    { position: 3, name: 'Beatriz Costa', sessions: 42, avgScore: 8.7, bestCompetency: 'Valor' },
    { position: 4, name: 'Diego Santos', sessions: 35, avgScore: 8.5, bestCompetency: 'Objeções' },
    { position: 5, name: profile?.full_name || 'Você', sessions: myStats.totalSessions, avgScore: myStats.avgScore, bestCompetency: 'IA' },
    { position: 6, name: 'Elena Rodrigues', sessions: 30, avgScore: 8.2, bestCompetency: 'Proposta' },
    { position: 7, name: 'Felipe Alves', sessions: 28, avgScore: 8.0, bestCompetency: 'Descoberta' },
  ];

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (position === 2) return <Medal className="text-gray-400" size={24} />;
    if (position === 3) return <Medal className="text-orange-600" size={24} />;
    return <span className="text-muted-foreground font-bold">#{position}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Ranking</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Veja como você se compara com outros vendedores.
          </p>
        </div>

        {/* My Performance Card */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-gradient-secondary text-white">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Meu Desempenho</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">#{myStats.position}</div>
              <div className="text-sm opacity-90">Posição Atual</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{myStats.avgScore.toFixed(1)}</div>
              <div className="text-sm opacity-90">Pontuação Média</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{myStats.totalSessions}</div>
              <div className="text-sm opacity-90">Total de Sessões</div>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <TrendingUp className="mb-2" size={32} />
              <div className="text-sm opacity-90">Em Evolução</div>
            </div>
          </div>
        </Card>

        {/* Ranking Table */}
        <Card className="p-4 sm:p-6 bg-card border-border">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Ranking Geral</h2>
          <div className="space-y-3">
            {mockRanking.map((rank) => {
              const isCurrentUser = rank.position === myStats.position;
              return (
                <div
                  key={rank.position}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition ${
                    isCurrentUser
                      ? 'bg-primary/10 ring-2 ring-primary'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="w-10 sm:w-12 flex items-center justify-center flex-shrink-0">
                    {getPositionIcon(rank.position)}
                  </div>

                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm">
                      {rank.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base truncate">{rank.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {rank.sessions} sessões
                    </div>
                  </div>

                  <div className="text-center hidden sm:block flex-shrink-0">
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-xs">
                      {rank.bestCompetency}
                    </Badge>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-2xl font-bold text-primary">
                      {rank.avgScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">média</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 sm:p-6 mt-6 sm:mt-8 bg-muted/30">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            💡 <strong>Dica:</strong> Complete mais sessões e melhore suas pontuações para subir no ranking!
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Ranking;
