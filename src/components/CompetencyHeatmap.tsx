import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface HeatmapData {
  meetingType: string;
  situation?: number;
  problem?: number;
  implication?: number;
  need_payoff?: number;
}

interface CompetencyHeatmapProps {
  data: HeatmapData[];
}

const CompetencyHeatmap = ({ data }: CompetencyHeatmapProps) => {
  const meetingTypeLabels: Record<string, string> = {
    prospecting: 'Prospecção',
    discovery: 'Descoberta',
    presentation: 'Apresentação',
    negotiation: 'Negociação',
  };

  const competencyKeys = [
    'situation',
    'problem',
    'implication',
    'need_payoff',
  ];

  const competencyLabels: Record<string, string> = {
    situation: 'Situação',
    problem: 'Problema',
    implication: 'Implicação',
    need_payoff: 'Valor',
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-muted/30 text-muted-foreground';
    if (score >= 85) return 'bg-accent/30 text-accent font-semibold';
    if (score >= 70) return 'bg-secondary/30 text-secondary font-semibold';
    if (score >= 60) return 'bg-primary/20 text-primary font-medium';
    return 'bg-destructive/20 text-destructive font-medium';
  };

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Competências por Tipo de Reunião</h2>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          Complete mais sessões para visualizar o heatmap
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Competências por Tipo de Reunião</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Tipo de Reunião</TableHead>
              {competencyKeys.map((key) => (
                <TableHead key={key} className="text-center font-semibold">
                  {competencyLabels[key]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.meetingType}>
                <TableCell className="font-medium">
                  {meetingTypeLabels[row.meetingType] || row.meetingType}
                </TableCell>
                {competencyKeys.map((key) => {
                  const score = row[key as keyof HeatmapData] as number | undefined;
                  return (
                    <TableCell
                      key={key}
                      className={cn(
                        'text-center transition-colors',
                        getScoreColor(score)
                      )}
                    >
                      {score ? Math.round(score) : '-'}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-accent/30 rounded" />
          <span>≥ 85 (Excelente)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-secondary/30 rounded" />
          <span>≥ 70 (Bom)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary/20 rounded" />
          <span>≥ 60 (Adequado)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-destructive/20 rounded" />
          <span>{'< 60 (Melhorar)'}</span>
        </div>
      </div>
    </Card>
  );
};

export default CompetencyHeatmap;