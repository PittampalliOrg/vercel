// src/app/(chat)/layout.tsx
// --- MAKE SURE THIS FILE LOOKS EXACTLY LIKE THIS ---
import { cookies } from 'next/headers';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '../(auth)/auth';
// --- (Ensure) the old provider imports are DELETED ---

export const experimental_ppr = true;

export default async function Layout({ children }: { children: React.ReactNode; }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    // --- NO PROVIDERS SHOULD WRAP SidebarProvider HERE ---
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
      <SidebarInset className="h-content overflow-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
    // --- END ---
  );
}