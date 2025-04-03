import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { auth } from '../(auth)/auth';
import { MCPConnectionProvider } from '@/components/mcp-connection-provider';
import { MCPServersProvider } from '@/components/providers/mcp-servers-provider';
import { MCPConnectionLinker } from '@/components/mcp-connection-linker';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <MCPServersProvider>
        <MCPConnectionProvider>
          <MCPConnectionLinker />
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={session?.user} />
            <SidebarInset className="h-content overflow-auto">
              {children}
              </SidebarInset>
          </SidebarProvider>
        </MCPConnectionProvider>
      </MCPServersProvider>
    </>
  );
}
