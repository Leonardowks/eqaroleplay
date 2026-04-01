import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Target, ArrowUp, ArrowDown } from 'lucide-react';

interface EvolutionData {
  date: string;
  [competency: string]: string | number;
}

interface CompetencyEvolutionProps {
  data: EvolutionData[];
  competencyNames: string[];
}

const COLORS = [
  'hsl(var(--primary))',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00c49f',
  '#ff8042',
  '#a4de6c',
  '#8884d8',
  '#d0ed57',
];

const CompetencyEvolution = ({ data, competencyNames }: CompetencyEvolutionProps) => {
  const highlights = useMemo(() => {
    if (data.length < 2) return null;

    const recent = data.slice(-5);
    const improvements: { name: string; delta: number }[] = [];
    const averages: { name: string; avg: number }[] = [];

    competencyNames.forEach((name) => {
      const scores = recent
        .map((d) => (typeof d[name] === 'number' ? (d[name] as number) : null))
        .filter((s): s is number => s !== null);

      if (scores.length >= 2) {
        const first = scores[0];
        const last = scores[scores.length - 1];
        improvements.push({ name, delta: last - first });
      }

      if (scores.length > 0) {
        averages.push({
          name,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        });
      }
    });

    const bestImprovement = improvements.sort((a, b) => b.delta - a.delta)[0];
    const lowestAvg = averages.sort((a, b) => a.avg - b.avg)[0];

    return { bestImprovement, lowestAvg };
  }, [data, competencyNames]);

  if (data.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Complete sessões para ver sua evolução ao longo do tempo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Highlight cards */}
      {highlights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highlights.bestImprovement && highlights.bestImprovement.delta > 0 && (
            <Card className="p-5 border-green-500/30 bg-green-500/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Maior evolução</p>
                  <p className="text-lg font-bold">{highlights.bestImprovement.name}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    +{highlights.bestImprovement.delta.toFixed(0)} pontos nas últimas 5 sessões
                  </p>
                </div>
              </div>
            </Card>
          )}

          {highlights.lowestAvg && (
            <Card className="p-5 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Foco recomendado</p>
                  <p className="text-lg font-bold">{highlights.lowestAvg.name}</p>
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <ArrowDown className="h-3 w-3" />
                    Média de {highlights.lowestAvg.avg.toFixed(0)} — pratique mais esta competência
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Line chart */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-6">Evolução por Competência</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Legend />
              {competencyNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default CompetencyEvolution;
