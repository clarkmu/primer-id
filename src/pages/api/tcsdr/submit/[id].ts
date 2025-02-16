import { patchSubmit } from "@/utils/api";
import prisma from "@/utils/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = { success: boolean } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  switch (req.method) {
    case "DELETE":
      return patchSubmit(req, res, prisma.tcsdrs.update);
    default:
      return res.status(404).end();
  }
}
