import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "@/components/Layout";
import { SEOApp } from "@/components/SEO";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SEOApp>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SEOApp>
  );
}

export default MyApp;
