import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

async function post(req, res) {
  const { sequences, email, resultsFormat, jobID } = JSON.parse(req.body);

  if (!sequences)
    return res.status(500).json({ error: "Sequence is required." });

  if (!email) return res.status(500).json({ error: "Email is required." });

  try {
    await prisma.coreceptors.create({
      data: {
        sequences: sequences.trim(),
        email,
        resultsFormat,
        jobID,
      },
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: `Failed to save submission: ${e}` });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "GET":
      return getPublic(prisma.coreceptors.findMany, res, (item) => 0);
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
