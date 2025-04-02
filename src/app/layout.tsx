import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { trace } from '@opentelemetry/api';
import { TelemetryProvider } from "@/components/telemetry-provider";
import { MCPServersProvider } from "@/components/providers/mcp-servers-provider"; // <<< CORRECTED
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MCPConnectionProvider } from "@/components/mcp-connection-provider"; // Assuming this path is correct
import { MCPConnectionLinker } from "@/components/mcp-connection-linker"; // Assuming this path is correct
import { TooltipProvider } from "@/components/ui/tooltip";

// Define metadata with a function to get active span at request time
export async function generateMetadata(): Promise<Metadata> {
  const activeSpan = trace.getActiveSpan();
  
  return {
    metadataBase: new URL('https://chat.vercel.ai'),
    title: 'Next.js Chatbot Template',
    description: 'Next.js chatbot template using the AI SDK.',
    other: {
      traceparent: activeSpan
        ? `00-${activeSpan.spanContext().traceId}-${
            activeSpan.spanContext().spanId
          }-01`
        : '',
    },
  } satisfies Metadata;
}

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';

const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log('Client instrumentation started.');
  
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <TelemetryProvider>
                <TooltipProvider delayDuration={0}>
                  <MCPServersProvider> {/* Provider from correct import */}
                    <MCPConnectionProvider>
                      <MCPConnectionLinker /> {/* Linker inside both */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
                  </MCPConnectionProvider>
                </MCPServersProvider>
              </TooltipProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}