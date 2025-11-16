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

interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

const personas: Persona[] = [
  {
    id: '1',
    name: 'Ricardo Startup',
    role: 'Fundador',
    company: 'Tech Startup',
    sector: 'Tecnologia',
    difficulty: 'easy',
    description: 'Jovem empreendedor, entusiasta de IA, orçamento limitado mas mente aberta',
  },
  {
    id: '2',
    name: 'Marina E-commerce',
    role: 'Gerente de Operações',
    company: 'Loja Online',
    sector: 'Varejo Digital',
    difficulty: 'easy',
    description: 'Sobrecarregada com tarefas manuais, busca eficiência imediata',
  },
  {
    id: '3',
    name: 'André Pequeno Negócio',
    role: 'Proprietário',
    company: 'Consultoria',
    sector: 'Serviços',
    difficulty: 'easy',
    description: 'Precisa automatizar processos administrativos básicos',
  },
  {
    id: '4',
    name: 'Fernanda RH',
    role: 'Diretora de Gente',
    company: 'Empresa Médio Porte',
    sector: 'Recursos Humanos',
    difficulty: 'medium',
    description: 'Quer automatizar recrutamento e onboarding, preocupada com custos',
  },
  {
    id: '5',
    name: 'Carlos Industrial',
    role: 'Gerente de Produção',
    company: 'Indústria',
    sector: 'Manufatura',
    difficulty: 'medium',
    description: 'Tradicional, cético com IA, foca em resultados tangíveis',
  },
  {
    id: '6',
    name: 'Juliana Marketing',
    role: 'CMO',
    company: 'Agência Digital',
    sector: 'Marketing',
    difficulty: 'medium',
    description: 'Conhece automação mas questiona diferencial da sua solução',
  },
  {
    id: '7',
    name: 'Dr. Roberto Advogado',
    role: 'Sócio',
    company: 'Escritório Jurídico',
    sector: 'Advocacia',
    difficulty: 'hard',
    description: 'Extremamente preocupado com segurança e compliance, LGPD',
  },
  {
    id: '8',
    name: 'Patricia CFO',
    role: 'Diretora Financeira',
    company: 'Holding',
    sector: 'Financeiro',
    difficulty: 'hard',
    description: 'Foca intensamente em ROI, payback e métricas financeiras',
  },
  {
    id: '9',
    name: 'Gustavo TI',
    role: 'CTO',
    company: 'Empresa Enterprise',
    sector: 'Tecnologia',
    difficulty: 'hard',
    description: 'Técnico, questiona arquitetura, integrações e escalabilidade',
  },
];

const Roleplay = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [meetingType, setMeetingType] = useState('prospection');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

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
            Escolha uma persona e tipo de reunião para começar seu treinamento.
          </p>
        </div>

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
        </div>

        {/* Start Buttons */}
        {selectedPersona && (
          <Card className="p-8 bg-gradient-secondary text-white">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Persona selecionada: {selectedPersona.name}
            </h2>
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
