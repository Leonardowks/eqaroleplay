import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MessageSquare, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTenantContext } from '@/contexts/TenantContext';

interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

const Roleplay = () => {
  const navigate = useNavigate();
  const { companyConfig } = useTenantContext();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [meetingType, setMeetingType] = useState('prospection');
  const [selectedStage, setSelectedStage] = useState<string>(companyConfig.sales_stages[0] || '');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadPersonas();
    }
  }, [user]);

  useEffect(() => {
    if (companyConfig.sales_stages.length > 0 && !selectedStage) {
      setSelectedStage(companyConfig.sales_stages[0]);
    }
  }, [companyConfig.sales_stages]);

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

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('difficulty', { ascending: true });

      if (error) throw error;
      
      setPersonas((data as Persona[]) || []);
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-accent/20 text-accent border-accent/30',
      medium: 'bg-secondary/20 text-secondary border-secondary/30',
      hard: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return colors[difficulty as keyof typeof colors];
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      easy: 'Fácil',
      medium: 'Médio',
      hard: 'Difícil',
    };
    return labels[difficulty as keyof typeof labels];
  };

  const meetingTypes = [
    { value: 'prospection', label: '🎯 Prospecção Inicial' },
    { value: 'discovery', label: '🤝 Reunião de Descoberta' },
    { value: 'presentation', label: '💡 Apresentação de Solução' },
    { value: 'negotiation', label: '📊 Negociação Comercial' },
  ];

  const startRoleplay = (method: 'text' | 'voice') => {
    if (!selectedPersona) return;
    
    const targetPath = method === 'voice' ? '/voice-chat' : '/chat';
    
    navigate(targetPath, {
      state: {
        personaId: selectedPersona.id,
        personaName: selectedPersona.name,
        meetingType,
        method,
        selectedStage,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userAvatar={profile?.avatar_url} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Iniciar Roleplay</h1>
          <p className="text-muted-foreground">
            Metodologia: {companyConfig.methodology} • Escolha uma persona e tipo de reunião para começar seu treinamento.
          </p>
        </div>

        {/* Sales Stage Selector */}
        {companyConfig.sales_stages.length > 0 && (
          <Card className="p-6 mb-8 bg-card border-border">
            <h2 className="text-xl font-bold mb-4">Etapa do Processo Comercial</h2>
            <RadioGroup
              value={selectedStage}
              onValueChange={setSelectedStage}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              {companyConfig.sales_stages.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <RadioGroupItem value={stage} id={`stage-${stage}`} />
                  <Label htmlFor={`stage-${stage}`} className="cursor-pointer text-sm">
                    {stage}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Card>
        )}

        {/* Meeting Type Selector */}
        <Card className="p-6 mb-8 bg-card border-border">
          <h2 className="text-xl font-bold mb-4">Tipo de Reunião</h2>
          <Select value={meetingType} onValueChange={setMeetingType}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meetingTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Personas Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6">Escolha sua Persona</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando personas...</p>
            </div>
          ) : personas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma persona disponível</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personas.map((persona) => (
                <Card
                  key={persona.id}
                  className={`p-6 bg-card border-border hover:shadow-glow transition-all cursor-pointer ${
                    selectedPersona?.id === persona.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedPersona(persona)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-muted rounded-full">
                      <User className="text-foreground" size={28} />
                    </div>
                    <Badge className={getDifficultyColor(persona.difficulty)}>
                      {getDifficultyLabel(persona.difficulty)}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{persona.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {persona.role} @ {persona.company}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">{persona.sector}</p>
                  <p className="text-sm">{persona.description}</p>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Start Buttons */}
        {selectedPersona && (
          <Card className="p-8 bg-gradient-secondary text-white">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Persona selecionada: {selectedPersona.name}
            </h2>
            <p className="text-center mb-2 opacity-90">
              Etapa: {selectedStage}
            </p>
            <p className="text-center mb-6 opacity-90">
              Escolha como você quer iniciar o roleplay
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => startRoleplay('text')}
                className="flex items-center gap-2 bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg"
              >
                <MessageSquare size={24} />
                Iniciar por Texto
              </Button>
              <Button
                onClick={() => startRoleplay('voice')}
                className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 px-8 py-6 text-lg"
              >
                <Mic size={24} />
                Iniciar por Voz
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Roleplay;
