import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "@/components/Layout";
// import { SEOApp } from "@/components/SEO";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <SEOApp> */}
      <Layout>
        <Component {...pageProps} />
      </Layout>
      {/* </SEOApp> */}
    </QueryClientProvider>
  );
}

export default MyApp;
