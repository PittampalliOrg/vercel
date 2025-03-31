import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { auth } from "@/lib/auth"
import Script from "next/script"
import { MCPServersProvider } from "@/components/providers/mcp-servers-provider"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

interface ChatLayoutProps {
  children: React.ReactNode
}

const ChatLayout = async ({ children }: ChatLayoutProps) => {
  // Try to get the session, but don't require it for now
  let session
  try {
    session = await auth()

    if (!session) {
      // Uncomment this when auth is properly set up
      // redirect("/");
    }
  } catch (error) {
    console.error("Error getting session:", error)
    // Don't redirect for now to avoid blocking development
  }

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js" strategy="beforeInteractive" />
      <MCPServersProvider>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar user={session?.user} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </MCPServersProvider>
    </>
  )
}

export default ChatLayout

