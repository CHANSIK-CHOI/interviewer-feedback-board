import GlobalLayout from "@/components/layout/GlobalLayout";
import "@/styles/tailwind.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/session";
import { DialogProvider, Toaster } from "@/components/ui";
import { useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <>
      <Head>
        <title>최찬식의 인터뷰어 피드백 보드 프로젝트</title>
        <meta property="og:image" content="/thumbnail.jpeg" key="og:image" />
        <link rel="icon" href="/favicon.ico" key="favicon" />
      </Head>

      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SessionProvider>
          <DialogProvider container={container}>
            <GlobalLayout>
              <Component {...pageProps} />
            </GlobalLayout>
            <Toaster />
            <div ref={setContainer} className="z-[9999]" />
          </DialogProvider>
        </SessionProvider>
      </ThemeProvider>
    </>
  );
}
