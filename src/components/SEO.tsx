import Head from "next/head";

// TODO: this component breaking GAE deployments (at least in staging - unchecked in production)

const url = "https://primer-id.org";
const favicon = `${url}/favicon.ico`;
const logo = `${url}/logo.png`;
const title = "Primer-ID";
const description = "NGS TCS-DR OGV Intactness Pipelines";

export const SEOApp = ({ children }) => {
  return (
    <>
      <Head>
        <title>Primer-ID</title>
        <meta name="application-name" content="Primer-ID" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={title} />
        <meta name="description" content={description} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#4B9CD3" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#4B9CD3" />

        <link rel="apple-touch-icon" href="/icons/touch-icon-iphone.png" />
        <link rel="apple-touch-icon" sizes="512x512" href={logo} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" color="#4B9CD3" />
        <link rel="shortcut icon" href={favicon} />

        <meta name="twitter:card" content={description} />
        <meta name="twitter:url" content={url} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content="" />
        <meta name="twitter:image" content="https://primer-id.org/logo.png" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content={title} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={logo} />
      </Head>
      {children}
    </>
  );
};

export const SEOOGV = ({ children }) => (
  <>
    <Head>
      <title>OGV-Dating Pipeline</title>
      <meta
        name="description"
        content="This pipeline times outgrowth virus (OGV) strains from a single host using serially sampled RNA data. Four different approaches are used to assign dates to unobserved strains. First, each tree is rooted to maximize the root-to-tip to sampling time correlation coefficient."
      />
    </Head>
    {children}
  </>
);

export const SEOTCS = ({ children }) => (
  <>
    <Head>
      <title>DR Pipeline</title>
      <meta
        name="description"
        content="General application to create template concensus sequences (TCS) for single or multiplexed pair-end Primer ID (PID) MiSeq sequencing."
      />
    </Head>
    {children}
  </>
);

export const SEODR = ({ children }) => (
  <>
    <Head>
      <title>TCS Pipeline</title>
      <meta
        name="description"
        content="Generate TCS and drug resistance report for using the HIV Drug Resistance Pipeline by the Swanstrom's lab."
      />
    </Head>
    {children}
  </>
);

export const SEOCoreceptor = ({ children }) => (
  <>
    <Head>
      <title>Geno2Pheno Coreceptor</title>
      <meta
        name="description"
        content="Automate multiple submissions to the Geno2Pheno Coreceptor pipeline."
      />
    </Head>
    {children}
  </>
);
