import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SessionData = {
  id: string;
  user_name: string;
  persona_name: string;
  meeting_type: string;
  method: string;
  overall_score: number | null;
  duration_seconds: number | null;
  completed_at: string | null;
  status: string;
};

const AdminSessions = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      const { data: sessionsData } = await supabase
        .from('roleplay_sessions')
        .select(`
          *,
          profiles!roleplay_sessions_user_id_fkey(full_name),
          personas(name)
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (sessionsData) {
        const formatted = sessionsData.map((s: any) => ({
          id: s.id,
          user_name: s.profiles?.full_name || 'Usuário',
          persona_name: s.personas?.name || 'Persona',
          meeting_type: s.meeting_type,
          method: s.method,
          overall_score: s.overall_score,
          duration_seconds: s.duration_seconds,
          completed_at: s.completed_at,
          status: s.status,
        }));
        setSessions(formatted);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      completed: 'default',
      active: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'completed' ? 'Concluída' : 'Ativa'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Todas as Sessões</h1>
        <p className="text-muted-foreground">
          Visualização de {sessions.length} sessão(ões) recente(s)
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.user_name}</TableCell>
                <TableCell>{session.persona_name}</TableCell>
                <TableCell>{getMeetingTypeLabel(session.meeting_type)}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {session.method === 'text' ? 'Texto' : 'Voz'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {session.overall_score !== null 
                    ? `${session.overall_score}/10` 
                    : '-'}
                </TableCell>
                <TableCell>
                  {session.duration_seconds
                    ? `${Math.floor(session.duration_seconds / 60)}min`
                    : '-'}
                </TableCell>
                <TableCell>{getStatusBadge(session.status)}</TableCell>
                <TableCell>
                  {session.completed_at
                    ? format(new Date(session.completed_at), 'dd/MM HH:mm', { locale: ptBR })
                    : '-'}
                </TableCell>
                <TableCell>
                  {session.status === 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/session/${session.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminSessions;
