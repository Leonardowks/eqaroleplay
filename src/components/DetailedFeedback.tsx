import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, CheckCircle2, BarChart3 } from 'lucide-react';
import SubScoresDetail from './SubScoresDetail';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface Competency {
  competency: string;
  score: number;
  sub_scores?: Record<string, number>;
  sub_scores_feedback?: Record<string, string>;
  criterion_approvals?: Record<string, 'approved' | 'rejected' | 'neutral'>;
  feedback: string;
  ai_suggestions?: string[];
  spin_category?: string;
}

interface DetailedFeedbackProps {
  competencies: Competency[];
  meetingType?: string;
  personaDifficulty?: string;
}

const DetailedFeedback = ({ 
  competencies, 
  meetingType, 
  personaDifficulty 
}: DetailedFeedbackProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-accent';
    if (score >= 75) return 'text-secondary';
    if (score >= 60) return 'text-primary';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excelente', variant: 'default' as const };
    if (score >= 75) return { label: 'Bom', variant: 'secondary' as const };
    if (score >= 60) return { label: 'Adequado', variant: 'outline' as const };
    return { label: 'Precisa Melhorar', variant: 'destructive' as const };
  };

  const formatCriterionName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const spinCategoryLabels: Record<string, string> = {
    opening: 'Abertura',
    situation: 'Situação',
    problem: 'Problema',
    implication: 'Implicação',
    need_payoff: 'Valor',
    objection_handling: 'Objeções',
    closing: 'Fechamento',
  };

  return (
    <div className="space-y-6">
      {competencies.map((comp, index) => {
        const radarData = comp.sub_scores
          ? Object.entries(comp.sub_scores).map(([key, value]) => ({
              criterion: formatCriterionName(key),
              score: value,
              fullMark: 100,
            }))
          : [];

        const badge = getScoreBadge(comp.score);

        return (
          <Card key={index} className="p-6 border-border/50 hover:border-primary/30 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{comp.competency}</h3>
                {comp.spin_category && (
                  <Badge variant="outline" className="text-xs">
                    SPIN: {spinCategoryLabels[comp.spin_category] || comp.spin_category}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${getScoreColor(comp.score)}`}>
                    {comp.score}
                  </span>
                  <span className="text-muted-foreground text-lg">/100</span>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </div>

            {/* Radar Chart de Subcritérios */}
            {radarData.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Visão Geral dos Critérios
                  </h4>
                </div>
                <div className="h-56 bg-muted/20 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="criterion"
                        tick={{ 
                          fill: 'hsl(var(--foreground))', 
                          fontSize: 12,
                          fontWeight: 500 
                        }}
                      />
                      <PolarRadiusAxis 
                        domain={[0, 100]} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                      />
                      <Radar
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.5}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Sub-Scores Detalhados */}
            {comp.sub_scores && Object.keys(comp.sub_scores).length > 0 && (
              <div className="mb-6">
                <SubScoresDetail 
                  competencyName={comp.competency}
                  subScores={comp.sub_scores}
                  subScoresFeedback={comp.sub_scores_feedback}
                  criterionApprovals={comp.criterion_approvals}
                />
              </div>
            )}

            {/* Feedback Detalhado */}
            <div className="bg-muted/30 p-4 rounded-lg mb-4 border border-border/30">
              <p className="text-sm leading-relaxed text-foreground">{comp.feedback}</p>
            </div>

            {/* Sugestões de IA */}
            {comp.ai_suggestions && comp.ai_suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Lightbulb className="w-5 h-5" />
                  <span>Sugestões Práticas para Melhorar</span>
                </div>
                <div className="space-y-2">
                  {comp.ai_suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground leading-relaxed">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default DetailedFeedback;