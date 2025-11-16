import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface SessionComparison {
  id: string;
  started_at: string;
  overall_score: number;
  personas: any;
  competencies: any[];
}

const Compare = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionComparison[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionIds = searchParams.get('sessions')?.split(',') || [];

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && sessionIds.length > 0) {
      loadSessions();
    }
  }, [user, sessionIds]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
  };

  const loadSessions = async () => {
    if (sessionIds.length < 2 || sessionIds.length > 3) {
      toast({
        title: 'Erro',
        description: 'Selecione 2 ou 3 sessões para comparar',
        variant: 'destructive',
      });
      navigate('/history');
      return;
    }

    setLoading(true);

    const sessionsData: SessionComparison[] = [];

    for (const sessionId of sessionIds) {
      const { data: sessionData } = await supabase
        .from('roleplay_sessions')
        .select('*, personas(*)')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        const { data: competenciesData } = await supabase
          .from('competency_scores')
          .select('*')
          .eq('session_id', sessionId);

        sessionsData.push({
          ...sessionData,
          competencies: competenciesData || []
        });
      }
    }

    setSessions(sessionsData);
    setLoading(false);
  };

  const getRadarData = () => {
    if (sessions.length === 0) return [];

    const competencyNames = sessions[0]?.competencies.map(c => c.competency_name) || [];
    
    return competencyNames.map(name => {
      const dataPoint: any = { competency: name };
      
      sessions.forEach((session, idx) => {
        const comp = session.competencies.find(c => c.competency_name === name);
        dataPoint[`sessao${idx + 1}`] = comp ? comp.score * 10 : 0;
      });

      return dataPoint;
    });
  };

  const getTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="h-4 w-4 text-success" />;
    if (change < -5) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const colors = ['#0ea5e9', '#a855f7', '#10b981'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Carregando comparação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs />

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Comparação de Sessões</h1>
          <Button onClick={() => navigate('/history')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Histórico
          </Button>
        </div>

        {/* Resumo das Sessões */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {sessions.map((session, idx) => (
            <Card key={session.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge style={{ backgroundColor: colors[idx] }}>
                  Sessão {idx + 1}
                </Badge>
                <span className="text-2xl font-bold">
                  {session.overall_score || 'N/A'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {format(new Date(session.started_at), "d 'de' MMMM, yyyy", { locale: ptBR })}
                </p>
                <p className="font-medium">{session.personas?.name}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Gráfico Radar Comparativo */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">Comparação de Competências</h2>
          <ResponsiveContainer width="100%" height={500}>
            <RadarChart data={getRadarData()}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="competency"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              {sessions.map((_, idx) => (
                <Radar
                  key={idx}
                  name={`Sessão ${idx + 1}`}
                  dataKey={`sessao${idx + 1}`}
                  stroke={colors[idx]}
                  fill={colors[idx]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Tabela de Comparação Detalhada */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Evolução por Competência</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Competência</th>
                  {sessions.map((_, idx) => (
                    <th key={idx} className="text-center p-3 font-semibold">
                      Sessão {idx + 1}
                    </th>
                  ))}
                  {sessions.length === 2 && (
                    <th className="text-center p-3 font-semibold">Evolução</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sessions[0]?.competencies.map((comp, compIdx) => {
                  const scores = sessions.map(s => {
                    const c = s.competencies.find(c => c.competency_name === comp.competency_name);
                    return c ? c.score * 10 : 0;
                  });

                  const evolution = sessions.length === 2 ? scores[1] - scores[0] : null;

                  return (
                    <tr key={compIdx} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{comp.competency_name}</td>
                      {scores.map((score, idx) => (
                        <td key={idx} className="text-center p-3">
                          <span className="text-lg font-bold">{score}</span>
                        </td>
                      ))}
                      {evolution !== null && (
                        <td className="text-center p-3">
                          <div className="flex items-center justify-center gap-2">
                            {getTrendIcon(evolution)}
                            <span className={`font-semibold ${
                              evolution > 0 ? 'text-success' : 
                              evolution < 0 ? 'text-destructive' : 
                              'text-muted-foreground'
                            }`}>
                              {evolution > 0 ? '+' : ''}{evolution.toFixed(0)}
                            </span>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Compare;
