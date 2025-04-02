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
import { useMCPServers } from "@/hooks/use-mcp-servers";
import { ServerConfig, StdioConfig, SSEConfig } from "@/lib/mcp/config";

interface McpServerConfigDialogProps {
    serverName?: string; // Provide if editing an existing server
    children: React.ReactNode; // The trigger element (e.g., a Button)
    onOpenChange?: (open: boolean) => void;
}

// Define key-value pair interface
interface KeyValuePair {
    key: string;
    value: string;
}

// Form schema with properly typed fields for useFieldArray
const FormSchema = z.object({
    transport: z.enum(["stdio", "sse"]),
    name: z.string().min(1),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    envPairs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    url: z.string().url().optional(),
    headerPairs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
}).superRefine((data, ctx) => {
    if (data.transport === "stdio") {
        if (!data.command) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["command"],
                message: "Command is required for stdio transport",
            });
        }
    } else {
        if (!data.url) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["url"],
                message: "URL is required for SSE transport",
            });
        }
    }
});

type FormValues = z.infer<typeof FormSchema>;

export function McpServerConfigDialog({
    serverName,
    children,
    onOpenChange,
}: McpServerConfigDialogProps) {
    const { serverConfigs, addServerConfig, updateServerConfig } = useMCPServers();
    const [isOpen, setIsOpen] = useState(false);
    const isEditing = !!serverName;
    const existingConfig = isEditing ? serverConfigs[serverName] : undefined;

    // Initialize form with default values matching our schema
    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            transport: "stdio",
            name: "",
            command: "",
            args: [],
            envPairs: [],
            url: "",
            headerPairs: [],
        },
    });

    // Set up field arrays with explicit typing
    const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({
        control: form.control,
        name: "envPairs",
    });

    const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({
        control: form.control,
        name: "headerPairs",
    });

    // Watch transport type to conditionally render fields
    const transportType = form.watch("transport");

    // Properly handle the args input to prevent split errors
    const argsToString = (args: string[] | undefined): string => {
        if (!args || !Array.isArray(args)) return '';
        return args.join(', ');
    };

    // Reset form when opening/closing or switching between add/edit
    useEffect(() => {
        if (isOpen) {
            // Create a new object to reset the form
            const resetObj: FormValues = {
                name: "",
                transport: "stdio",
                command: "",
                args: [],
                envPairs: [],
                url: "",
                headerPairs: [],
            };

            // If editing, populate from existing config
            if (existingConfig) {
                resetObj.name = existingConfig.name;
                resetObj.transport = existingConfig.transport;

                if (existingConfig.transport === "stdio") {
                    resetObj.command = existingConfig.command;
                    // Don't set args here - we'll handle it differently

                    // Convert env object to array for the field array
                    if (existingConfig.env && typeof existingConfig.env === "object") {
                        resetObj.envPairs = Object.entries(existingConfig.env).map(
                            ([key, value]) => ({ key, value })
                        );
                    }
                } else if (existingConfig.transport === "sse") {
                    resetObj.url = existingConfig.url;

                    // Convert headers object to array for the field array
                    if (existingConfig.headers && typeof existingConfig.headers === "object") {
                        resetObj.headerPairs = Object.entries(existingConfig.headers).map(
                            ([key, value]) => ({ key, value })
                        );
                    }
                }
            }

            // First reset the form without the args field
            form.reset(resetObj);

            // Then set the args field separately if it exists
            if (existingConfig?.transport === 'stdio' && existingConfig.args) {
                form.setValue('args', existingConfig.args);
            }
        }
    }, [isOpen, existingConfig, form]);

    // Convert key-value array fields back to objects
    const processKeyValueFields = (fields: KeyValuePair[] | undefined): Record<string, string> => {
        if (!fields) return {};
        return fields.reduce((acc, field) => {
            if (field.key) { // Only include pairs where key is not empty
                acc[field.key] = field.value;
            }
            return acc;
        }, {} as Record<string, string>);
    };

    const onSubmit = (data: FormValues) => {
        // Create the correct config type based on transport
        if (data.transport === "stdio") {
            // Create a StdioConfig
            const stdioConfig: StdioConfig = {
                name: data.name,
                transport: "stdio",
                command: data.command || "", // Validated by zod
                args: data.args || [],
                env: processKeyValueFields(data.envPairs),
            };

            if (isEditing && serverName) {
                updateServerConfig(serverName, stdioConfig);
            } else {
                addServerConfig(stdioConfig);
            }
        } else {
            // Create an SSEConfig
            const sseConfig: SSEConfig = {
                name: data.name,
                transport: "sse",
                url: data.url || "", // Validated by zod
                headers: processKeyValueFields(data.headerPairs),
            };

            if (isEditing && serverName) {
                updateServerConfig(serverName, sseConfig);
            } else {
                addServerConfig(sseConfig);
            }
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                                        id="args"
                                        placeholder="Comma-separated, e.g. arg1,arg two"
                                        {...form.register("args", {
                                            setValueAs: (v) => {
                                                // Make sure v is a string before trying to split it
                                                if (typeof v === 'string') {
                                                    return v.split(',').map((s: string) => s.trim()).filter(Boolean);
                                                }
                                                // If it's already an array, return it
                                                if (Array.isArray(v)) {
                                                    return v;
                                                }
                                                // Default to empty array
                                                return [];
                                            }
                                        })}
                                        // Use the helper function instead of directly accessing args
                                        defaultValue={
                                            existingConfig?.transport === 'stdio' ? argsToString(existingConfig.args) : ''
                                        }
                                        className="col-span-3 font-mono"
                                    />
                                </div>
                                {/* Environment Variables */}
                                <div className="col-span-4">
                                    <Label className="text-sm font-medium">Environment Variables</Label>
                                    <div className="space-y-2 mt-2">
                                        {envFields.map((field, index) => (
                                            <div key={field.id} className="flex gap-2 items-center">
                                                <Input
                                                    placeholder="Key"
                                                    {...form.register(`envPairs.${index}.key`)}
                                                    className="font-mono"
                                                />
                                                <Input
                                                    placeholder="Value"
                                                    {...form.register(`envPairs.${index}.value`)}
                                                    className="font-mono"
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeEnv(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appendEnv({ key: '', value: '' })}
                                        >
                                            Add Env Var
                                        </Button>
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
                                {/* Headers (e.g., Authorization) */}
                                <div className="col-span-4">
                                    <Label className="text-sm font-medium">Headers</Label>
                                    <div className="space-y-2 mt-2">
                                        {headerFields.map((field, index) => (
                                            <div key={field.id} className="flex gap-2 items-center">
                                                <Input
                                                    placeholder="Header Name"
                                                    {...form.register(`headerPairs.${index}.key`)}
                                                    className="font-mono"
                                                />
                                                <Input
                                                    placeholder="Header Value"
                                                    {...form.register(`headerPairs.${index}.value`)}
                                                    className="font-mono"
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeHeader(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appendHeader({ key: '', value: '' })}
                                        >
                                            Add Header
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {isEditing ? "Save Changes" : "Add Server"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}