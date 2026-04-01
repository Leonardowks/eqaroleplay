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
  company_name: 'Roleplay',
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
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
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
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    detectTenant();
  }, []);

  const applyOrg = (org: Organization) => {
    setOrganization(org);
    if (org.company_config) {
      setCompanyConfig({ ...DEFAULT_COMPANY_CONFIG, ...(org.company_config as any) });
    }
  };

  const detectTenant = async () => {
    try {
      // Check for superadmin impersonation first
      const impersonateRaw = localStorage.getItem('superadmin_viewing_org');
      if (impersonateRaw) {
        try {
          const impersonateInfo = JSON.parse(impersonateRaw);
          if (impersonateInfo?.id) {
            const { data, error: fetchError } = await (supabase as any)
              .from('organizations')
              .select('*')
              .eq('id', impersonateInfo.id)
              .single();

            if (data && !fetchError) {
              applyOrg(data as Organization);
              setIsImpersonating(true);
              console.log(`[Tenant] Impersonating organization: ${data.name}`);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          localStorage.removeItem('superadmin_viewing_org');
        }
      }

      const hostname = window.location.hostname;
      const slug = extractSlug(hostname);

      if (!slug) {
        if (hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
          const { data, error: fetchError } = await (supabase as any)
            .from('organizations')
            .select('*')
            .eq('custom_domain', hostname)
            .eq('is_active', true)
            .single();

          if (data && !fetchError) {
            applyOrg(data as Organization);
            setIsLoading(false);
            return;
          }
        }

        console.log('[Tenant] Dev mode or no tenant detected, using defaults');
        setIsLoading(false);
        return;
      }

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
        applyOrg(data as Organization);
        console.log(`[Tenant] Loaded organization: ${data.name} (${data.slug})`);
      }
    } catch (err: any) {
      console.error('[Tenant] Unexpected error:', err);
      setError(err.message || 'Tenant detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return { organization, companyConfig, isLoading, error, isImpersonating };
}
