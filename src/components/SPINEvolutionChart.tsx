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

interface SPINEvolutionData {
  date: string;
  situation: number;
  problem: number;
  implication: number;
  need_payoff: number;
}

interface SPINEvolutionChartProps {
  data: SPINEvolutionData[];
}

const SPINEvolutionChart = ({ data }: SPINEvolutionChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Evolução SPIN Selling</h2>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Complete mais sessões para visualizar sua evolução
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Evolução SPIN Selling</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend 
            wrapperStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Line 
            type="monotone" 
            dataKey="situation" 
            stroke="#8884d8" 
            name="Situação"
            strokeWidth={2}
            dot={{ fill: '#8884d8', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="problem" 
            stroke="#82ca9d" 
            name="Problema"
            strokeWidth={2}
            dot={{ fill: '#82ca9d', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="implication" 
            stroke="#ffc658" 
            name="Implicação"
            strokeWidth={2}
            dot={{ fill: '#ffc658', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="need_payoff" 
            stroke="#ff7300" 
            name="Valor"
            strokeWidth={2}
            dot={{ fill: '#ff7300', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default SPINEvolutionChart;