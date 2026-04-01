import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Power, PowerOff, Plus, Building2, Loader2 } from 'lucide-react';
import ImpersonationBanner from '@/components/ImpersonationBanner';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
}

const OrganizationsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const { data: orgsData, error } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const { data: members } = await supabase
        .from('organization_members')
        .select('organization_id');

      const counts: Record<string, number> = {};
      members?.forEach(m => {
        counts[m.organization_id] = (counts[m.organization_id] || 0) + 1;
      });

      const rows: OrgRow[] = (orgsData || []).map(o => ({
        ...o,
        is_active: o.is_active ?? true,
        member_count: counts[o.id] || 0,
      }));

      setOrgs(rows);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao carregar organizações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (orgId: string, currentlyActive: boolean) => {
    setTogglingId(orgId);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !currentlyActive })
        .eq('id', orgId);

      if (error) throw error;

      setOrgs(prev => prev.map(o =>
        o.id === orgId ? { ...o, is_active: !currentlyActive } : o
      ));

      toast({ title: `Organização ${!currentlyActive ? 'ativada' : 'desativada'}` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  const impersonate = (org: OrgRow) => {
    localStorage.setItem('superadmin_viewing_org', JSON.stringify({
      id: org.id,
      name: org.name,
      slug: org.slug,
    }));
    // Force page reload to re-trigger TenantContext
    window.location.href = '/admin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ImpersonationBanner />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              Organizações
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as organizações da plataforma.
            </p>
          </div>
          <Button onClick={() => navigate('/admin/onboarding')} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Nova Organização
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma organização encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map(org => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{org.slug}</TableCell>
                    <TableCell className="text-center">{org.member_count}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={org.is_active ? 'default' : 'secondary'}>
                        {org.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(org.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => impersonate(org)}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Visualizar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(org.id, org.is_active)}
                          disabled={togglingId === org.id}
                        >
                          {togglingId === org.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : org.is_active ? (
                            <PowerOff className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <Power className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default OrganizationsList;
