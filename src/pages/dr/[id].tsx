import Alert from "@/components/form/Alert";
import { SEODR } from "@/components/SEO";
import Form from "@/components/TCSDR/Form";
import TCSDRContextProvider from "@/contexts/TCSDRContext";
import prisma from "@/utils/prisma";
import { useRouter } from "next/router";

export async function getServerSideProps(context) {
  const { id } = context.query;
  let error = "",
    pipeline = null;

  try {
    pipeline = await prisma.tcsdrs.findUnique({ where: { id } });

    if (!pipeline) {
      pipeline = null;
      error = "Failed to find pipeline by ID.";
    }
  } catch (e) {
    error = "Network error. Please try again.";
  }

  return {
    props: {
      error,
      pipeline: JSON.stringify(pipeline),
    },
  };
}

export default function DR({ pipeline, error }) {
  const router = useRouter();

  if (!router.isReady) {
    return "Loading...";
  }

  if (error) {
    return <Alert msg={error} />;
  }

  return (
    <TCSDRContextProvider isDR={true} pipeline={pipeline}>
      <SEODR>
        <Form />
      </SEODR>
    </TCSDRContextProvider>
  );
}
