import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Calendar, MessageSquare, TrendingUp, FileText, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DetailedFeedback from '@/components/DetailedFeedback';
import ActionPlanSection from '@/components/ActionPlanSection';
import { useTenantContext } from '@/contexts/TenantContext';
import type { Message, Competency } from '@/types';

const SessionDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyConfig } = useTenantContext();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && sessionId) {
      loadSessionData();
    }
  }, [user, sessionId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);
  };

  const loadSessionData = async () => {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from('roleplay_sessions')
      .select('*, personas(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      toast({
        title: 'Erro',
        description: 'Sessão não encontrada',
        variant: 'destructive',
      });
      navigate('/history');
      return;
    }

    setSession(sessionData);

    const { data: messagesData } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesData) {
      setMessages(messagesData);
    }

    const { data: competenciesData } = await supabase
      .from('competency_scores')
      .select('*')
      .eq('session_id', sessionId);

    if (competenciesData) {
      setCompetencies(competenciesData);
    }

    // Buscar recomendações estruturadas
    const { data: recommendationsData } = await supabase
      .from('session_recommendations')
      .select('*')
      .eq('session_id', sessionId)
      .order('priority', { ascending: true });

    if (recommendationsData) {
      setRecommendations(recommendationsData);
    }

    setLoading(false);
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'cold_call': 'Cold Call',
      'discovery': 'Discovery',
      'demo': 'Demonstração',
      'negotiation': 'Negociação',
      'objection_handling': 'Tratamento de Objeções',
      'prospection': 'Prospecção',
      'presentation': 'Apresentação',
    };
    return labels[type] || type;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Skeleton className="h-8 w-48 sm:w-64 mb-4 sm:mb-6" />
          <Skeleton className="h-48 sm:h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/history')}
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Detalhes da Sessão</h1>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {session.personas?.name}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {session.personas?.role} - {session.personas?.company}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.method === 'voice' ? 'default' : 'secondary'}>
                  {session.method === 'voice' ? 'Voz' : 'Texto'}
                </Badge>
                <Badge variant="outline">
                  {companyConfig.methodology}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Data</p>
                  <p className="text-sm sm:text-base font-medium">
                    {format(new Date(session.completed_at), 'dd/MM/yy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Duração</p>
                  <p className="text-sm sm:text-base font-medium">{formatDuration(session.duration_seconds || 0)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Tipo</p>
                  <p className="text-sm sm:text-base font-medium">{getMeetingTypeLabel(session.meeting_type)}</p>
                </div>
              </div>

              {session.overall_score && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Pontuação</p>
                    <p className="text-sm sm:text-base font-medium">{session.overall_score.toFixed(1)}/100</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {competencies.length > 0 && (
            <>
              {/* Feedback Detalhado por Competência */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Avaliação Detalhada — {companyConfig.methodology}</h2>
              <DetailedFeedback 
                competencies={competencies.map(c => ({
                  competency: c.competency_name,
                  score: c.score * 10,
                  feedback: c.feedback || '',
                  spin_category: c.spin_category || undefined,
                  sub_scores: c.sub_scores ? Object.fromEntries(
                    Object.entries(c.sub_scores).map(([k, v]) => [k, (v as number) * 10])
                  ) : undefined,
                  sub_scores_feedback: c.sub_scores_feedback,
                  criterion_approvals: c.criterion_approvals,
                  ai_suggestions: c.ai_suggestions
                }))}
                meetingType={session.meeting_type}
                personaDifficulty={session.personas?.difficulty}
              />
              </div>

              {/* Action Plan Section */}
              {recommendations.length > 0 && (
                <div className="mt-8">
                  <ActionPlanSection recommendations={recommendations} />
                </div>
              )}

              {/* Insights Section */}
              {(session.executive_summary || session.highlights || session.recommendations) && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-6">Insights da Sessão</h2>
                  
                  {session.executive_summary && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Resumo Executivo
                      </h3>
                      <p className="text-muted-foreground">{session.executive_summary}</p>
                    </div>
                  )}

                  {session.highlights && session.highlights.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Destaques
                      </h3>
                      <ul className="space-y-2">
                        {session.highlights.map((highlight: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">✓</span>
                            <span className="text-foreground">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session.recommendations && session.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Recomendações
                      </h3>
                      <ul className="space-y-2">
                        {session.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">→</span>
                            <span className="text-foreground">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              {/* Voice Metrics */}
              {session.voice_metrics && (
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-6">Análise Vocal</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Razão Fala/Escuta</p>
                      <p className="text-2xl font-bold">{session.voice_metrics.talk_listen_ratio?.toFixed(2) || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ideal: 0.8 - 1.2</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Palavras de Preenchimento</p>
                      <p className="text-2xl font-bold">{session.voice_metrics.filler_words_per_minute?.toFixed(1) || 'N/A'}/min</p>
                      <p className="text-xs text-muted-foreground mt-1">Ideal: {'<'} 3/min</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Velocidade de Fala</p>
                      <p className="text-2xl font-bold">{session.voice_metrics.speech_speed_wpm || 'N/A'} ppm</p>
                      <p className="text-xs text-muted-foreground mt-1">Ideal: 140-160 ppm</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Maior Monólogo</p>
                      <p className="text-2xl font-bold">{session.voice_metrics.longest_monologue_seconds || 'N/A'}s</p>
                      <p className="text-xs text-muted-foreground mt-1">Ideal: {'<'} 120s</p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          <Card className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Transcrição da Conversa</h2>
            <div className="space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                  Nenhuma mensagem gravada nesta sessão
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 sm:p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary/10 ml-0 sm:ml-auto max-w-full sm:max-w-[80%]'
                        : 'bg-muted max-w-full sm:max-w-[80%]'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-medium mb-1">
                      {msg.role === 'user' ? 'Você' : session.personas?.name}
                    </p>
                    <p className="text-xs sm:text-base text-foreground break-words whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-4">
            <Button onClick={() => navigate('/history')} variant="outline" size="lg" className="w-full sm:w-auto">
              Voltar ao Histórico
            </Button>
            <Button onClick={() => navigate('/roleplay')} size="lg" className="w-full sm:w-auto">
              Fazer Outro Roleplay
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SessionDetail;
