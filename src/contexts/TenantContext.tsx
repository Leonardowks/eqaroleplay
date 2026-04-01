import React, { createContext, useContext } from 'react';
import { useTenant, type Organization, type CompanyConfig } from '@/hooks/useTenant';

interface TenantContextType {
  organization: Organization | null;
  companyConfig: CompanyConfig;
  isLoading: boolean;
  error: string | null;
  isImpersonating: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tenant = useTenant();

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
};
