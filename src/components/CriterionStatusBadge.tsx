import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CriterionStatus = 'approved' | 'rejected' | 'neutral';

interface CriterionStatusBadgeProps {
  status: CriterionStatus;
  className?: string;
}

const CriterionStatusBadge = ({ status, className }: CriterionStatusBadgeProps) => {
  const statusConfig = {
    approved: {
      icon: CheckCircle2,
      label: 'Aprovado',
      className: 'text-success border-success/30 bg-success/10'
    },
    rejected: {
      icon: XCircle,
      label: 'Reprovado',
      className: 'text-destructive border-destructive/30 bg-destructive/10'
    },
    neutral: {
      icon: MinusCircle,
      label: 'Parcial',
      className: 'text-warning border-warning/30 bg-warning/10'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
        config.className,
        className
      )}
      title={config.label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </div>
  );
};

export default CriterionStatusBadge;
