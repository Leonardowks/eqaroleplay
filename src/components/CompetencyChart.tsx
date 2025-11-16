import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
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
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 10]}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
