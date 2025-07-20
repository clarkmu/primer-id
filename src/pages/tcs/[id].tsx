import Alert from "@/components/form/Alert";
import { SEOTCS } from "@/components/SEO";
import Form from "@/components/TCSDR/Form";
import prisma from "@/utils/prisma";
import { useRouter } from "next/router";

export async function getServerSideProps(context) {
  const { id } = context.query;
  let error = "",
    pipeline = null;

  try {
    pipeline = await prisma.tcsdrs.findUnique({
      where: { id },
    });

    if (!pipeline) {
      pipeline = null;
      error = "Failed to find pipeline by ID.";
    }
  } catch (e) {
    error = "Failed to find pipeline by ID.";
  }

  return {
    props: {
      error,
      pipeline: JSON.stringify(pipeline),
    },
  };
}

export default function TCS({ pipeline, error }) {
  const router = useRouter();

  if (!router.isReady) {
    return "Loading...";
  }

  if (error) {
    return <Alert msg={error} />;
  }

  return (
    <SEOTCS>
      <Form />
    </SEOTCS>
  );
}
