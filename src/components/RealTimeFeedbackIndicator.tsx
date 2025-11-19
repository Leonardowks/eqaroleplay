import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SPINScores {
  situation: number;
  problem: number;
  implication: number;
  needPayoff: number;
}

export interface FeedbackSuggestion {
  type: 'tip' | 'warning' | 'success';
  message: string;
  competency?: keyof SPINScores;
}

interface RealTimeFeedbackIndicatorProps {
  scores: SPINScores;
  suggestions: FeedbackSuggestion[];
  overallScore: number;
  messageCount: number;
  isAnalyzing?: boolean;
  className?: string;
}

const SPIN_LABELS = {
  situation: { label: 'Situação', short: 'S', description: 'Perguntas sobre contexto atual' },
  problem: { label: 'Problema', short: 'P', description: 'Identificação de dores e dificuldades' },
  implication: { label: 'Implicação', short: 'I', description: 'Consequências dos problemas' },
  needPayoff: { label: 'Necessidade', short: 'N', description: 'Benefícios da solução' },
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-500 bg-green-500/10 border-green-500/30';
  if (score >= 40) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
  return 'text-red-500 bg-red-500/10 border-red-500/30';
};

const getProgressColor = (score: number) => {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

const RealTimeFeedbackIndicator = ({
  scores,
  suggestions,
  overallScore,
  messageCount,
  isAnalyzing = false,
  className
}: RealTimeFeedbackIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(true);

  // Get the most recent/relevant suggestion
  const currentSuggestion = suggestions[suggestions.length - 1];

  // Auto-hide suggestions after 8 seconds
  useEffect(() => {
    if (currentSuggestion) {
      setShowSuggestion(true);
      const timer = setTimeout(() => setShowSuggestion(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [currentSuggestion]);

  return (
    <Card className={cn(
      "border shadow-lg transition-all duration-300",
      isAnalyzing && "animate-pulse",
      className
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Feedback SPIN</span>
          {isAnalyzing && (
            <Badge variant="outline" className="text-xs animate-pulse">
              Analisando...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {messageCount} msgs
          </Badge>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
            getScoreColor(overallScore)
          )}>
            <TrendingUp className="h-3 w-3" />
            {overallScore}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* SPIN Score Indicators */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(SPIN_LABELS) as Array<keyof SPINScores>).map((key) => {
              const score = scores[key];
              const info = SPIN_LABELS[key];
              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border transition-all",
                    getScoreColor(score)
                  )}
                  title={info.description}
                >
                  <span className="text-lg font-bold">{info.short}</span>
                  <span className="text-xs font-medium">{score}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bars */}
          <div className="space-y-2">
            {(Object.keys(SPIN_LABELS) as Array<keyof SPINScores>).map((key) => {
              const score = scores[key];
              const info = SPIN_LABELS[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{info.label}</span>
                    <span className="font-medium">{score}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-500", getProgressColor(score))}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Suggestion */}
          {currentSuggestion && showSuggestion && (
            <div className={cn(
              "flex items-start gap-2 p-2 rounded-lg text-xs transition-all",
              currentSuggestion.type === 'tip' && "bg-blue-500/10 text-blue-700 dark:text-blue-300",
              currentSuggestion.type === 'warning' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
              currentSuggestion.type === 'success' && "bg-green-500/10 text-green-700 dark:text-green-300"
            )}>
              {currentSuggestion.type === 'tip' && <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              {currentSuggestion.type === 'warning' && <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              {currentSuggestion.type === 'success' && <MessageCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              <span>{currentSuggestion.message}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default RealTimeFeedbackIndicator;
