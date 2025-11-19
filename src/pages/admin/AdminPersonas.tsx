import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserCircle,
  Save,
  RefreshCw,
  Edit,
  Building2,
  Briefcase,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  difficulty: string;
  description: string | null;
  personality_traits: any;
  avatar_url: string | null;
  voice_provider: string | null;
  elevenlabs_voice_id: string | null;
}

const AdminPersonas = () => {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [editedSector, setEditedSector] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedDifficulty, setEditedDifficulty] = useState('');

  // Create new persona states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPersona, setNewPersona] = useState({
    name: '',
    role: '',
    company: '',
    sector: '',
    difficulty: 'medium',
    description: '',
  });

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('name');

      if (error) throw error;
      console.log('Loaded personas:', data);
      setPersonas(data || []);
    } catch (error) {
      console.error('Error loading personas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as personas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (persona: Persona) => {
    console.log('Opening edit dialog for persona:', persona);
    setEditingPersona(persona);
    setEditedName(persona.name);
    setEditedRole(persona.role);
    setEditedCompany(persona.company);
    setEditedSector(persona.sector);
    setEditedDescription(persona.description || '');
    setEditedDifficulty(persona.difficulty);
  };

  const savePersona = async () => {
    if (!editingPersona) return;

    setSaving(true);
    try {
      const updateData = {
        name: editedName,
        role: editedRole,
        company: editedCompany,
        sector: editedSector,
        description: editedDescription || null,
        difficulty: editedDifficulty,
      };

      console.log('Saving persona:', editingPersona.id, updateData);

      const { data, error } = await supabase
        .from('personas')
        .update(updateData)
        .eq('id', editingPersona.id)
        .select();

      console.log('Save result:', { data, error });

      if (error) throw error;

      toast({
        title: 'Salvo',
        description: `Persona ${editingPersona.name} atualizada com sucesso`,
      });

      setEditingPersona(null);
      await loadPersonas();
    } catch (error) {
      console.error('Error saving persona:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a persona',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const createPersona = async () => {
    if (!newPersona.name || !newPersona.role || !newPersona.company || !newPersona.sector) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('personas')
        .insert({
          name: newPersona.name,
          role: newPersona.role,
          company: newPersona.company,
          sector: newPersona.sector,
          difficulty: newPersona.difficulty,
          description: newPersona.description || null,
        });

      if (error) throw error;

      toast({
        title: 'Criada',
        description: `Persona ${newPersona.name} criada com sucesso`,
      });

      setShowCreateDialog(false);
      setNewPersona({
        name: '',
        role: '',
        company: '',
        sector: '',
        difficulty: 'medium',
        description: '',
      });
      await loadPersonas();
    } catch (error) {
      console.error('Error creating persona:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a persona',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deletePersona = async (persona: Persona) => {
    if (!confirm(`Tem certeza que deseja excluir a persona "${persona.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', persona.id);

      if (error) throw error;

      toast({
        title: 'Excluída',
        description: `Persona ${persona.name} excluída com sucesso`,
      });

      await loadPersonas();
    } catch (error) {
      console.error('Error deleting persona:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a persona. Pode haver sessões vinculadas.',
        variant: 'destructive',
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Médio';
      case 'hard':
        return 'Difícil';
      default:
        return difficulty;
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personas</h1>
          <p className="text-muted-foreground">
            Gerencie as personas e seus prompts customizados
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Persona
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <Card key={persona.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{persona.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {persona.role}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getDifficultyColor(persona.difficulty)}>
                  {getDifficultyLabel(persona.difficulty)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{persona.company}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>{persona.sector}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{getDifficultyLabel(persona.difficulty)}</Badge>
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openEditDialog(persona)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deletePersona(persona)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Persona</DialogTitle>
            <DialogDescription>
              Crie uma nova persona para treinamento de vendas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nome *</Label>
                <Input
                  id="new-name"
                  value={newPersona.name}
                  onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Cargo *</Label>
                <Input
                  id="new-role"
                  value={newPersona.role}
                  onChange={(e) => setNewPersona({ ...newPersona, role: e.target.value })}
                  placeholder="Ex: Diretor de TI"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-company">Empresa *</Label>
                <Input
                  id="new-company"
                  value={newPersona.company}
                  onChange={(e) => setNewPersona({ ...newPersona, company: e.target.value })}
                  placeholder="Ex: TechCorp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sector">Setor *</Label>
                <Input
                  id="new-sector"
                  value={newPersona.sector}
                  onChange={(e) => setNewPersona({ ...newPersona, sector: e.target.value })}
                  placeholder="Ex: Tecnologia"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-difficulty">Nível de Dificuldade</Label>
              <Select
                value={newPersona.difficulty}
                onValueChange={(value) => setNewPersona({ ...newPersona, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil - Receptivo e entusiasmado</SelectItem>
                  <SelectItem value="medium">Médio - Cauteloso mas interessado</SelectItem>
                  <SelectItem value="hard">Difícil - Crítico e cético</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Descrição</Label>
              <Textarea
                id="new-description"
                value={newPersona.description}
                onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
                placeholder="Descrição do perfil e contexto da persona..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createPersona} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Persona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPersona} onOpenChange={() => setEditingPersona(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Persona: {editingPersona?.name}</DialogTitle>
            <DialogDescription>
              Configure o prompt e comportamento da persona
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Cargo *</Label>
                <Input
                  id="edit-role"
                  value={editedRole}
                  onChange={(e) => setEditedRole(e.target.value)}
                  placeholder="Ex: Diretor de TI"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company">Empresa *</Label>
                <Input
                  id="edit-company"
                  value={editedCompany}
                  onChange={(e) => setEditedCompany(e.target.value)}
                  placeholder="Ex: TechCorp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sector">Setor *</Label>
                <Input
                  id="edit-sector"
                  value={editedSector}
                  onChange={(e) => setEditedSector(e.target.value)}
                  placeholder="Ex: Tecnologia"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Nível de Dificuldade</Label>
              <Select value={editedDifficulty} onValueChange={setEditedDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Fácil - Receptivo e entusiasmado</SelectItem>
                  <SelectItem value="medium">Médio - Cauteloso mas interessado</SelectItem>
                  <SelectItem value="hard">Difícil - Crítico e cético</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Descrição da persona..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Breve descrição do perfil e contexto da persona
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPersona(null)}>
              Cancelar
            </Button>
            <Button onClick={savePersona} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPersonas;
