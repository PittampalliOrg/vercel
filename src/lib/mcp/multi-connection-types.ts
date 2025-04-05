// src/lib/mcp/multi-connection-types.ts
import type { ServerCapabilities, Tool } from "@modelcontextprotocol/sdk/types.js";

// Adapted from VS Code's McpConnectionState.Kind
export enum McpConnectionStateType {
  Stopped,
  Starting,
  Running,
  Error,
}

// Adapted from VS Code's McpConnectionState (interface definitions)
export interface McpConnectionStateStopped {
  readonly state: McpConnectionStateType.Stopped;
}
export interface McpConnectionStateStarting {
  readonly state: McpConnectionStateType.Starting;
}
export interface McpConnectionStateRunning {
  readonly state: McpConnectionStateType.Running;
}
export interface McpConnectionStateError {
  readonly state: McpConnectionStateType.Error;
  readonly message: string;
}

export type McpConnectionState =
  | McpConnectionStateStopped
  | McpConnectionStateStarting
  | McpConnectionStateRunning
  | McpConnectionStateError;

// Simplified representation of a single server's runtime state in the frontend
export interface McpServerRuntimeState {
  status: McpConnectionState;
  capabilities: ServerCapabilities | null;
  tools: Tool[];
  // Add other relevant runtime data as needed
}

// Helper functions matching VS Code for clarity
export namespace McpConnectionState {
	export const toString = (s: McpConnectionState): string => {
		switch (s.state) {
			case McpConnectionStateType.Stopped:
				return "Stopped";
			case McpConnectionStateType.Starting:
				return "Starting";
			case McpConnectionStateType.Running:
				return "Running";
			case McpConnectionStateType.Error:
				return `Error: ${s.message}`;
		}
	};

    export const isRunning = (s: McpConnectionState) =>
        s.state === McpConnectionStateType.Running || s.state === McpConnectionStateType.Starting;

    export const canBeStarted = (s: McpConnectionState) =>
        s.state === McpConnectionStateType.Stopped || s.state === McpConnectionStateType.Error;
}