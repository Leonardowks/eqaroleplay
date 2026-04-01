import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, RotateCcw, Eye, ChevronDown, AlertTriangle } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  sector: string;
  difficulty: string;
  description: string | null;
  objection_patterns: any;
  buying_signals: any;
  personality_traits: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AdminPromptPreview = () => {
  const { companyConfig, organization } = useTenantContext();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedStage, setSelectedStage] = useState(companyConfig.sales_stages[0] || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPersonas();
  }, []);

  useEffect(() => {
    if (selectedPersonaId && selectedStage) {
      buildPromptPreview();
    }
  }, [selectedPersonaId, selectedStage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPersonas = async () => {
    const query = supabase.from('personas').select('*').order('name');
    const { data } = organization?.id
      ? await query.eq('organization_id', organization.id)
      : await query;
    if (data) setPersonas(data as Persona[]);
  };

  const getSelectedPersona = () => personas.find(p => p.id === selectedPersonaId);

  const buildPromptPreview = () => {
    const persona = getSelectedPersona();
    if (!persona) {
      setGeneratedPrompt('Selecione uma persona para ver o prompt.');
      return;
    }

    const config = companyConfig;
    const objections = persona.objection_patterns
      ? (Array.isArray(persona.objection_patterns) ? persona.objection_patterns.join(', ') : JSON.stringify(persona.objection_patterns))
      : 'objeções realistas do setor';
    const buyingSignals = persona.buying_signals
      ? (Array.isArray(persona.buying_signals) ? persona.buying_signals.join(', ') : JSON.stringify(persona.buying_signals))
      : 'interesse em ROI e resultados';
    const competencies = config.competencies?.join(', ') || 'comunicação, negociação, fechamento';

    const prompt = `You are ${persona.name}, ${persona.role} at ${persona.company} in the ${persona.sector} sector.

CONTEXT:
- The salesperson is selling: ${config.product_description}
- Company segment: ${config.segment}
- Typical ticket: ${config.ticket_range}
- Sales cycle: ${config.sales_cycle}

YOUR PROFILE:
- ${persona.description || 'Professional buyer in your sector'}
- Sophistication level: ${config.icp?.sophistication_level || 'intermediario'}
- Resistance level: ${persona.difficulty === 'easy' ? 3 : persona.difficulty === 'hard' ? 8 : 5}/10
- Your typical objections: ${objections}
- You show interest when: ${buyingSignals}

CURRENT SALES STAGE BEING PRACTICED: ${selectedStage}

SALES METHODOLOGY IN USE: ${config.methodology}
${config.methodology !== 'Nenhuma' ? `The salesperson should follow ${config.methodology} principles.` : 'No formal methodology — evaluate natural flow and good practices.'}

BEHAVIOR RULES:
- Respond naturally as this persona would in real life
- In Portuguese (Brazil)
- Show your objections at appropriate moments
- If the salesperson demonstrates competency in: ${competencies}, acknowledge it subtly
- Difficulty: ${persona.difficulty}
- Tone: ${config.tone || 'profissional e consultivo'}
- Keep responses concise (2-4 sentences most of the time).

You are in a simulated sales call. Respond only as the persona, never break character.`;

    setGeneratedPrompt(prompt);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedPersonaId || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-roleplay', {
        body: {
          message: text,
          personaId: selectedPersonaId,
          sessionId: 'preview',
          organization_id: organization?.id,
          is_preview: true,
          preview_history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          meeting_type: selectedStage,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Preview chat error:', err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ Erro: ${err.message || 'Falha na comunicação'}`,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Preview de Prompt</h1>
        <p className="text-muted-foreground mt-1">
          Teste o comportamento da IA antes de liberar para os usuários.
        </p>
      </div>

      <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-700 dark:text-yellow-400">
          Modo Preview — Apenas para Admins. Esta sessão não é salva no histórico.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        {/* Left Panel - Config */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Persona</label>
              <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar persona..." />
                </SelectTrigger>
                <SelectContent>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.role} ({p.difficulty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Etapa Comercial</label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companyConfig.sales_stages.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getSelectedPersona() && (
              <div className="text-sm space-y-1 pt-2 border-t border-border">
                <p className="font-medium">{getSelectedPersona()!.name}</p>
                <p className="text-muted-foreground">{getSelectedPersona()!.role} @ {getSelectedPersona()!.company}</p>
                <p className="text-muted-foreground text-xs">{getSelectedPersona()!.description}</p>
                <Badge variant="outline" className="mt-1">{getSelectedPersona()!.difficulty}</Badge>
              </div>
            )}
          </Card>

          <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Ver Prompt Gerado
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${promptOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="p-4 mt-2 max-h-[400px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {generatedPrompt || 'Selecione persona e etapa para gerar o prompt.'}
                </pre>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Right Panel - Chat */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Chat Preview</span>
            <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Resetar
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px]">
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-12">
                {selectedPersonaId
                  ? 'Envie uma mensagem para iniciar a conversa preview.'
                  : 'Selecione uma persona à esquerda para começar.'}
              </p>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={loading || !selectedPersonaId}
            />
            <Button type="submit" disabled={loading || !input.trim() || !selectedPersonaId} size="icon">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminPromptPreview;
