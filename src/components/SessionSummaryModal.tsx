import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, TrendingUp } from 'lucide-react';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number;
  score?: number;
  sessionId: string;
}

const SessionSummaryModal = ({
  isOpen,
  onClose,
  duration,
  score,
  sessionId,
}: SessionSummaryModalProps) => {
  const navigate = useNavigate();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const handleViewDetails = () => {
    navigate(`/history/${sessionId}`);
  };

  const handleNewRoleplay = () => {
    navigate('/roleplay');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sessão Finalizada!</DialogTitle>
          <DialogDescription>
            Confira o resumo da sua sessão de roleplay
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Duração</p>
              <p className="text-lg font-semibold">{formatDuration(duration)}</p>
            </div>
          </div>

          {score && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pontuação</p>
                <p className="text-lg font-semibold">{score.toFixed(1)}/100</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleViewDetails} variant="outline" className="w-full">
            Ver Detalhes
          </Button>
          <Button onClick={handleNewRoleplay} className="w-full">
            Fazer Outro Roleplay
          </Button>
          <Button onClick={handleGoToDashboard} variant="ghost" className="w-full">
            Ir para Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionSummaryModal;
