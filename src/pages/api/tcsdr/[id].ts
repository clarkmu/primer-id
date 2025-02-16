import type { NextApiRequest, NextApiResponse } from "next";
import type { tcsdrs } from "@prisma/client";
import { getById, patchItem, validateIdRequest } from "@/utils/api";
import prisma from "@/utils/prisma";

type Data = tcsdrs | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const { error, id } = validateIdRequest(req);
  if (error) {
    return res.status(400).json({ error });
  }

  switch (req.method) {
    case "GET":
      return getById(id, res, prisma.tcsdrs.findUnique);
    case "PATCH":
      return patchItem(req, res, id, prisma.tcsdrs.update);
    default:
      return res.status(404).end();
  }
}
