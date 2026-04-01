import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { Plus, ChevronUp, ChevronDown, Save, GripVertical, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompetencyItem {
  name: string;
  weight: number;
  enabled: boolean;
}

const AdminCompetencies = () => {
  const { toast } = useToast();
  const { companyConfig, organization } = useTenantContext();
  const [competencies, setCompetencies] = useState<CompetencyItem[]>([]);
  const [newName, setNewName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize from company_config
    const weights = (companyConfig as any).competency_weights || {};
    const disabledList: string[] = (companyConfig as any).disabled_competencies || [];

    const items: CompetencyItem[] = companyConfig.competencies.map((name) => ({
      name,
      weight: weights[name] ?? 3,
      enabled: !disabledList.includes(name),
    }));
    setCompetencies(items);
  }, [companyConfig]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newArr = [...competencies];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArr.length) return;
    [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
    setCompetencies(newArr);
  };

  const updateWeight = (index: number, weight: number) => {
    const newArr = [...competencies];
    newArr[index].weight = weight;
    setCompetencies(newArr);
  };

  const toggleEnabled = (index: number) => {
    const newArr = [...competencies];
    newArr[index].enabled = !newArr[index].enabled;
    setCompetencies(newArr);
  };

  const addCompetency = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (competencies.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: 'Competência já existe', variant: 'destructive' });
      return;
    }
    setCompetencies([...competencies, { name: trimmed, weight: 3, enabled: true }]);
    setNewName('');
    setShowAddForm(false);
  };

  const removeCompetency = (index: number) => {
    setCompetencies(competencies.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(competencies[index].name);
  };

  const finishEditing = () => {
    if (editingIndex === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingIndex(null);
      return;
    }
    const newArr = [...competencies];
    newArr[editingIndex].name = trimmed;
    setCompetencies(newArr);
    setEditingIndex(null);
  };

  const handleSave = async () => {
    if (!organization) {
      toast({ title: 'Organização não encontrada', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const orderedNames = competencies.map(c => c.name);
      const weights: Record<string, number> = {};
      const disabled: string[] = [];

      competencies.forEach(c => {
        weights[c.name] = c.weight;
        if (!c.enabled) disabled.push(c.name);
      });

      const updatedConfig = {
        ...(companyConfig as any),
        competencies: orderedNames,
        competency_weights: weights,
        disabled_competencies: disabled,
      };

      const { error } = await supabase
        .from('organizations')
        .update({ company_config: updatedConfig })
        .eq('id', organization.id);

      if (error) throw error;

      toast({ title: 'Competências salvas com sucesso!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Competências</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as competências avaliadas pela IA em cada sessão.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          As competências abaixo são avaliadas pela IA em cada sessão de roleplay. Alterações afetam sessões futuras.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {competencies.map((comp, index) => (
          <Card key={index} className={`p-4 transition-opacity ${!comp.enabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === competencies.length - 1}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <GripVertical className="h-4 w-4 text-muted-foreground/50" />

              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingIndex === index ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                    autoFocus
                    className="h-8"
                  />
                ) : (
                  <button
                    onClick={() => startEditing(index)}
                    className="text-left font-medium hover:text-primary transition truncate block w-full"
                  >
                    {comp.name}
                  </button>
                )}
              </div>

              {/* Weight */}
              <div className="flex items-center gap-2 w-48">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Peso:</span>
                <Slider
                  value={[comp.weight]}
                  onValueChange={([v]) => updateWeight(index, v)}
                  min={1}
                  max={5}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[2rem] justify-center">
                  {comp.weight}
                </Badge>
              </div>

              {/* Toggle */}
              <Switch
                checked={comp.enabled}
                onCheckedChange={() => toggleEnabled(index)}
              />

              {/* Delete */}
              <button
                onClick={() => removeCompetency(index)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add form */}
      {showAddForm ? (
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da competência..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCompetency()}
              autoFocus
            />
            <Button onClick={addCompetency}>Adicionar</Button>
            <Button variant="ghost" onClick={() => { setShowAddForm(false); setNewName(''); }}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Competência
        </Button>
      )}

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
};

export default AdminCompetencies;
