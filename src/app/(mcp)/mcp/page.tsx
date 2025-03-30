"use client";

import { useChat } from "ai/react"; // Import useChat hook from Vercel AI SDK
import { MCPConfigForm } from "../components/MCPConfigForm"; // Keep the config form
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button"; // Assuming Button component exists
import { Input } from "@/components/ui/input"; // Assuming Input component exists
import { ScrollArea } from "@/components/ui/scroll-area"; // Assuming ScrollArea exists
import { generateUUID } from '@/lib/utils'; // Utility for generating IDs

// --- Icons for the chat toggle button ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> </svg>;
const LoadingIcon = () => <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>;
// ---

export default function Home() {
  // State for chat sidebar visibility
  const [isChatOpen, setIsChatOpen] = useState(true);
  // State for the current chat session ID
  const [chatId, setChatId] = useState<string | null>(null);
  // State for the selected AI model (can be made dynamic later)
  const [selectedModel] = useState<string>('chat-model-small'); // Default model

  // --- Effects ---
  // Generate a unique chat ID when the component mounts if one doesn't exist
  useEffect(() => {
    if (!chatId) {
      setChatId(generateUUID());
    }
    // Set initial chat visibility based on screen size for non-mobile devices
    if (typeof window !== 'undefined') {
      setIsChatOpen(window.innerWidth >= 1024); // Tailwind 'lg' breakpoint
    }
  }, [chatId]); // Rerun if chatId changes (only happens once on init)


  // --- Vercel AI SDK Chat Hook ---
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    // Point to the API route within the (chat) group
    api: "/frontend/api/chat",
    // Pass the current chatId to the hook; it includes this in requests
    id: chatId ?? undefined,
    // Add required parameters to the request body
    body: {
      // `id` is automatically handled by useChat when provided in options
      selectedChatModel: selectedModel
    },
    // Handle potential errors from the API
    onError: (err) => {
      console.error("Chat API error:", err);
      // Consider adding user feedback, e.g., using react-hot-toast
      // toast.error(`Chat error: ${err.message}`);
    },
     // Clear chat when ID changes (optional, for starting fresh)
     onFinish: () => {
       // You could potentially clear messages if a *new* chatId is generated,
       // but typically you'd load existing messages if the ID is persisted.
     }
  });

  // Ref for auto-scrolling the message list
  const scrollAreaRef = useRef<HTMLDivElement>(null);
   useEffect(() => {
    if (scrollAreaRef.current) {
      // Scroll to the bottom when new messages are added
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]); // Dependency array includes messages

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Main content area (MCP Config Form) */}
      <div className={`flex-1 p-4 md:p-8 transition-all duration-300 ease-in-out ${isChatOpen ? 'lg:mr-[30vw]' : ''}`}>
        <MCPConfigForm />
      </div>

      {/* Mobile chat toggle button (appears only on small screens) */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-gray-800 text-white rounded-full shadow-lg lg:hidden hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        aria-label={isChatOpen ? "Close chat" : "Open chat"}
      >
        {isChatOpen ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* --- Chat Sidebar --- */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[80vw] lg:w-[30vw] border-l border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out flex flex-col ${
          isChatOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
        // Apply overflow hidden when closed to prevent interaction issues
        style={{ overflow: isChatOpen ? 'visible' : 'hidden' }}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">MCP Assistant</h2>
          {/* Close button for large screens */}
          <button
             onClick={() => setIsChatOpen(false)}
             className="hidden lg:inline-flex text-gray-500 hover:text-gray-800 focus:outline-none"
             aria-label="Close chat sidebar"
           >
            <CloseIcon />
          </button>
        </div>

        {/* Message List */}
        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.length > 0 ? (
              messages.map((m) => (
                <div
                  key={m.id} // Use message ID as key
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`whitespace-pre-wrap py-2 px-3 rounded-xl max-w-[85%] text-sm shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.content}
                    {/* Tool Invocation Display */}
                    {m.toolInvocations?.map(tool => (
                      <div key={tool.toolCallId} className="mt-2 p-2 border border-gray-300 rounded bg-gray-50 text-xs text-gray-600 font-mono">
                        <div>Tool Call: {tool.toolName} ({tool.state})</div>
                        {tool.args && <pre className="mt-1 text-wrap">Args: {JSON.stringify(tool.args, null, 2)}</pre>}

                        {/* Conditionally display Result */}
                        {tool.state === 'result' && tool.result != null && (
                          <pre className="mt-1 text-wrap">Result: {JSON.stringify(tool.result, null, 2)}</pre>
                        )}

                        {/* CORRECTED: Conditionally display Error - Check property existence */}
                        {'error' in tool && tool.error != null && (
                           <pre className="mt-1 text-wrap text-red-600">Error: {JSON.stringify(tool.error, null, 2)}</pre>
                        )}
                         {/* --- End Correction --- */}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Placeholder when no messages exist
              <p className="text-gray-400 text-sm text-center pt-4">
                Start the conversation by typing below.
              </p>
            )}
            {/* Loading indicator */}
            {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
               <div className="flex justify-start">
                <div className="py-2 px-3 rounded-xl bg-gray-100 text-gray-500 text-sm italic shadow-sm flex items-center gap-2">
                  <LoadingIcon />
                  <span>AI is thinking...</span>
                </div>
               </div>
            )}
            {/* Error display */}
            {error && (
              <div className="flex justify-start">
                <div className="py-2 px-3 rounded-xl bg-red-100 text-red-700 text-sm shadow-sm">
                  <strong>Error:</strong> {error.message}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Chat Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2 items-center">
            <Input
              value={input}
              placeholder="Ask the MCP assistant..."
              onChange={handleInputChange}
              className="flex-1 text-sm"
              disabled={isLoading || !chatId} // Disable input if loading or no chat ID
            />
            <Button
                type="submit"
                disabled={isLoading || !input.trim() || !chatId} // Disable button if loading, input empty, or no chat ID
                size="sm" // Adjust button size if needed
             >
              {isLoading ? <LoadingIcon /> : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}