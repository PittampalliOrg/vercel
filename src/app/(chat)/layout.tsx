// src/app/(chat)/layout.tsx
import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/app/(auth)/auth"; // Use correct auth import
import Script from "next/script";
import { MCPServersProvider } from "@/components/providers/mcp-servers-provider"; // Corrected path
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MCPConnectionProvider } from "../../components/mcp-connection-provider";
import { MCPConnectionLinker } from "@/components/mcp-connection-linker";
import { TooltipProvider } from "@/components/ui/tooltip"; // Add TooltipProvider

interface ChatLayoutProps {
  children: React.ReactNode;
}

const ChatLayout = async ({ children }: ChatLayoutProps) => {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Error getting session in ChatLayout:", error);
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      {/* TooltipProvider is often needed for Shadcn UI components */}
      <TooltipProvider delayDuration={0}>
        <MCPServersProvider>
          <MCPConnectionProvider>
            {/* Linker must be inside both providers */}
            <MCPConnectionLinker />
            <SidebarProvider defaultOpen={true}>
              <AppSidebar user={session?.user} />
              <SidebarInset>{children}</SidebarInset>
            </SidebarProvider>
          </MCPConnectionProvider>
        </MCPServersProvider>
      </TooltipProvider>
    </>
  );
};

export default ChatLayout;