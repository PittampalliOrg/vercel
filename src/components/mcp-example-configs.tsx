"use client";

import {
  Calculator,
  Search,
  Database,
  ArrowRight,
  Network, // Assuming Network icon for Postgres
} from "lucide-react";
import { JSX } from "react";
import { ServerConfig } from "@/lib/mcp/config"; // Import the config type

type ExampleConfig = {
  name: string;
  description: string;
  config: ServerConfig; // Use the imported ServerConfig type
  icon: JSX.Element;
};

const EXAMPLE_CONFIGS: ExampleConfig[] = [
  {
    name: "Postgres Demo",
    description:
      "Connect to the demo Postgres MCP server via stdio using npx.",
    icon: <Database className="h-4 w-4 text-gray-600" />,
    config: {
      name: "Postgres Demo", // Ensure name matches
      transport: "stdio",
      command: "npx",
      args: [ // Fix: Each argument is a separate string
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgres://postgres:postgres@db:5432/postgres" // Connection string as one argument
      ],
       env: {POSTGRES_USER: "postgres"}, // env is optional in the type
    },
  },
  {
    name: "Grafana Demo",
    description:
      "Connect to the demo Grafana MCP server.",
    icon: <Network className="h-4 w-4 text-gray-600" />, // Example icon
    config: {
      name: "Grafana Demo", // Ensure name matches
      transport: "stdio",
      command: "mcp-grafana", // Adjust command if needed
      args: [], // Add args if required by mcp-grafana
      env: {}, // Add env vars like GRAFANA_URL, GRAFANA_API_KEY if needed locally
    },
  },
  // Add other examples if needed
];

interface ExampleConfigsProps {
  onSelectConfig: (config: ServerConfig) => void; // Use ServerConfig type
}

export function ExampleConfigs({ onSelectConfig }: ExampleConfigsProps) {
  return (
    <div className="bg-card border rounded-md p-4">
      <div className="grid grid-cols-1 gap-3">
        {EXAMPLE_CONFIGS.map((example) => (
          <div
            key={example.name}
            className="border rounded-md p-3 hover:border-muted-foreground/50 hover:bg-muted/50 transition-colors duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex">
                <div className="mt-1 mr-2 flex-shrink-0">{example.icon}</div>
                <div>
                  <h4 className="font-medium">{example.name}</h4>
                  <p className="text-sm text-muted-foreground">{example.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onSelectConfig(example.config)}
                className="ml-4 flex-shrink-0"
              >
                Use This
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="mt-2">
               {/* Display relevant config details based on transport */}
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24 font-mono">
                {`transport: ${example.config.transport}\n`}
                {example.config.transport === 'stdio' && `command: ${example.config.command}\n`}
                {example.config.transport === 'stdio' && `args: ${JSON.stringify(example.config.args)}\n`}
                {example.config.transport === 'sse' && `url: ${example.config.url}\n`}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Make sure to import Button if not already imported globally
import { Button } from "@/components/ui/button";