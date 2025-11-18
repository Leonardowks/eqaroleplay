import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Branding {
  company_name: string;
  app_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  meta_description: string;
  support_email: string | null;
  support_phone: string | null;
  website_url: string | null;
  footer_text: string | null;
  copyright_text: string | null;
}

interface BrandingContextType {
  branding: Branding;
  loading: boolean;
  refresh: () => void;
}

const defaultBranding: Branding = {
  company_name: 'EQA',
  app_name: 'Roleplay',
  tagline: 'Treinamento com IA',
  logo_url: null,
  favicon_url: null,
  primary_color: '213 100% 50%',
  secondary_color: '262 80% 65%',
  accent_color: '174 100% 50%',
  background_color: '222 47% 11%',
  meta_description: 'Plataforma de treinamento com IA',
  support_email: null,
  support_phone: null,
  website_url: null,
  footer_text: null,
  copyright_text: null,
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true,
  refresh: () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const loadBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('branding')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setBranding(data);
        applyBrandingToDOM(data);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyBrandingToDOM = (brandingData: Branding) => {
    // Apply CSS custom properties for colors
    const root = document.documentElement;

    if (brandingData.primary_color) {
      root.style.setProperty('--primary', brandingData.primary_color);
    }
    if (brandingData.secondary_color) {
      root.style.setProperty('--secondary', brandingData.secondary_color);
    }
    if (brandingData.accent_color) {
      root.style.setProperty('--accent', brandingData.accent_color);
    }
    if (brandingData.background_color) {
      root.style.setProperty('--background', brandingData.background_color);
    }

    // Update document title
    document.title = `${brandingData.app_name} - ${brandingData.company_name}`;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && brandingData.meta_description) {
      metaDescription.setAttribute('content', brandingData.meta_description);
    }

    // Update favicon
    if (brandingData.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = brandingData.favicon_url;
      }
    }
  };

  useEffect(() => {
    loadBranding();
  }, []);

  const refresh = () => {
    loadBranding();
  };

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
