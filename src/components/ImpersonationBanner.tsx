import { useTenantContext } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { X, Eye } from 'lucide-react';

const ImpersonationBanner = () => {
  const raw = localStorage.getItem('superadmin_viewing_org');
  if (!raw) return null;

  let orgInfo: { name: string } | null = null;
  try {
    orgInfo = JSON.parse(raw);
  } catch {
    return null;
  }

  const exitImpersonation = () => {
    localStorage.removeItem('superadmin_viewing_org');
    window.location.href = '/superadmin/organizations';
  };

  return (
    <div className="bg-yellow-500/90 text-yellow-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
      <Eye className="h-4 w-4" />
      <span>Visualizando como: {orgInfo?.name || 'Organização'}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={exitImpersonation}
        className="h-7 px-2 text-yellow-950 hover:bg-yellow-600/30"
      >
        <X className="h-3.5 w-3.5 mr-1" />
        Sair do modo de visualização
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
