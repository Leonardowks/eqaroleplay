import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, AlertCircle, Zap } from 'lucide-react';

interface AudioMetrics {
  chunksPlayed: number;
  totalLatency: number;
  gaps: number;
  errors: number;
  avgDecodeTime: number;
}

interface AudioMetricsDashboardProps {
  getMetrics: () => AudioMetrics;
  bufferHealth: 'good' | 'warning' | 'critical' | 'idle';
  isVisible?: boolean;
}

export const AudioMetricsDashboard = ({ 
  getMetrics, 
  bufferHealth,
  isVisible = true 
}: AudioMetricsDashboardProps) => {
  const [metrics, setMetrics] = useState<AudioMetrics>(getMetrics());

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [getMetrics, isVisible]);

  if (!isVisible) return null;

  const avgLatency = metrics.chunksPlayed > 0 
    ? (metrics.totalLatency / metrics.chunksPlayed).toFixed(0) 
    : '0';

  const errorRate = metrics.chunksPlayed > 0
    ? ((metrics.errors / metrics.chunksPlayed) * 100).toFixed(1)
    : '0';

  const getBufferHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'warning': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="border-border/50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Audio Metrics (Dev Mode)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Buffer Health */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Buffer Health</span>
          <Badge 
            variant="outline" 
            className={`${getBufferHealthColor(bufferHealth)} capitalize`}
          >
            {bufferHealth}
          </Badge>
        </div>

        {/* Average Latency */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Avg Latency
          </span>
          <span className="text-sm font-mono text-foreground">
            {avgLatency}ms
          </span>
        </div>

        {/* Chunks Played */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Chunks Played
          </span>
          <span className="text-sm font-mono text-foreground">
            {metrics.chunksPlayed}
          </span>
        </div>

        {/* Gaps Detected */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Gaps Detected</span>
          <span className={`text-sm font-mono ${metrics.gaps > 5 ? 'text-yellow-400' : 'text-foreground'}`}>
            {metrics.gaps}
          </span>
        </div>

        {/* Error Rate */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error Rate
          </span>
          <span className={`text-sm font-mono ${parseFloat(errorRate) > 5 ? 'text-red-400' : 'text-foreground'}`}>
            {errorRate}%
          </span>
        </div>

        {/* Avg Decode Time */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Avg Decode</span>
          <span className="text-sm font-mono text-foreground">
            {metrics.avgDecodeTime.toFixed(1)}ms
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
