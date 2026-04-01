import { useState, useEffect } from 'react';
import { untypedFrom } from '@/integrations/supabase/untypedClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Palette, Save, RefreshCw, Upload, Globe, Mail, Phone } from 'lucide-react';

interface Branding {
  id: string;
  company_name: string;
  app_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  meta_description: string;
  meta_keywords: string | null;
  og_image_url: string | null;
  twitter_handle: string | null;
  footer_text: string | null;
  copyright_text: string | null;
  support_email: string | null;
  support_phone: string | null;
  website_url: string | null;
}

const defaultBranding: Branding = {
  id: '',
  company_name: 'EQA',
  app_name: 'Roleplay',
  tagline: 'Treinamento com IA',
  logo_url: null,
  favicon_url: null,
  primary_color: '213 100% 50%',
  secondary_color: '262 80% 65%',
  accent_color: '174 100% 50%',
  background_color: '222 47% 11%',
  meta_description: 'Plataforma de treinamento com IA',
  meta_keywords: null,
  og_image_url: null,
  twitter_handle: null,
  footer_text: null,
  copyright_text: null,
  support_email: null,
  support_phone: null,
  website_url: null,
};

const AdminBranding = () => {
  const { toast } = useToast();
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    setLoading(true);
    try {
      const { data, error } = await untypedFrom('branding')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

      if (data) {
        setBranding(data as Branding);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de marca',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      if (branding.id) {
        const { error } = await (supabase as any)
          .from('branding')
          .update(branding)
          .eq('id', branding.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('branding')
          .insert(branding);

        if (error) throw error;
      }

      toast({
        title: 'Salvo',
        description: 'Configurações de marca atualizadas com sucesso',
      });

      loadBranding();
    } catch (error) {
      console.error('Error saving branding:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Branding, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  const ColorInput = ({ label, field, description }: { label: string; field: keyof Branding; description: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <Input
          value={branding[field] as string || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder="213 100% 50%"
          className="flex-1"
        />
        <div
          className="w-10 h-10 rounded border"
          style={{ backgroundColor: `hsl(${branding[field]})` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marca & Visual</h1>
          <p className="text-muted-foreground">
            Personalize a identidade visual da plataforma
          </p>
        </div>
        <Button onClick={saveBranding} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Identidade */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade</CardTitle>
          <CardDescription>
            Nome da empresa e informações básicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={branding.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="EQA"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do App</Label>
              <Input
                value={branding.app_name}
                onChange={(e) => handleChange('app_name', e.target.value)}
                placeholder="Roleplay"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={branding.tagline || ''}
              onChange={(e) => handleChange('tagline', e.target.value)}
              placeholder="Treinamento de Vendas com IA"
            />
          </div>

          <div className="space-y-2">
            <Label>URL do Logo</Label>
            <Input
              value={branding.logo_url || ''}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              placeholder="https://exemplo.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Cole a URL de uma imagem hospedada ou faça upload para o Supabase Storage
            </p>
          </div>

          <div className="space-y-2">
            <Label>URL do Favicon</Label>
            <Input
              value={branding.favicon_url || ''}
              onChange={(e) => handleChange('favicon_url', e.target.value)}
              placeholder="https://exemplo.com/favicon.ico"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cores do Tema
          </CardTitle>
          <CardDescription>
            Use valores HSL (Hue Saturation Lightness). Ex: "213 100% 50%"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ColorInput
              label="Cor Primária"
              field="primary_color"
              description="Botões principais, links, destaques"
            />
            <ColorInput
              label="Cor Secundária"
              field="secondary_color"
              description="Elementos secundários, gradientes"
            />
            <ColorInput
              label="Cor de Destaque"
              field="accent_color"
              description="Badges, alertas, elementos especiais"
            />
            <ColorInput
              label="Cor de Fundo"
              field="background_color"
              description="Fundo principal da aplicação"
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO & Meta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            SEO & Meta Tags
          </CardTitle>
          <CardDescription>
            Otimização para mecanismos de busca e redes sociais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea
              value={branding.meta_description || ''}
              onChange={(e) => handleChange('meta_description', e.target.value)}
              placeholder="Descrição da plataforma para SEO"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              value={branding.meta_keywords || ''}
              onChange={(e) => handleChange('meta_keywords', e.target.value)}
              placeholder="treinamento, vendas, IA, SPIN Selling"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OG Image URL</Label>
              <Input
                value={branding.og_image_url || ''}
                onChange={(e) => handleChange('og_image_url', e.target.value)}
                placeholder="URL da imagem para compartilhamento"
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter Handle</Label>
              <Input
                value={branding.twitter_handle || ''}
                onChange={(e) => handleChange('twitter_handle', e.target.value)}
                placeholder="@empresa"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Informações de Contato
          </CardTitle>
          <CardDescription>
            Dados para suporte e contato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email de Suporte</Label>
              <Input
                type="email"
                value={branding.support_email || ''}
                onChange={(e) => handleChange('support_email', e.target.value)}
                placeholder="suporte@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={branding.support_phone || ''}
                onChange={(e) => handleChange('support_phone', e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={branding.website_url || ''}
              onChange={(e) => handleChange('website_url', e.target.value)}
              placeholder="https://empresa.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texto do Footer</Label>
              <Input
                value={branding.footer_text || ''}
                onChange={(e) => handleChange('footer_text', e.target.value)}
                placeholder="Desenvolvido com IA"
              />
            </div>
            <div className="space-y-2">
              <Label>Copyright</Label>
              <Input
                value={branding.copyright_text || ''}
                onChange={(e) => handleChange('copyright_text', e.target.value)}
                placeholder="© 2024 Empresa. Todos os direitos reservados."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBranding;
