import { Badge } from '@/components/ui/badge';
import { 
  Rocket, Trophy, Award, Crown, Star, Zap, Search, 
  AlertTriangle, TrendingUp, Target, Shield, CheckCircle, 
  Flame 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementBadgeProps {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'performance' | 'consistency' | 'mastery';
  badgeColor?: string;
  rewardPoints?: number;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  className?: string;
}

const iconMap: Record<string, any> = {
  Rocket, Trophy, Award, Crown, Star, Zap, Search,
  AlertTriangle, TrendingUp, Target, Shield, CheckCircle, Flame
};

const AchievementBadge = ({
  name,
  description,
  icon,
  category,
  badgeColor = 'primary',
  rewardPoints,
  size = 'md',
  showPoints = false,
  className
}: AchievementBadgeProps) => {
  const IconComponent = iconMap[icon] || Trophy;

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const categoryConfig = {
    milestone: {
      label: 'Marco',
      bgClass: 'bg-primary/10 border-primary/30',
      iconClass: 'text-primary'
    },
    performance: {
      label: 'Performance',
      bgClass: 'bg-warning/10 border-warning/30',
      iconClass: 'text-warning'
    },
    consistency: {
      label: 'Consistência',
      bgClass: 'bg-destructive/10 border-destructive/30',
      iconClass: 'text-destructive'
    },
    mastery: {
      label: 'Maestria',
      bgClass: 'bg-accent/10 border-accent/30',
      iconClass: 'text-accent'
    }
  };

  const config = categoryConfig[category];

  return (
    <div 
      className={cn(
        "relative rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg",
        config.bgClass,
        sizeClasses[size],
        className
      )}
    >
      <div className="flex flex-col items-center text-center space-y-2">
        <div className={cn(
          "rounded-full p-3",
          config.bgClass
        )}>
          <IconComponent className={cn(iconSizes[size], config.iconClass)} />
        </div>
        
        <div>
          <h4 className="font-bold text-foreground">{name}</h4>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>

        <Badge variant="outline" className={cn("text-xs", config.bgClass)}>
          {config.label}
        </Badge>

        {showPoints && rewardPoints && (
          <div className="text-xs font-semibold text-warning flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span>+{rewardPoints} pts</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementBadge;
