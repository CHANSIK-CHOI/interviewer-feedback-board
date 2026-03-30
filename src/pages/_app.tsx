import GlobalLayout from "@/components/layout/GlobalLayout";
import "@/styles/tailwind.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/session";
import { DialogProvider, Toaster } from "@/components/ui";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = "G-DPRJRR0QR2";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);
  const lastTrackedLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAnalyticsReady) return;

    // Next.js pages router는 새로고침 없이 이동하므로 page_view를 직접 보냅니다.
    const trackPageView = (url: string) => {
      const pageLocation = new URL(url, window.location.origin).toString();
      if (lastTrackedLocationRef.current === pageLocation) return;

      lastTrackedLocationRef.current = pageLocation;
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: pageLocation,
        page_path: url,
      });
    };

    const handleRouteChangeComplete = (url: string) => {
      trackPageView(url);
    };

    trackPageView(router.asPath);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
    };
  }, [isAnalyticsReady, router]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
        onReady={() => setIsAnalyticsReady(true)}
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>

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
