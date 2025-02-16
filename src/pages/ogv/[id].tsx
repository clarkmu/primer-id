import Alert from "@/components/form/Alert";
import OGVPage from "@/components/OGV/OGVPage";
import { SEOOGV } from "@/components/SEO";
import OGVContextProvider from "@/contexts/OGVContext";
import prisma from "@/utils/prisma";
import { useRouter } from "next/router";

export async function getServerSideProps(context) {
  const { id } = context.query;
  let error = "",
    pipeline = null;

  try {
    pipeline = await prisma.ogvs.findUnique({ where: { id } });
    if (!pipeline) {
      error = "Failed to find pipeline by ID.";
      pipeline = null;
    }
  } catch (e) {
    error = "Network error. Please try again.";
  }

  return {
    props: {
      error,
      pipeline,
    },
  };
}

export default function OGVByID({ error, pipeline }) {
  const router = useRouter();

  if (!router.isReady) {
    return "Loading...";
  }

  if (error) {
    return <Alert msg={error} />;
  }

  return (
    <OGVContextProvider pipeline={pipeline}>
      <SEOOGV>
        <OGVPage />
      </SEOOGV>
    </OGVContextProvider>
  );
}
