import { Card } from '@/components/ui/card';
import { Trophy, Clock, TrendingUp, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface KPICardsProps {
  totalSessions: number;
  totalTime: number;
  avgScore: number;
  scoreTrend: number;
  bestScore: number;
  worstScore: number;
}

const KPICards = ({ 
  totalSessions, 
  totalTime, 
  avgScore, 
  scoreTrend,
  bestScore,
  worstScore
}: KPICardsProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const getTrendBadge = (trend: number) => {
    if (trend > 0) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
          +{trend.toFixed(1)}%
        </Badge>
      );
    }
    if (trend < 0) {
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
          {trend.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-muted/50">
        0%
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h3 className="text-sm text-muted-foreground font-medium">Total de Chamadas</h3>
        <p className="text-3xl font-bold mt-2">{totalSessions}</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <h3 className="text-sm text-muted-foreground font-medium">Tempo Total</h3>
        <p className="text-3xl font-bold mt-2">{formatTime(totalTime)}</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          {getTrendBadge(scoreTrend)}
        </div>
        <h3 className="text-sm text-muted-foreground font-medium">Score Médio</h3>
        <p className="text-3xl font-bold mt-2">{avgScore.toFixed(1)}/100</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <h3 className="text-sm text-muted-foreground font-medium">Melhor / Pior</h3>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {bestScore.toFixed(0)}
          </p>
          <span className="text-muted-foreground">/</span>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
            {worstScore.toFixed(0)}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default KPICards;
