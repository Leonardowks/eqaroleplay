import { useState, useEffect } from 'react';
import { untypedFrom } from '@/integrations/supabase/untypedClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Key, Eye, EyeOff, Save, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ApiConfig {
  id: string;
  provider: string;
  api_key: string;
  display_name: string;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: string | null;
}

interface FeatureFlag {
  id: string;
  feature_key: string;
  display_name: string;
  description: string;
  is_enabled: boolean;
}

const AdminSettings = () => {
  const { toast } = useToast();
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editedKeys, setEditedKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load API configurations
      const { data: apiData, error: apiError } = await (supabase as any)
        .from('api_configurations')
        .select('*')
        .order('display_name');

      if (apiError) {
        console.error('API configurations table not found:', apiError);
      }

      const typedApiData = (apiData || []) as ApiConfig[];
      setApiConfigs(typedApiData);

      // Initialize edited keys with current values
      const initialKeys: Record<string, string> = {};
      typedApiData.forEach(config => {
        initialKeys[config.provider] = config.api_key;
      });
      setEditedKeys(initialKeys);

      // Load feature flags
      const { data: flagsData, error: flagsError } = await (supabase as any)
        .from('feature_flags')
        .select('*')
        .order('display_name');

      if (flagsError) {
        console.error('Feature flags table not found:', flagsError);
      }

      const typedFlagsData = (flagsData || []) as FeatureFlag[];
      setFeatureFlags(typedFlagsData);

    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string) => {
    setSaving(true);
    try {
      const newKey = editedKeys[provider];

      const { error } = await (supabase as any)
        .from('api_configurations')
        .update({
          api_key: newKey,
          is_active: newKey.length > 0,
          test_status: 'pending'
        })
        .eq('provider', provider);

      if (error) throw error;

      toast({
        title: 'Salvo',
        description: `API key do ${provider} atualizada com sucesso`,
      });

      loadSettings();
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a API key',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatureFlag = async (flagId: string, currentValue: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('feature_flags')
        .update({ is_enabled: !currentValue })
        .eq('id', flagId);

      if (error) throw error;

      setFeatureFlags(prev =>
        prev.map(flag =>
          flag.id === flagId ? { ...flag, is_enabled: !currentValue } : flag
        )
      );

      toast({
        title: 'Atualizado',
        description: 'Feature flag atualizada',
      });
    } catch (error) {
      console.error('Error toggling feature flag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a feature flag',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (config: ApiConfig) => {
    if (!config.api_key || config.api_key.length === 0) {
      return <Badge variant="outline" className="text-muted-foreground">Não configurado</Badge>;
    }
    if (config.is_active) {
      return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as API keys e funcionalidades do sistema
        </p>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Configure as chaves de API para integrações externas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {apiConfigs.map((config) => (
            <div key={config.id} className="space-y-3 pb-4 border-b last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">{config.display_name}</Label>
                  {getStatusBadge(config)}
                </div>
                {config.test_status && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {getStatusIcon(config.test_status)}
                    <span className="capitalize">{config.test_status}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKeys[config.provider] ? 'text' : 'password'}
                    value={editedKeys[config.provider] || ''}
                    onChange={(e) => setEditedKeys(prev => ({
                      ...prev,
                      [config.provider]: e.target.value
                    }))}
                    placeholder={`Cole a API key do ${config.display_name}`}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowKeys(prev => ({
                      ...prev,
                      [config.provider]: !prev[config.provider]
                    }))}
                  >
                    {showKeys[config.provider] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => saveApiKey(config.provider)}
                  disabled={saving || editedKeys[config.provider] === config.api_key}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {config.provider === 'openai' && 'Necessário para chat por voz. Obtenha em platform.openai.com/api-keys'}
                {config.provider === 'elevenlabs' && 'Opcional para vozes personalizadas. Obtenha em elevenlabs.io/app/settings/api-keys'}
                {config.provider === 'lovable' && 'Necessário para avaliações de IA. Obtenha no dashboard Lovable'}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Flags Section */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades</CardTitle>
          <CardDescription>
            Habilite ou desabilite funcionalidades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {featureFlags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">{flag.display_name}</Label>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
              </div>
              <Switch
                checked={flag.is_enabled}
                onCheckedChange={() => toggleFeatureFlag(flag.id, flag.is_enabled)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
