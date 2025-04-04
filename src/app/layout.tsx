import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { trace } from '@opentelemetry/api';
import { TelemetryProvider } from "@/components/telemetry-provider";
import { SidebarProvider } from "@/components/ui/sidebar"; // Keep only SidebarProvider if needed globally
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from '@/components/navigation/nav-bar';
import { SharedMcpProvider } from '@/lib/contexts/SharedMcpContext'; // Import the new provider

export async function generateMetadata(): Promise<Metadata> {
  const activeSpan = trace.getActiveSpan();
  return {
    metadataBase: new URL('https://pittampalli.com'), // Replace with your base URL
    title: 'AI Chatbot & MCP Inspector',
    description: '',
    other: {
      traceparent: activeSpan
        ? `00-${activeSpan.spanContext().traceId}-${activeSpan.spanContext().spanId}-01`
        : '',
    },
  } satisfies Metadata;
}

export const viewport = {
  maximumScale: 1,
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_COLOR_SCRIPT }} />
      </head>
      <body className="antialiased flex flex-col h-screen">
        <TelemetryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider>
              <SharedMcpProvider>
                  <NavBar />
                  <main className="flex-1 overflow-hidden">{children}</main>
                  <Toaster position="top-center" />
              </SharedMcpProvider>
            </TooltipProvider>
          </ThemeProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}