import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import Header from '@/components/Header';
import BuildInfo from '@/components/BuildInfo';
import ImpersonationBanner from '@/components/ImpersonationBanner';

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <ImpersonationBanner />
          <div className="sticky top-0 z-10 bg-background border-b h-12 flex items-center px-4">
            <SidebarTrigger />
          </div>
          <main className="flex-1 p-8">
            <Outlet />
          </main>
          <BuildInfo />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
