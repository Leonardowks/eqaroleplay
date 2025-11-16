import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface SubScoresDetailProps {
  subScores: Record<string, number>;
  subScoresFeedback?: Record<string, string>;
}

const SubScoresDetail = ({ subScores, subScoresFeedback }: SubScoresDetailProps) => {
  const formatCriterionName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-600 dark:bg-green-400';
    if (score >= 60) return 'bg-yellow-600 dark:bg-yellow-400';
    return 'bg-red-600 dark:bg-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excelente', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' };
    if (score >= 80) return { label: 'Muito Bom', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' };
    if (score >= 70) return { label: 'Bom', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' };
    if (score >= 60) return { label: 'Adequado', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' };
    if (score >= 50) return { label: 'Regular', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' };
    return { label: 'Precisa Melhorar', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' };
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Análise Detalhada por Critério
      </h4>
      <div className="grid gap-4">
        {Object.entries(subScores).map(([key, score]) => {
          const badge = getScoreBadge(score);
          const feedback = subScoresFeedback?.[key];
          
          return (
            <Card key={key} className="p-4 bg-muted/20 border-border/50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {getScoreIcon(score)}
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1">
                      {formatCriterionName(key)}
                    </h5>
                    {feedback && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feedback}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <span className={`text-xl font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${getProgressColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span className="font-medium">Pontuação: {score}/100</span>
                  <span>100</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubScoresDetail;
