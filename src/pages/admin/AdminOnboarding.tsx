import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Check, Sparkles, GripVertical } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ICPConfig {
  buyer_role: string;
  main_pains: string[];
  common_objections: string[];
  sophistication_level: 'iniciante' | 'intermediario' | 'avancado';
}

interface GeneratedPersona {
  name: string;
  role: string;
  company: string;
  sector: string;
  difficulty: string;
  description: string;
  personality_traits: string[];
  objection_patterns: string[];
}

interface WizardData {
  // Step 1
  company_name: string;
  segment: string;
  segment_custom: string;
  product_description: string;
  ticket_range: string;
  sales_cycle: string;
  // Step 2
  buyer_role: string;
  main_pains: string[];
  common_objections: string[];
  sophistication_level: 'iniciante' | 'intermediario' | 'avancado';
  // Step 3
  methodology: string;
  sales_stages: string[];
  // Step 4
  personas: GeneratedPersona[];
  // Step 5
  app_name: string;
  tagline: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
}

const INITIAL_DATA: WizardData = {
  company_name: '',
  segment: '',
  segment_custom: '',
  product_description: '',
  ticket_range: '',
  sales_cycle: '',
  buyer_role: '',
  main_pains: ['', '', ''],
  common_objections: ['', '', ''],
  sophistication_level: 'intermediario',
  methodology: 'SPIN',
  sales_stages: ['Prospecção', 'Diagnóstico', 'Apresentação', 'Proposta', 'Fechamento'],
  personas: [],
  app_name: '',
  tagline: '',
  logo_url: '',
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
};

const SEGMENTS = [
  'SaaS B2B', 'Imobiliária', 'Seguradora/Corretora', 'Franquia',
  'Saúde', 'Varejo', 'Consultoria', 'Indústria', 'Outro',
];
const TICKET_RANGES = ['< R$1k', 'R$1k–R$10k', 'R$10k–R$100k', '> R$100k'];
const SALES_CYCLES = ['Dias', 'Semanas', 'Meses', 'Mais de 6 meses'];
const METHODOLOGIES = ['SPIN', 'BANT', 'Challenger Sale', 'Sandler', 'Consultiva', 'Nenhuma'];
const STEP_TITLES = ['Sobre a Empresa', 'Perfil do Cliente (ICP)', 'Metodologia de Vendas', 'Personas de Treino', 'Branding'];

// ─── Step Components ─────────────────────────────────────────────────────────

