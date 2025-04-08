import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { trace } from '@opentelemetry/api';
import { TelemetryProvider } from "@/components/telemetry-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from '@/components/navigation/nav-bar';
import { McpManagerProvider } from '@/lib/contexts/McpManagerContext'; // Ensure this is imported

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
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

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
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_COLOR_SCRIPT }} />
      </head>
      <body className="antialiased flex flex-col h-screen">
        <TelemetryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider>
              <McpManagerProvider>
                  <NavBar />
                  <main className="flex-1 overflow-hidden">{children}</main>
                  <Toaster position="top-center" />
              </McpManagerProvider>
            </TooltipProvider>
          </ThemeProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}