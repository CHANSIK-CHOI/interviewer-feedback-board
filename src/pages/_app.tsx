import GlobalLayout from "@/components/layout/GlobalLayout";
import "@/styles/tailwind.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/session";
import { DialogProvider, Toaster } from "@/components/ui";
import { startTransition, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function App({ Component, pageProps }: AppProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [queryClient] = useState(() => new QueryClient());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    startTransition(() => {
      setContainer(containerRef.current);
    });
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <DialogProvider container={container}>
            <GlobalLayout>
              <Component {...pageProps} />
            </GlobalLayout>
            <Toaster />
            <div ref={containerRef} className="z-[9999]" />
          </DialogProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
