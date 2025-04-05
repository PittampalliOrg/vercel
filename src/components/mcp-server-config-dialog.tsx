// src/components/mcp-server-config-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useMCPServers } from "@/components/providers/mcp-servers-provider";
import { ServerConfig, StdioConfigSchema, SSEConfigSchema, SSEConfig } from "@/lib/mcp/config"; // Import specific types too

interface McpServerConfigDialogProps {
  serverName?: string;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

// Zod schema for the form
const FormSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  transport: z.enum(["stdio", "sse"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(), // Keep as array for form input splitting
  env: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  url: z.string().optional(),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
}).superRefine((data, ctx) => {
  if (data.transport === "stdio") {
    if (!data.command || data.command.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["command"],
        message: "Command is required for stdio transport",
      });
    }
  } else if (data.transport === "sse") {
    if (!data.url || data.url.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "URL is required for SSE transport",
      });
    }
    try {
       if(data.url) new URL(data.url);
    } catch (_) {
       ctx.addIssue({
         code: z.ZodIssueCode.custom,
         path: ["url"],
         message: "Invalid URL format",
       });
    }
  }
});

type FormValues = z.infer<typeof FormSchema>;

// Helper to convert key-value array from form to Record
const arrayToRecord = (arr: Array<{ key: string; value: string }> | undefined): Record<string, string> | undefined => {
  if (!arr) return undefined;
  const record = arr.reduce((acc, item) => {
    if (item.key) {
      acc[item.key] = item.value;
    }
    return acc;
  }, {} as Record<string, string>);
  return Object.keys(record).length > 0 ? record : undefined; // Return undefined if empty
};

// Helper to convert Record to key-value array for form
const recordToArray = (rec: Record<string, string> | undefined): Array<{ key: string; value: string }> => {
  if (!rec) return [];
  return Object.entries(rec).map(([key, value]) => ({ key, value }));
};


export function McpServerConfigDialog({
  serverName,
  children,
  onOpenChange,
}: McpServerConfigDialogProps) {
  const { serverConfigs, addServerConfig, updateServerConfig } = useMCPServers();
  const [isOpen, setIsOpen] = useState(false);
  const isEditing = !!serverName;
  const existingConfig = isEditing ? serverConfigs[serverName] : undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      transport: "stdio",
      name: "",
      command: "",
      args: [],
      env: [],
      url: "",
      headers: [],
    },
  });

  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
    control: form.control,
    name: "env",
  });

  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
    control: form.control,
    name: "headers",
  });

  const transportType = form.watch("transport");

  useEffect(() => {
    if (isOpen) {
      if (existingConfig) {
        form.reset({
          name: existingConfig.name,
          transport: existingConfig.transport,
          command: existingConfig.transport === 'stdio' ? existingConfig.command : undefined,
          args: existingConfig.transport === 'stdio' ? existingConfig.args : undefined,
          env: existingConfig.transport === 'stdio' ? recordToArray(existingConfig.env) : [],
          url: existingConfig.transport === 'sse' ? existingConfig.url : undefined,
          headers: existingConfig.transport === 'sse' ? recordToArray(existingConfig.headers) : [],
        });
      } else {
        form.reset({
          transport: "stdio", name: "", command: "", args: [], env: [], url: "", headers: [],
        });
      }
    }
  }, [isOpen, existingConfig, form]);

  // Corrected onSubmit logic
  const onSubmit = (data: FormValues) => {
      let finalConfig: ServerConfig; // Use the specific union type

      if (data.transport === 'stdio') {
          // Build StdioServerConfig
          finalConfig = {
              name: data.name,
              transport: 'stdio',
              command: data.command!, // Validated by Zod
              args: data.args && data.args.length > 0 ? data.args : [],
              env: arrayToRecord(data.env) ?? {},
          };
      } else { // transport === 'sse'
          // Build SseServerConfig
          finalConfig = {
              name: data.name,
              transport: 'sse',
              url: data.url!, // Validated by Zod
              headers: arrayToRecord(data.headers) ?? {},
          };
      }

      if (isEditing && serverName) {
          updateServerConfig(serverName, finalConfig);
      } else {
          addServerConfig(finalConfig);
      }
      handleClose();
  };


  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add"} MCP Server</DialogTitle>
            <DialogDescription>
              Configure the connection details for the MCP server.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Server Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" {...form.register("name")} className="col-span-3" />
              {form.formState.errors.name && (
                <p className="col-span-4 text-xs text-red-500 text-right">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Transport Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transport" className="text-right">Transport</Label>
              <Controller
                name="transport"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select transport type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stdio">STDIO</SelectItem>
                      <SelectItem value="sse">SSE</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* STDIO Fields */}
            {transportType === "stdio" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="command" className="text-right">Command</Label>
                  <Input id="command" {...form.register("command")} className="col-span-3 font-mono" />
                  {form.formState.errors.command && (
                    <p className="col-span-4 text-xs text-red-500 text-right">{form.formState.errors.command.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="args" className="text-right">Arguments</Label>
                  <Input
                    id="args-input"
                    placeholder="Comma-separated, e.g. arg1, arg two"
                    // Register field, transform value on change/submit
                    {...form.register("args", {
                      setValueAs: (value: string) => value ? value.split(',').map(s => s.trim()).filter(Boolean) : [],
                    })}
                    // Display current value correctly if it's already an array
                    defaultValue={Array.isArray(form.getValues('args')) ? form.getValues('args')?.join(', ') : ''}
                    className="col-span-3 font-mono"
                  />
                  {form.formState.errors.args && (
                    <p className="col-span-4 text-xs text-red-500 text-right">{(form.formState.errors.args as any)?.message}</p>
                  )}
                </div>
                {/* Environment Variables */}
                <div className="col-span-4">
                  <Label className="text-sm font-medium">Environment Variables</Label>
                  <div className="space-y-2 mt-2">
                    {envFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-center">
                        <Input placeholder="Key" {...form.register(`env.${index}.key`)} className="font-mono" />
                        <Input placeholder="Value" {...form.register(`env.${index}.value`)} className="font-mono" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEnv(index)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendEnv({ key: '', value: '' })}>Add Env Var</Button>
                  </div>
                </div>
              </>
            )}

            {/* SSE Fields */}
            {transportType === "sse" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">URL</Label>
                  <Input id="url" type="url" {...form.register("url")} className="col-span-3 font-mono" placeholder="http://..." />
                  {form.formState.errors.url && (
                    <p className="col-span-4 text-xs text-red-500 text-right">{form.formState.errors.url.message}</p>
                  )}
                </div>
                {/* Headers */}
                <div className="col-span-4">
                  <Label className="text-sm font-medium">Headers</Label>
                  <div className="space-y-2 mt-2">
                    {headerFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-center">
                        <Input placeholder="Header Name" {...form.register(`headers.${index}.key`)} className="font-mono" />
                        <Input placeholder="Header Value" {...form.register(`headers.${index}.value`)} className="font-mono" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeHeader(index)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendHeader({ key: '', value: '' })}>Add Header</Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {form.formState.isSubmitting ? "Saving..." : (isEditing ? "Save Changes" : "Add Server")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}