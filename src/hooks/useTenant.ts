import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ICPConfig {
  buyer_role: string;
  main_pains: string[];
  common_objections: string[];
  sophistication_level: 'iniciante' | 'intermediario' | 'avancado';
}

export interface CompanyConfig {
  company_name: string;
  segment: string;
  product_description: string;
  ticket_range: string;
  sales_cycle: string;
  icp: ICPConfig;
  methodology: 'SPIN' | 'BANT' | 'Challenger Sale' | 'Sandler' | 'Consultiva' | 'Nenhuma';
  sales_stages: string[];
  competencies: string[];
  tone: string;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
  company_config: CompanyConfig | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  company_name: 'EQA Roleplay',
  segment: 'SaaS / Tecnologia',
  product_description: 'Plataforma de treinamento de vendas com IA',
  ticket_range: 'R$ 5.000 - R$ 50.000',
  sales_cycle: '30-90 dias',
  icp: {
    buyer_role: 'Gerente de Vendas',
    main_pains: ['Baixa conversão', 'Treinamento ineficiente', 'Falta de prática'],
    common_objections: ['Preço alto', 'Já temos treinamento interno', 'Não tenho tempo'],
    sophistication_level: 'intermediario',
  },
  methodology: 'SPIN',
  sales_stages: ['Prospecção', 'Qualificação', 'Apresentação', 'Negociação', 'Fechamento'],
  competencies: ['Abertura', 'Perguntas de Situação', 'Perguntas de Problema', 'Perguntas de Implicação', 'Perguntas de Necessidade-Benefício', 'Tratamento de Objeções', 'Fechamento'],
  tone: 'profissional e consultivo',
};

function extractSlug(hostname: string): string | null {
  // localhost or IP = dev mode
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Custom domains (no subdomain extraction)
  const parts = hostname.split('.');
  
  // e.g. acme.myapp.com -> subdomain = acme
  // myapp.com -> no subdomain
  // acme.lovable.app -> subdomain = acme
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Skip common non-tenant subdomains
    if (['www', 'app', 'api', 'admin'].includes(subdomain)) return null;
    return subdomain;
  }

  return null;
}

export function useTenant() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(DEFAULT_COMPANY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detectTenant();
  }, []);

  const detectTenant = async () => {
    try {
      const hostname = window.location.hostname;
      const slug = extractSlug(hostname);

      // Dev mode: no tenant detection
      if (!slug) {
        // Try custom_domain match
        if (hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
          const { data, error: fetchError } = await (supabase as any)
            .from('organizations')
            .select('*')
            .eq('custom_domain', hostname)
            .eq('is_active', true)
            .single();

          if (data && !fetchError) {
            const org = data as Organization;
            setOrganization(org);
            if (org.company_config) {
              setCompanyConfig({ ...DEFAULT_COMPANY_CONFIG, ...(org.company_config as any) });
            }
            setIsLoading(false);
            return;
          }
        }

        // Fallback: no org, use defaults
        console.log('[Tenant] Dev mode or no tenant detected, using defaults');
        setIsLoading(false);
        return;
      }

      // Fetch org by slug
      const { data, error: fetchError } = await (supabase as any)
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.warn(`[Tenant] Organization not found for slug: ${slug}`);
        } else {
          console.error('[Tenant] Error fetching organization:', fetchError);
          setError(fetchError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data) {
        const org = data as Organization;
        setOrganization(org);
        if (org.company_config) {
          setCompanyConfig({ ...DEFAULT_COMPANY_CONFIG, ...(org.company_config as any) });
        }
        console.log(`[Tenant] Loaded organization: ${org.name} (${org.slug})`);
      }
    } catch (err: any) {
      console.error('[Tenant] Unexpected error:', err);
      setError(err.message || 'Tenant detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return { organization, companyConfig, isLoading, error };
}
