import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface CompetencyChartProps {
  data: Array<{
    competency: string;
    score: number;
    fullMark: number;
  }>;
}

const CompetencyChart = ({ data }: CompetencyChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis 
          dataKey="competency" 
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 10]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--popover-foreground))',
          }}
          formatter={(value: number) => [`${(value * 10).toFixed(1)}/100`, 'Score']}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default CompetencyChart;
