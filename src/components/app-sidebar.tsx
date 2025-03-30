// src/components/app-sidebar.tsx (Corrected)
'use client'; // Ensure this is marked as a client component

import * as React from 'react';
import Link from 'next/link';
import { type User } from 'next-auth';

// Corrected Sidebar imports (assuming Sidebar is the main container and content goes inside)
// Removed SidebarBody and SidebarItem imports as they don't seem to exist based on the error.
// We'll use standard components like Button/Link for items.
import { Sidebar } from '@/components/ui/sidebar';

// Corrected Icon imports (assuming lucide-react is used)
import {
  Plus,
  Github,
  Settings,
  Sidebar as SidebarIcon // Renamed to avoid conflict
} from 'lucide-react';

import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Separator } from '@/components/ui/separator'; // Assuming this path is correct
import { ThemeProvider } from '@/components/theme-provider'; // Assuming this path is correct
import { MCPConfigDialog } from './mcp-config-dialog'; // Path seems correct relative to components dir
import { Button } from '@/components/ui/button'; // Assuming Button exists

interface AppSidebarProps {
  user: User | undefined;
}

export function AppSidebar({ user }: AppSidebarProps) {
  // State for dialog visibility - remains the same
  const [isMcpConfigOpen, setIsMcpConfigOpen] = React.useState(false);

  return (
    <> {/* Fragment needed to render dialog alongside Sidebar */}
      <Sidebar className="flex flex-col h-full"> {/* Added flex-col and h-full */}
        {/* Use direct children or structure based on actual Sidebar component API */}
        {/* Assuming content goes directly inside or specific slots */}

        <div className="p-4 border-b"> {/* Example Header */}
             <Link href="/frontend">
                <Button variant="outline" className="w-full h-9 justify-start px-3">
                    <Plus className="mr-2 size-4 flex-shrink-0"/>
                    New Chat
                </Button>
            </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2"> {/* Scrollable History Area */}
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</p>
            <React.Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading history...</div>}>
              {/* Removed @ts-expect-error - address type errors if they arise */}
              <SidebarHistory user={user} />
            </React.Suspense>
        </div>

        {/* Footer Section */}
        <div className="mt-auto p-4 border-t space-y-2">
            {/* --- MCP Config Button --- */}
            {/* Use Button component, styled appropriately */}
            <Button
              variant="ghost"
              className="w-full justify-start h-9 px-3"
              onClick={() => setIsMcpConfigOpen(true)}
            >
               <Settings className="mr-2 size-4 flex-shrink-0" />
               <span className="truncate">MCP Config</span>
            </Button>
            {/* --- End MCP Config Button --- */}

            {/* <ThemeProvider /> */}
            {user && <SidebarUserNav user={user} />}

            {/* Use Button or Link styled as SidebarItem */}
            <Button variant="ghost" className="w-full justify-start h-9 px-3 text-xs text-muted-foreground" asChild>
                <Link href="https://github.com/vercel/ai" target="_blank" rel="nofollow noreferrer">
                    <Github className="mr-2 size-4 flex-shrink-0"/>
                    AI SDK GitHub
                </Link>
            </Button>
          </div>

      </Sidebar>

      {/* Render the MCP Config Dialog */}
      <MCPConfigDialog
        isOpen={isMcpConfigOpen}
        onOpenChange={setIsMcpConfigOpen}
      />
    </>
  );
}


// 'use client';

// import type { User } from 'next-auth';
// import { useRouter } from 'next/navigation';

// import { PlusIcon } from '@/components/icons';
// import { SidebarHistory } from '@/components/sidebar-history';
// import { SidebarUserNav } from '@/components/sidebar-user-nav';
// import { Button } from '@/components/ui/button';
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarHeader,
//   SidebarMenu,
//   useSidebar,
// } from '@/components/ui/sidebar';
// import Link from 'next/link';
// import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

// export function AppSidebar({ user }: { user: User | undefined }) {
//   const router = useRouter();
//   const { setOpenMobile } = useSidebar();

//   return (
//     <Sidebar className="group-data-[side=left]:border-r-0">
//       <SidebarHeader>
//         <SidebarMenu>
//           <div className="flex flex-row justify-between items-center">
//             <Link
//               href="/"
//               onClick={() => {
//                 setOpenMobile(false);
//               }}
//               className="flex flex-row gap-3 items-center"
//             >
//               <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
//                 Chatbot
//               </span>
//             </Link>
//             <Tooltip>
//               <TooltipTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   type="button"
//                   className="p-2 h-fit"
//                   onClick={() => {
//                     setOpenMobile(false);
//                     router.push('/');
//                     router.refresh();
//                   }}
//                 >
//                   <PlusIcon />
//                 </Button>
//               </TooltipTrigger>
//               <TooltipContent align="end">New Chat</TooltipContent>
//             </Tooltip>
//           </div>
//         </SidebarMenu>
//       </SidebarHeader>
//       <SidebarContent>
//         <SidebarHistory user={user} />
//       </SidebarContent>
//       <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
//     </Sidebar>
//   );
// }
