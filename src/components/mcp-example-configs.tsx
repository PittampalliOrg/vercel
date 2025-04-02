"use client";

import {
  Calculator,
  Search,
  Database,
  ArrowRight,
} from "lucide-react";
import { JSX } from "react";

type ExampleConfig = {
  name: string;
  description: string;
  config: Record<string, any>;
  icon: JSX.Element;
};

export type ExampleConfigSet = Record<
  string,
  | {
      name: string;
      transport: "stdio";
      command: string;
      args: string[];
      env: Record<string, string>;
    }
  | {
      name: string;
      transport: "sse";
      url: string;
      headers: Record<string, string>;
    }
>;

const EXAMPLE_CONFIGS: ExampleConfig[] = [
  {
    name: "Postgres",
    description:
      "An interface for connecting to a Postgres database",
    icon: <Calculator className="h-4 w-4 text-gray-600" />,
    config: {
      postgres: {
        name: "postgres",
        transport: "stdio",
        command: "docker",
        args: [
          "run", 
          "-i", 
          "--rm", 
          "mcp/postgres", 
          "postgresql://postgres:postgres@host.docker.internal:5432/postgres"],
        env: {}
      },
    },
  },
  {
    name: "Web Search",
    description: "Connect to a search service via SSE",
    icon: <Search className="h-4 w-4 text-gray-600" />,
    config: {
      search: {
        name: "search",
        transport: "sse",
        url: "http://localhost:8000/search/events",
        headers: {}
      },
    },
  },
  {
    name: "Full Stack",
    description:
      "A combination of multiple services for comprehensive functionality",
    icon: <Database className="h-4 w-4 text-gray-600" />,
    config: {
      math: {
        name: "math",
        transport: "stdio",
        command: "python",
        args: ["agent/math_server.py"],
        env: {}
      },
      search: {
        name: "search",
        transport: "sse",
        url: "http://localhost:8000/search/events",
        headers: {}
      },
      database: {
        name: "database",
        transport: "stdio",
        command: "node",
        args: ["scripts/db_server.js"],
        env: {}
      },
    },
  },
];

interface ExampleConfigsProps {
  onSelectConfig: (configs: ExampleConfigSet) => void;
}

export function ExampleConfigs({ onSelectConfig }: ExampleConfigsProps) {
  return (
    <div className="bg-white border rounded-md p-4">
      <div className="grid grid-cols-1 gap-3">
        {EXAMPLE_CONFIGS.map((example) => (
          <div
            key={example.name}
            className="border rounded-md p-3 hover:border-gray-500 hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex">
                <div className="mt-1 mr-2">{example.icon}</div>
                <div>
                  <h4 className="font-medium">{example.name}</h4>
                  <p className="text-sm text-gray-600">{example.description}</p>
                </div>
              </div>
              <button
                onClick={() => onSelectConfig(example.config)}
                className="px-2 py-1 bg-gray-800 text-white text-xs rounded hover:bg-gray-700 flex items-center"
              >
                Use This
                <ArrowRight className="ml-1 h-3 w-3" />
              </button>
            </div>
            <div className="mt-2">
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-24">
                {JSON.stringify(example.config, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