function StepCompany({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="company_name">Nome da Empresa *</Label>
        <Input id="company_name" value={data.company_name} onChange={e => onChange({ company_name: e.target.value })} placeholder="Ex: Acme Corp" />
      </div>
      <div className="space-y-2">
        <Label>Segmento *</Label>
        <Select value={data.segment} onValueChange={v => onChange({ segment: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
          <SelectContent>{SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        {data.segment === 'Outro' && (
          <Input value={data.segment_custom} onChange={e => onChange({ segment_custom: e.target.value })} placeholder="Qual segmento?" className="mt-2" />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="product_description">Descrição do Produto/Serviço *</Label>
        <Textarea id="product_description" value={data.product_description} onChange={e => onChange({ product_description: e.target.value.slice(0, 300) })} placeholder="Descreva brevemente o que sua empresa vende..." maxLength={300} />
        <p className="text-xs text-muted-foreground text-right">{data.product_description.length}/300</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ticket Médio *</Label>
          <Select value={data.ticket_range} onValueChange={v => onChange({ ticket_range: v })}>
            <SelectTrigger><SelectValue placeholder="Faixa" /></SelectTrigger>
            <SelectContent>{TICKET_RANGES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ciclo de Vendas *</Label>
          <Select value={data.sales_cycle} onValueChange={v => onChange({ sales_cycle: v })}>
            <SelectTrigger><SelectValue placeholder="Duração" /></SelectTrigger>
            <SelectContent>{SALES_CYCLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepICP({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const updateList = (key: 'main_pains' | 'common_objections', idx: number, val: string) => {
    const arr = [...data[key]];
    arr[idx] = val;
    onChange({ [key]: arr });
  };
  const addItem = (key: 'main_pains' | 'common_objections') => {
    if (data[key].length < 6) onChange({ [key]: [...data[key], ''] });
  };
  const removeItem = (key: 'main_pains' | 'common_objections', idx: number) => {
    if (data[key].length > 1) onChange({ [key]: data[key].filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Cargo do Comprador Principal *</Label>
        <Input value={data.buyer_role} onChange={e => onChange({ buyer_role: e.target.value })} placeholder="Ex: Diretor de Operações" />
      </div>
      <div className="space-y-2">
        <Label>Principais Dores do Cliente *</Label>
        {data.main_pains.map((pain, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={pain} onChange={e => updateList('main_pains', i, e.target.value)} placeholder={`Dor ${i + 1}`} />
            {data.main_pains.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeItem('main_pains', i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        ))}
        {data.main_pains.length < 6 && (
          <Button variant="outline" size="sm" onClick={() => addItem('main_pains')}><Plus className="h-4 w-4 mr-1" /> Adicionar dor</Button>
        )}
      </div>
      <div className="space-y-2">
        <Label>Objeções Mais Comuns *</Label>
        {data.common_objections.map((obj, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input value={obj} onChange={e => updateList('common_objections', i, e.target.value)} placeholder={`Objeção ${i + 1}`} />
            {data.common_objections.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeItem('common_objections', i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        ))}
        {data.common_objections.length < 6 && (
          <Button variant="outline" size="sm" onClick={() => addItem('common_objections')}><Plus className="h-4 w-4 mr-1" /> Adicionar objeção</Button>
        )}
      </div>
      <div className="space-y-2">
        <Label>Nível de Sofisticação do Comprador</Label>
        <RadioGroup value={data.sophistication_level} onValueChange={(v: any) => onChange({ sophistication_level: v })} className="flex gap-4">
          {[['iniciante', 'Iniciante'], ['intermediario', 'Intermediário'], ['avancado', 'Avançado']].map(([val, label]) => (
            <div key={val} className="flex items-center gap-2">
              <RadioGroupItem value={val} id={`soph-${val}`} />
              <Label htmlFor={`soph-${val}`} className="cursor-pointer">{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

function StepMethodology({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const updateStage = (idx: number, val: string) => {
    const arr = [...data.sales_stages];
    arr[idx] = val;
    onChange({ sales_stages: arr });
  };
  const addStage = () => {
    if (data.sales_stages.length < 8) onChange({ sales_stages: [...data.sales_stages, ''] });
  };
  const removeStage = (idx: number) => {
    if (data.sales_stages.length > 2) onChange({ sales_stages: data.sales_stages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Metodologia de Vendas *</Label>
        <Select value={data.methodology} onValueChange={v => onChange({ methodology: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{METHODOLOGIES.map(m => <SelectItem key={m} value={m}>{m === 'Nenhuma' ? 'Nenhuma — treinar do zero' : m}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Etapas do Funil de Vendas *</Label>
        <p className="text-xs text-muted-foreground">Mínimo 2, máximo 8 etapas</p>
        {data.sales_stages.map((stage, i) => (
          <div key={i} className="flex gap-2 items-center">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Input value={stage} onChange={e => updateStage(i, e.target.value)} placeholder={`Etapa ${i + 1}`} />
            {data.sales_stages.length > 2 && (
              <Button variant="ghost" size="icon" onClick={() => removeStage(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        ))}
        {data.sales_stages.length < 8 && (
          <Button variant="outline" size="sm" onClick={addStage}><Plus className="h-4 w-4 mr-1" /> Adicionar etapa</Button>
        )}
      </div>
    </div>
  );
}

function StepPersonas({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePersonas = async () => {
    setGenerating(true);
    try {
      const companyConfig = {
        company_name: data.company_name,
        segment: data.segment === 'Outro' ? data.segment_custom : data.segment,
        product_description: data.product_description,
        ticket_range: data.ticket_range,
        sales_cycle: data.sales_cycle,
        icp: {
          buyer_role: data.buyer_role,
          main_pains: data.main_pains.filter(Boolean),
          common_objections: data.common_objections.filter(Boolean),
          sophistication_level: data.sophistication_level,
        },
        methodology: data.methodology,
        sales_stages: data.sales_stages.filter(Boolean),
      };

      const { data: result, error } = await supabase.functions.invoke('generate-personas', {
        body: { company_config: companyConfig },
      });

      if (error) throw error;

      onChange({ personas: result.personas || [] });
      toast({ title: 'Personas geradas!', description: '3 personas foram criadas com base no perfil da empresa.' });
    } catch (err: any) {
      console.error('Error generating personas:', err);
      toast({ title: 'Erro ao gerar personas', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const updatePersona = (idx: number, field: string, value: any) => {
    const updated = [...data.personas];
    (updated[idx] as any)[field] = value;
    onChange({ personas: updated });
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (d === 'medium') return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  };
  const difficultyLabel = (d: string) => d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil';

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Button onClick={generatePersonas} disabled={generating} size="lg" className="gap-2">
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {generating ? 'Gerando personas...' : 'Gerar Personas com IA'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">A IA criará 3 personas (fácil, médio, difícil) baseadas no perfil da sua empresa</p>
      </div>

      {data.personas.length > 0 && (
        <div className="grid gap-4">
          {data.personas.map((persona, i) => (
            <Card key={i} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Input value={persona.name} onChange={e => updatePersona(i, 'name', e.target.value)} className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0" />
                  <Badge className={difficultyColor(persona.difficulty)}>{difficultyLabel(persona.difficulty)}</Badge>
                </div>
                <Input value={persona.role} onChange={e => updatePersona(i, 'role', e.target.value)} className="text-sm text-muted-foreground border-none p-0 h-auto focus-visible:ring-0" placeholder="Cargo" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Empresa</Label>
                  <Input value={persona.company} onChange={e => updatePersona(i, 'company', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Textarea value={persona.description} onChange={e => updatePersona(i, 'description', e.target.value)} className="mt-1" rows={2} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StepBranding({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Nome do Aplicativo</Label>
        <Input value={data.app_name} onChange={e => onChange({ app_name: e.target.value })} placeholder={data.company_name || 'Meu App'} />
      </div>
      <div className="space-y-2">
        <Label>Tagline</Label>
        <Input value={data.tagline} onChange={e => onChange({ tagline: e.target.value })} placeholder="Treine sua equipe de vendas com IA" />
      </div>
      <div className="space-y-2">
        <Label>URL do Logo</Label>
        <Input value={data.logo_url} onChange={e => onChange({ logo_url: e.target.value })} placeholder="https://..." />
        {data.logo_url && <img src={data.logo_url} alt="Logo preview" className="h-12 mt-2 object-contain" />}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cor Primária</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={data.primary_color} onChange={e => onChange({ primary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
            <Input value={data.primary_color} onChange={e => onChange({ primary_color: e.target.value })} className="flex-1" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cor Secundária</Label>
          <div className="flex gap-2 items-center">
            <input type="color" value={data.secondary_color} onChange={e => onChange({ secondary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
            <Input value={data.secondary_color} onChange={e => onChange({ secondary_color: e.target.value })} className="flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

const AdminOnboarding = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useTenantContext();

  const update = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }));

  const canProceed = () => {
    switch (step) {
      case 0: return data.company_name && data.segment && data.product_description && data.ticket_range && data.sales_cycle;
      case 1: return data.buyer_role && data.main_pains.some(Boolean) && data.common_objections.some(Boolean);
      case 2: return data.methodology && data.sales_stages.filter(Boolean).length >= 2;
      case 3: return data.personas.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const segment = data.segment === 'Outro' ? data.segment_custom : data.segment;

      const companyConfig = {
        company_name: data.company_name,
        segment,
        product_description: data.product_description,
        ticket_range: data.ticket_range,
        sales_cycle: data.sales_cycle,
        icp: {
          buyer_role: data.buyer_role,
          main_pains: data.main_pains.filter(Boolean),
          common_objections: data.common_objections.filter(Boolean),
          sophistication_level: data.sophistication_level,
        },
        methodology: data.methodology,
        sales_stages: data.sales_stages.filter(Boolean),
        competencies: ['Abertura', 'Perguntas de Situação', 'Perguntas de Problema', 'Perguntas de Implicação', 'Perguntas de Necessidade-Benefício', 'Tratamento de Objeções', 'Fechamento'],
        tone: 'profissional e consultivo',
      };

      let orgId = organization?.id;

      // Create org if doesn't exist
      if (!orgId) {
        const slug = data.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { data: newOrg, error: orgError } = await (supabase as any)
          .from('organizations')
          .insert({ name: data.company_name, slug, company_config: companyConfig })
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = newOrg.id;

        // Add user as owner
        await (supabase as any)
          .from('organization_members')
          .insert({ organization_id: orgId, user_id: user.id, role: 'owner' });
      } else {
        // Update existing org
        await (supabase as any)
          .from('organizations')
          .update({ company_config: companyConfig })
          .eq('id', orgId);
      }

      // Save personas
      if (data.personas.length > 0) {
        const personasToInsert = data.personas.map(p => ({
          name: p.name,
          role: p.role,
          company: p.company,
          sector: segment,
          difficulty: p.difficulty,
          description: p.description,
          personality_traits: p.personality_traits,
          objection_patterns: p.objection_patterns,
          organization_id: orgId,
        }));

        const { error: personasError } = await supabase
          .from('personas')
          .insert(personasToInsert as any);

        if (personasError) {
          console.error('Error saving personas:', personasError);
        }
      }

      // Save branding
      if (data.app_name || data.logo_url || data.tagline) {
        await (supabase as any)
          .from('branding')
          .insert({
            company_name: data.company_name,
            app_name: data.app_name || data.company_name,
            tagline: data.tagline,
            logo_url: data.logo_url,
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            organization_id: orgId,
          });
      }

      toast({ title: 'Onboarding concluído!', description: 'Sua organização está configurada e pronta.' });
      navigate('/admin');
    } catch (err: any) {
      console.error('Error finishing onboarding:', err);
      toast({ title: 'Erro ao salvar', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    <StepCompany data={data} onChange={update} />,
    <StepICP data={data} onChange={update} />,
    <StepMethodology data={data} onChange={update} />,
    <StepPersonas data={data} onChange={update} />,
    <StepBranding data={data} onChange={update} />,
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            {STEP_TITLES.map((title, i) => (
              <span key={i} className={`hidden md:inline ${i === step ? 'text-primary font-semibold' : i < step ? 'text-primary/60' : ''}`}>
                {title}
              </span>
            ))}
            <span className="md:hidden text-primary font-semibold">Passo {step + 1} de 5 — {STEP_TITLES[step]}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEP_TITLES[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Conte-nos sobre sua empresa para personalizar o treinamento'}
              {step === 1 && 'Defina o perfil do seu cliente ideal para cenários realistas'}
              {step === 2 && 'Escolha a metodologia e etapas do seu funil'}
              {step === 3 && 'Gere personas de treino com IA baseadas no seu perfil'}
              {step === 4 && 'Personalize a aparência da plataforma'}
            </CardDescription>
          </CardHeader>
          <CardContent>{STEPS[step]}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={finishOnboarding} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Concluir e Ativar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOnboarding;
