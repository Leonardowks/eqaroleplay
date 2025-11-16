import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  personas: any[];
}

export interface FilterState {
  personaId?: string;
  difficulty?: string;
  meetingType?: string;
  method?: string;
  scoreRange: [number, number];
  dateRange?: string;
}

const DashboardFilters = ({ onFilterChange, personas }: DashboardFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    scoreRange: [0, 100]
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = { scoreRange: [0, 100] };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = 
    filters.personaId || 
    filters.difficulty || 
    filters.meetingType || 
    filters.method ||
    filters.dateRange ||
    (filters.scoreRange[0] !== 0 || filters.scoreRange[1] !== 100);

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros Avançados
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {Object.values(filters).filter(v => v && v !== '' && !(Array.isArray(v) && v[0] === 0 && v[1] === 100)).length}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2 text-destructive"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <div className={cn(
        "grid gap-4 transition-all overflow-hidden",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Persona Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Persona</label>
              <Select
                value={filters.personaId}
                onValueChange={(value) => updateFilter('personaId', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as personas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Dificuldade</label>
              <Select
                value={filters.difficulty}
                onValueChange={(value) => updateFilter('difficulty', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Reunião</label>
              <Select
                value={filters.meetingType}
                onValueChange={(value) => updateFilter('meetingType', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="prospecting">Prospecção</SelectItem>
                  <SelectItem value="discovery">Descoberta</SelectItem>
                  <SelectItem value="presentation">Apresentação</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Method Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Método</label>
              <Select
                value={filters.method}
                onValueChange={(value) => updateFilter('method', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="voice">Voz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => updateFilter('dateRange', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todo período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Score Range Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Faixa de Score: {filters.scoreRange[0]} - {filters.scoreRange[1]}
              </label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={filters.scoreRange}
                onValueChange={(value) => updateFilter('scoreRange', value)}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardFilters;
