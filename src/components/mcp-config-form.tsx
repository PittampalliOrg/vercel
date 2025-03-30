// src/components/mcp-config-form.tsx (Moved and Refactored)
"use client";

import React, { useState } from "react";
import { ExampleConfigs } from "./mcp-example-configs"; // Use relative path
import { useLocalStorage } from "../app/(mcp)/hooks/useLocalStorage"; // Use hook from shared location

// Types remain the same
type ConnectionType = "stdio" | "sse";
interface StdioConfig {
  command: string;
  args: string[];
  transport: "stdio";
}
interface SSEConfig {
  url: string;
  transport: "sse";
}
type ServerConfig = StdioConfig | SSEConfig;

// Local storage key remains the same
const STORAGE_KEY = "mcp-agent-state"; // Keep key for persistence

// ExternalLink component remains the same
const ExternalLink = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /> </svg>
);

export function MCPConfigForm() {
  // Use localStorage hook directly for the config object
  const [configs, setConfigs, saveStatus] = useLocalStorage<Record<string, ServerConfig>>(
    STORAGE_KEY,
    {}
  );

  // Local state for the form inputs and UI toggles
  const [serverName, setServerName] = useState("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [showExampleConfigs, setShowExampleConfigs] = useState(false);

  // Derive server statistics directly from the 'configs' state
  const totalServers = Object.keys(configs).length;
  const stdioServers = Object.values(configs).filter(c => c.transport === "stdio").length;
  const sseServers = Object.values(configs).filter(c => c.transport === "sse").length;

  // --- Logic Functions ---

  const handleExampleConfig = (exampleConfig: Record<string, ServerConfig>) => {
    if (Object.keys(configs).length > 0) {
      const shouldReplace = window.confirm(
        "Replace current configuration with this example? (Cancel to merge)"
      );
      if (shouldReplace) {
        setConfigs(exampleConfig);
      } else {
        setConfigs({ ...configs, ...exampleConfig });
      }
    } else {
      setConfigs(exampleConfig);
    }
    setShowExampleConfigs(false);
  };

  const addConfig = () => {
    if (!serverName.trim()) {
      alert("Server name cannot be empty."); // Basic validation
      return;
    }
     if (configs[serverName.trim()]) {
       alert(`Server name "${serverName.trim()}" already exists.`);
       return;
     }

    const newConfig =
      connectionType === "stdio"
        ? { command, args: args.split(" ").filter((arg) => arg.trim() !== ""), transport: "stdio" as const }
        : { url, transport: "sse" as const };

    setConfigs({ ...configs, [serverName.trim()]: newConfig });

    // Reset form
    setServerName(""); setCommand(""); setArgs(""); setUrl(""); setConnectionType('stdio');
    setShowAddServerForm(false); // Close the add form/modal
  };

  const removeConfig = (name: string) => {
    if (window.confirm(`Are you sure you want to remove server "${name}"?`)) {
        const newConfigs = { ...configs };
        delete newConfigs[name];
        setConfigs(newConfigs);
    }
  };

  // --- Render Logic ---
  return (
    // Adjusted padding for dialog context
    <div className="space-y-6 p-1">

        {/* Optional: Save Status Indicator */}
        {saveStatus !== 'idle' && (
            <div className={`text-xs text-right px-2 py-0.5 rounded ${saveStatus === 'saving' ? 'text-yellow-600 animate-pulse' : saveStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Error Saving'}
            </div>
        )}

       {/* Add Server Button */}
       <div className="flex justify-end">
         <button
            onClick={() => setShowAddServerForm(true)}
            className="px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 flex items-center gap-1"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Server
          </button>
       </div>


      {/* Server Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-md p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Total Servers</div>
          <div className="text-2xl font-semibold">{totalServers}</div>
        </div>
         <div className="bg-white border rounded-md p-3 shadow-sm">
             <div className="text-xs text-gray-500 mb-1">Stdio Servers</div>
             <div className="text-2xl font-semibold">{stdioServers}</div>
         </div>
         <div className="bg-white border rounded-md p-3 shadow-sm">
             <div className="text-xs text-gray-500 mb-1">SSE Servers</div>
             <div className="text-2xl font-semibold">{sseServers}</div>
         </div>
      </div>

      {/* Example Configs Button & Section */}
      <div className="mt-4 mb-4">
        <button
            onClick={() => setShowExampleConfigs(!showExampleConfigs)}
            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
            <span>Example Configurations</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ml-1 transition-transform ${showExampleConfigs ? "rotate-180" : "" }`} fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /> </svg>
        </button>
        {showExampleConfigs && (
          <div className="mt-2 border rounded-md shadow-sm">
            <ExampleConfigs onSelectConfig={handleExampleConfig} />
          </div>
        )}
      </div>

      {/* Server List */}
      <div className="bg-white border rounded-md p-4 shadow-sm">
        <h3 className="text-md font-semibold mb-4 text-gray-700">Configured Servers</h3>
        {totalServers === 0 ? (
          <div className="text-gray-400 text-center py-8 text-sm">
            No servers configured yet. Click &quot;Add Server&quot; to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(configs).map(([name, config]) => (
              <div key={name} className="border rounded-md overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                      <div className="flex justify-between items-start">
                          <div>
                              <h4 className="font-semibold text-gray-800">{name}</h4>
                              <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                                  {config.transport === "stdio" ? ( <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> )}
                                  {config.transport}
                              </div>
                          </div>
                          <button onClick={() => removeConfig(name)} className="text-gray-400 hover:text-red-500 p-1 -m-1" aria-label={`Remove ${name} server`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                      </div>
                      <div className="mt-3 text-xs text-gray-600 space-y-1">
                          {config.transport === "stdio" ? ( <> <p>Command: <code className="bg-gray-100 px-1 rounded">{config.command}</code></p> <p className="truncate">Args: <code className="bg-gray-100 px-1 rounded">{config.args.join(" ")}</code></p> </> ) : ( <p className="truncate">URL: <code className="bg-gray-100 px-1 rounded">{config.url}</code></p> )}
                      </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Server Modal/Form */}
      {showAddServerForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center text-gray-800"> <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Add New Server </h2>
                  <button onClick={() => setShowAddServerForm(false)} className="text-gray-400 hover:text-gray-700"> <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> </button>
              </div>
              {/* Add Server Form Inputs */}
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Server Name <span className="text-red-500">*</span></label>
                      <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., api-service, data-processor" required />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700">Connection Type</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setConnectionType("stdio")} className={`px-3 py-2 border rounded-md text-center text-sm flex items-center justify-center transition-colors ${ connectionType === "stdio" ? "bg-gray-200 border-gray-400 text-gray-800 font-medium" : "bg-white text-gray-700 hover:bg-gray-50" }`}> <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Standard IO </button>
                          <button type="button" onClick={() => setConnectionType("sse")} className={`px-3 py-2 border rounded-md text-center text-sm flex items-center justify-center transition-colors ${ connectionType === "sse" ? "bg-gray-200 border-gray-400 text-gray-800 font-medium" : "bg-white text-gray-700 hover:bg-gray-50" }`}> <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg> SSE </button>
                      </div>
                  </div>
                  {connectionType === "stdio" ? ( <> <div> <label className="block text-sm font-medium mb-1 text-gray-700">Command <span className="text-red-500">*</span></label> <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., python, node" required /> </div> <div> <label className="block text-sm font-medium mb-1 text-gray-700">Arguments</label> <input type="text" value={args} onChange={(e) => setArgs(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., path/to/script.py arg1" /> </div> </> ) : ( <div> <label className="block text-sm font-medium mb-1 text-gray-700">URL <span className="text-red-500">*</span></label> <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., http://localhost:8000/events" required /> </div> )}
                  {/* Form Actions */}
                  <div className="flex justify-end space-x-2 pt-2">
                      <button type="button" onClick={() => setShowAddServerForm(false)} className="px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"> Cancel </button>
                      <button type="button" onClick={addConfig} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium"> Add Server </button>
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}