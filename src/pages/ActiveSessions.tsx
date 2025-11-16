import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ActiveSessions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadActiveSessions();
    }
  }, [user]);

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

  const loadActiveSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roleplay_sessions')
        .select(`
          *,
          personas (
            name,
            role,
            company
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error loading active sessions:', error);
        toast({
          title: "Erro ao carregar sessões",
          description: "Não foi possível carregar as sessões ativas.",
          variant: "destructive",
        });
        return;
      }

      setActiveSessions(data || []);
    } finally {
      setLoading(false);
    }
  };

  const confirmEndSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowConfirm(true);
  };

  const endSession = async () => {
    if (!selectedSessionId) return;

    setEndingSessionId(selectedSessionId);
    setShowConfirm(false);

    try {
      const now = new Date().toISOString();
      const session = activeSessions.find(s => s.id === selectedSessionId);
      const durationSeconds = session 
        ? Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000)
        : 0;

      const { error } = await supabase
        .from('roleplay_sessions')
        .update({
          status: 'completed',
          completed_at: now,
          duration_seconds: durationSeconds,
        })
        .eq('id', selectedSessionId);

      if (error) {
        console.error('Error ending session:', error);
        toast({
          title: "Erro ao finalizar sessão",
          description: "Não foi possível finalizar a sessão.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sessão finalizada",
        description: "A sessão foi finalizada com sucesso.",
      });

      // Reload sessions
      loadActiveSessions();
    } finally {
      setEndingSessionId(null);
      setSelectedSessionId(null);
    }
  };

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prospection: 'Prospecção',
      discovery: 'Descoberta',
      presentation: 'Apresentação',
      negotiation: 'Negociação',
    };
    return labels[type] || type;
  };

  const getMethodLabel = (method: string) => {
    return method === 'voice' ? 'Voz' : 'Chat';
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}min`;
    }
    return `${minutes}min`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">
            Sessões Ativas
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas sessões de roleplay em andamento
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeSessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma sessão ativa
            </h3>
            <p className="text-muted-foreground mb-6">
              Você não possui sessões em andamento no momento.
            </p>
            <Button onClick={() => navigate('/roleplay')}>
              Iniciar Nova Sessão
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeSessions.map((session) => (
              <Card key={session.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold">
                        {session.personas?.name || 'Persona'}
                      </h3>
                      <Badge variant="secondary">
                        {getMethodLabel(session.method)}
                      </Badge>
                      <Badge>
                        {getMeetingTypeLabel(session.meeting_type)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Empresa:</span>{' '}
                        {session.personas?.company || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Cargo:</span>{' '}
                        {session.personas?.role || 'N/A'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Iniciada há:</span>{' '}
                        {formatDuration(session.started_at)}
                      </p>
                      <p>
                        <span className="font-medium">Data:</span>{' '}
                        {format(new Date(session.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => confirmEndSession(session.id)}
                    disabled={endingSessionId === session.id}
                    className="gap-2"
                  >
                    {endingSessionId === session.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Finalizar
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Sessão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar esta sessão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={endSession}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveSessions;
