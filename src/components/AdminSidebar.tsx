import { Users, BarChart3, MessageSquare, Shield, Settings, Palette, UserCircle, Rocket, ListChecks } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const adminItems = [
  { title: 'Visão Geral', url: '/admin', icon: BarChart3 },
  { title: 'Usuários', url: '/admin/users', icon: Users },
  { title: 'Personas', url: '/admin/personas', icon: UserCircle },
  { title: 'Competências', url: '/admin/competencies', icon: ListChecks },
  { title: 'Sessões', url: '/admin/sessions', icon: MessageSquare },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
  { title: 'Marca & Visual', url: '/admin/branding', icon: Palette },
  { title: 'Onboarding', url: '/admin/onboarding', icon: Rocket },
];

export function AdminSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {open && <span>Admin</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
