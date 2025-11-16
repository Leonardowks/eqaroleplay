import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Target, TrendingUp, Clock, Zap, Brain, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recommendation {
  id: string;
  recommendation_type: 'tactical' | 'strategic' | 'behavioral';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_items: string[];
  related_competency?: string;
  expected_impact?: string;
  time_to_implement?: string;
}

interface ActionPlanSectionProps {
  recommendations: Recommendation[];
}

const ActionPlanSection = ({ recommendations }: ActionPlanSectionProps) => {
  const getTypeConfig = (type: Recommendation['recommendation_type']) => {
    const configs = {
      tactical: {
        icon: Zap,
        label: 'Tático',
        description: 'Ação Imediata',
        className: 'bg-warning/10 text-warning border-warning/30'
      },
      strategic: {
        icon: Target,
        label: 'Estratégico',
        description: 'Planejamento',
        className: 'bg-primary/10 text-primary border-primary/30'
      },
      behavioral: {
        icon: Brain,
        label: 'Comportamental',
        description: 'Hábito',
        className: 'bg-secondary/10 text-secondary border-secondary/30'
      }
    };
    return configs[type];
  };

  const getPriorityConfig = (priority: Recommendation['priority']) => {
    const configs = {
      high: {
        label: 'Alta Prioridade',
        className: 'bg-destructive/10 text-destructive border-destructive/30'
      },
      medium: {
        label: 'Prioridade Média',
        className: 'bg-warning/10 text-warning border-warning/30'
      },
      low: {
        label: 'Prioridade Baixa',
        className: 'bg-muted/30 text-muted-foreground border-border'
      }
    };
    return configs[priority];
  };

  // Ordenar por prioridade
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            Plano de Ação Personalizado
          </h3>
          <p className="text-sm text-muted-foreground">
            {recommendations.length} recomendações estruturadas para melhorar sua performance
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {sortedRecommendations.map((rec) => {
          const typeConfig = getTypeConfig(rec.recommendation_type);
          const priorityConfig = getPriorityConfig(rec.priority);
          const TypeIcon = typeConfig.icon;

          return (
            <Card 
              key={rec.id} 
              className={cn(
                "p-6 transition-all hover:shadow-lg",
                rec.priority === 'high' && "border-destructive/30"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    typeConfig.className
                  )}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={typeConfig.className}>
                        {typeConfig.label}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig.className}>
                        {priorityConfig.label}
                      </Badge>
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-1">
                      {rec.title}
                    </h4>
                    {rec.related_competency && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>Relacionado a: {rec.related_competency}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/80 leading-relaxed mb-4 pl-14">
                {rec.description}
              </p>

              {/* Action Items */}
              <div className="bg-accent/5 rounded-lg p-4 mb-4 ml-14">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Passos de Ação
                  </span>
                </div>
                <ul className="space-y-2">
                  {rec.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-foreground/70">
                      <span className="flex-shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 pl-14 text-xs text-muted-foreground">
                {rec.time_to_implement && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{rec.time_to_implement}</span>
                  </div>
                )}
                {rec.expected_impact && (
                  <div className="flex items-center gap-1.5 text-success">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="font-medium">{rec.expected_impact}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground mb-1">
              Comece pelo que tem maior impacto
            </p>
            <p className="text-muted-foreground">
              Priorize as recomendações de <span className="text-destructive font-medium">alta prioridade</span> e 
              do tipo <span className="text-warning font-medium">tático</span> para resultados rápidos nas próximas conversas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ActionPlanSection;
