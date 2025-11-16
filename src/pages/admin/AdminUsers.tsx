import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserCog, User, Loader2 } from 'lucide-react';
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

type UserData = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  total_sessions: number;
  avg_score: number | null;
  last_activity: string | null;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profiles) {
        setUsers([]);
        return;
      }

      const usersData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          const { data: sessions } = await supabase
            .from('roleplay_sessions')
            .select('overall_score, completed_at')
            .eq('user_id', profile.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });

          const avgScore = sessions?.length
            ? sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / sessions.length
            : null;

          return {
            ...profile,
            roles: roles?.map(r => r.role) || [],
            total_sessions: sessions?.length || 0,
            avg_score: avgScore ? parseFloat(avgScore.toFixed(1)) : null,
            last_activity: sessions?.[0]?.completed_at || null,
          };
        })
      );

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentRoles: string[]) => {
    setUpdatingUserId(userId);
    try {
      const hasAdmin = currentRoles.includes('admin');

      if (hasAdmin) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
      }

      toast({
        title: hasAdmin ? 'Admin removido' : 'Admin adicionado',
        description: `Permissões atualizadas com sucesso.`,
      });

      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Erro ao atualizar permissões',
        description: 'Não foi possível atualizar as permissões do usuário.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
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
        <h1 className="text-3xl font-bold mb-2">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          Total de {users.length} usuário(s) cadastrado(s)
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Sessões</TableHead>
              <TableHead>Pontuação</TableHead>
              <TableHead>Última Atividade</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.substring(0, 2).toUpperCase() || 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.includes('admin') && (
                      <Badge variant="default" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                    {user.roles.includes('moderator') && (
                      <Badge variant="secondary" className="gap-1">
                        <UserCog className="h-3 w-3" />
                        Mod
                      </Badge>
                    )}
                    {user.roles.length === 0 && (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        User
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.total_sessions}</TableCell>
                <TableCell>
                  {user.avg_score !== null ? `${user.avg_score}/10` : '-'}
                </TableCell>
                <TableCell>
                  {user.last_activity
                    ? format(new Date(user.last_activity), 'dd/MM/yy HH:mm', { locale: ptBR })
                    : 'Nunca'}
                </TableCell>
                <TableCell>
                  <Button
                    variant={user.roles.includes('admin') ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => toggleAdminRole(user.id, user.roles)}
                    disabled={updatingUserId === user.id}
                  >
                    {updatingUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : user.roles.includes('admin') ? (
                      'Remover Admin'
                    ) : (
                      'Tornar Admin'
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminUsers;
