import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, CheckCircle2, XCircle } from 'lucide-react';

import type { Invitation } from '@/types';

interface OrgInfo {
  name: string;
  slug: string;
}

const Join = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (token) loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Convite não encontrado ou inválido.');
        setLoading(false);
        return;
      }

      if (data.accepted_at) {
        setError('Este convite já foi aceito.');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('Este convite expirou. Solicite um novo convite ao administrador.');
        setLoading(false);
        return;
      }

      setInvitation(data);

      // Fetch org info
      const { data: org } = await (supabase as any)
        .from('organizations')
        .select('name, slug')
        .eq('id', data.organization_id)
        .single();

      if (org) setOrgInfo(org);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar convite.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation || !token) return;

    if (password.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    if (!fullName.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Call edge function that handles everything server-side with service role
      const { data, error: fnError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          token,
          full_name: fullName.trim(),
          password,
        },
      });

      if (fnError) {
        toast({ title: 'Erro ao aceitar convite', description: fnError.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já pode fazer login com seu e-mail e senha.',
      });

      setTimeout(() => navigate('/auth'), 2000);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Convite Inválido</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            Ir para Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bem-vindo(a)!</h1>
          {orgInfo && (
            <p className="text-muted-foreground">
              Você foi convidado(a) para <span className="font-semibold text-foreground">{orgInfo.name}</span>
            </p>
          )}
          {invitation?.personal_message && (
            <div className="bg-muted rounded-lg p-3 text-sm italic text-muted-foreground">
              "{invitation.personal_message}"
            </div>
          )}
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={invitation?.email || ''} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Aceitar convite e criar conta
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Já tem conta?{' '}
          <a href="/auth" className="text-primary hover:underline">
            Faça login
          </a>
        </p>
      </Card>
    </div>
  );
};

export default Join;
