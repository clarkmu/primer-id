import type { NextApiRequest, NextApiResponse } from "next";
import type { intacts } from "@prisma/client";
import prisma from "@/utils/prisma";
import { getById, patchItem, validateIdRequest } from "@/utils/api";

type Data = intacts | { error: string };

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
      return getById(id, res, prisma.intacts.findUnique);
    case "PATCH":
      return patchItem(req, res, id, prisma.intacts.update);
    default:
      return res.status(404).end();
  }
}
