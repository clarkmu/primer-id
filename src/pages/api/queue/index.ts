import type { NextApiRequest, NextApiResponse } from "next";
import { fetchPublic } from "@/utils/api";
import prisma from "@/utils/prisma";

const { API_KEY } = process.env;

type QueueRow = Awaited<ReturnType<typeof fetchPublic>>;

type QueueResponse = {
  ogvs: QueueRow;
  intacts: QueueRow;
  tcss: QueueRow;
  splicings: QueueRow;
  locators: QueueRow;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueueResponse | { error: string }>,
) {
  if (req.method !== "GET") {
    return res.status(404).end();
  }

  if (req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized request" });
  }

  try {
    const [ogvs, intacts, tcss, splicings, locators] =
      await Promise.all([
        fetchPublic(prisma.ogvs.findMany, () => 5),
        fetchPublic(
          prisma.intacts.findMany,
          (item) => (item.sequences?.match(/>/g) || []).length,
        ),
        fetchPublic(
          prisma.tcsdrs.findMany,
          (item) => (!!item.htsf ? 20 : item.uploads?.length || 0),
        ),
        fetchPublic(prisma.splice.findMany, () => 0),
        fetchPublic(prisma.locators.findMany, () => 0),
      ]);

    return res.status(200).json({
      ogvs,
      intacts,
      tcss,
      splicings,
      locators,
    });
  } catch (e) {
    return res.status(400).json({ error: `Database error:\n${e}` });
  }
}
