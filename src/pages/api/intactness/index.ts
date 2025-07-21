import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { getPublic } from "@/utils/api";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

async function post(req, res) {
  const { sequences, email, resultsFormat, jobID } = JSON.parse(req.body);

  if (!sequences)
    return res.status(500).json({ error: "Sequence is required." });

  if (!email) return res.status(500).json({ error: "Email is required." });

  let id = null;

  try {
    const data = await prisma.intacts.create({
      data: { sequences: sequences.trim(), email, resultsFormat, jobID },
    });

    id = data.id;
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: `Failed to save submisison: ${e}` });
  }

  return res.status(200).json({ success: true, id });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "GET":
      return getPublic(
        prisma.intacts.findMany,
        res,
        (item) => (item.sequences?.match(/>/g) || []).length,
      );
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
