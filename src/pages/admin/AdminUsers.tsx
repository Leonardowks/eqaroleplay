import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from '@/contexts/TenantContext';
import { Shield, UserCog, User, Loader2, Trash2, UserPlus, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const { organization } = useTenantContext();

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !organization?.id) {
      toast({ title: 'E-mail e organização são obrigatórios', variant: 'destructive' });
      return;
    }
    setInviting(true);
    setInviteLink(null);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail.trim(),
          role: inviteRole,
          organization_id: organization.id,
          personal_message: inviteMessage.trim() || null,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        setInviting(false);
        return;
      }
      setInviteLink(data.invite_link);
      toast({ title: 'Convite criado com sucesso!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao enviar convite', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetInviteDialog = () => {
    setInviteEmail('');
    setInviteRole('member');
    setInviteMessage('');
    setInviteLink(null);
    setCopied(false);
    setInviteOpen(false);
  };

  const handleDeleteHistoryClick = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const deleteUserHistory = async () => {
    if (!userToDelete) return;
    
    setDeletingUserId(userToDelete.id);
    try {
      // Buscar todas as sessões do usuário
      const { data: sessions } = await supabase
        .from('roleplay_sessions')
        .select('id')
        .eq('user_id', userToDelete.id);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);

        // Deletar mensagens das sessões
        await supabase
          .from('session_messages')
          .delete()
          .in('session_id', sessionIds);

        // Deletar competency scores
        await supabase
          .from('competency_scores')
          .delete()
          .in('session_id', sessionIds);
      }

      // Deletar insights do usuário
      await supabase
        .from('user_insights')
        .delete()
        .eq('user_id', userToDelete.id);

      // Deletar conquistas do usuário
      await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', userToDelete.id);

      // Deletar sessões
      await supabase
        .from('roleplay_sessions')
        .delete()
        .eq('user_id', userToDelete.id);

      toast({
        title: 'Histórico deletado',
        description: `Todo o histórico de ${userToDelete.name} foi removido com sucesso.`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user history:', error);
      toast({
        title: 'Erro ao deletar histórico',
        description: 'Não foi possível deletar o histórico do usuário.',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Total de {users.length} usuário(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar Vendedor
        </Button>
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
                  <div className="flex gap-2">
                    <Button
                      variant={user.roles.includes('admin') ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleAdminRole(user.id, user.roles)}
                      disabled={updatingUserId === user.id || deletingUserId === user.id}
                    >
                      {updatingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.roles.includes('admin') ? (
                        'Remover Admin'
                      ) : (
                        'Tornar Admin'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteHistoryClick(user.id, user.full_name)}
                      disabled={updatingUserId === user.id || deletingUserId === user.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar histórico do usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong> e irá deletar permanentemente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todas as sessões de roleplay</li>
                <li>Todas as competências avaliadas</li>
                <li>Todas as mensagens das sessões</li>
                <li>Todos os insights gerados</li>
                <li>Todas as conquistas desbloqueadas</li>
              </ul>
              <p className="mt-3 font-semibold">
                O perfil e as permissões de <span className="text-foreground">{userToDelete?.name}</span> serão mantidos.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUserHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deletar Histórico
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) resetInviteDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Vendedor</DialogTitle>
            <DialogDescription>
              Envie um link de convite para um novo membro da equipe.
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <Label className="text-xs text-muted-foreground">Link de convite</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie este link para <strong>{inviteEmail}</strong>. O convite expira em 7 dias.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetInviteDialog}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="vendedor@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-message">Mensagem pessoal (opcional)</Label>
                <Textarea
                  id="invite-message"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Bem-vindo(a) à equipe!"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetInviteDialog}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Criar Convite
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
