import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RankingUser {
  position: number;
  name: string;
  sessions: number;
  avgScore: number;
  bestCompetency: string;
  user_id?: string;
}

const Ranking = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
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
    await loadRankingData(user.id);
    setLoading(false);
  };

  const loadRankingData = async (userId: string) => {
    try {
      // Load ranking from advanced_rankings view
      const { data: rankingData, error } = await supabase
        .from('advanced_rankings')
        .select('*')
        .order('avg_score', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading ranking:', error);
        return;
      }

      if (rankingData && rankingData.length > 0) {
        const formattedRanking: RankingUser[] = rankingData.map((r: any, index: number) => ({
          position: index + 1,
          name: r.full_name || 'Usuário',
          sessions: r.total_sessions || 0,
          avgScore: parseFloat((r.avg_score || 0).toFixed(1)),
          bestCompetency: r.best_competency || 'N/A',
          user_id: r.user_id,
        }));

        setRanking(formattedRanking);

        // Find current user's position
        const userPosition = formattedRanking.findIndex(r => r.user_id === userId);
        if (userPosition !== -1) {
          const userRank = formattedRanking[userPosition];
          setMyStats({
            position: userPosition + 1,
            avgScore: userRank.avgScore,
            totalSessions: userRank.sessions,
            trend: 'up',
          });
        }
      }
    } catch (error) {
      console.error('Error loading ranking data:', error);
    }
  };

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
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando ranking...</div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário no ranking ainda.</div>
          ) : (
          <div className="space-y-3">
            {ranking.map((rank) => {
              const isCurrentUser = rank.user_id === user?.id;
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
          )}
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
