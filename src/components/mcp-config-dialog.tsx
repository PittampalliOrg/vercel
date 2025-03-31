"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { MCPConfigForm } from "./mcp-config-form"
import { Button } from "@/components/ui/button"
import { MCPServersProvider } from "./providers/mcp-servers-provider"

interface MCPConfigDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function MCPConfigDialog({ isOpen, onOpenChange }: MCPConfigDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl">MCP Server Configuration</DialogTitle>
          <DialogDescription>
            Manage connections to external MCP servers. Configurations are saved locally.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <MCPServersProvider>
            <MCPConfigForm />
          </MCPServersProvider>
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-gray-50 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

