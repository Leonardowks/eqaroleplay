// ─── Meeting Type Labels ──────────────────────────────────────────────────────

export const MEETING_TYPE_LABELS: Record<string, string> = {
  prospection: 'Prospecção',
  discovery: 'Descoberta',
  presentation: 'Apresentação',
  negotiation: 'Negociação',
  closing: 'Fechamento',
};

export const getMeetingTypeLabel = (type: string): string =>
  MEETING_TYPE_LABELS[type] || type;

// ─── Difficulty Labels ───────────────────────────────────────────────────────

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-500',
  medium: 'bg-amber-500/10 text-amber-500',
  hard: 'bg-red-500/10 text-red-500',
};

// ─── Chart Colors ────────────────────────────────────────────────────────────

export const CHART_COLORS = [
  'hsl(var(--primary))',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00c49f',
  '#ff8042',
  '#a4de6c',
  '#8884d8',
  '#d0ed57',
] as const;

// ─── SPIN Category Mapping ───────────────────────────────────────────────────

export const SPIN_CATEGORY_MAP: Record<string, string> = {
  'Abertura': 'opening',
  'Perguntas de Situação': 'situation',
  'Descoberta de Situação': 'situation',
  'Perguntas de Problema': 'problem',
  'Identificação de Problemas': 'problem',
  'Perguntas de Implicação': 'implication',
  'Amplificação de Implicações': 'implication',
  'Perguntas de Necessidade-Benefício': 'need_payoff',
  'Apresentação de Valor': 'need_payoff',
  'Tratamento de Objeções': 'objection_handling',
  'Gestão de Objeções': 'objection_handling',
  'Fechamento': 'closing',
  'Qualificação': 'situation',
  'Diagnóstico': 'problem',
  'Negociação': 'objection_handling',
  'Proposta': 'need_payoff',
  'Follow-up': 'closing',
};

// ─── Default Company Config ──────────────────────────────────────────────────

export const DEFAULT_COMPETENCIES = [
  'Abertura',
  'Perguntas de Situação',
  'Perguntas de Problema',
  'Perguntas de Implicação',
  'Perguntas de Necessidade-Benefício',
  'Tratamento de Objeções',
  'Fechamento',
];

export const DEFAULT_SALES_STAGES = [
  'Prospecção',
  'Qualificação',
  'Apresentação',
  'Negociação',
  'Fechamento',
];

// ─── Pagination ──────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_COMPARE_SESSIONS = 3;
