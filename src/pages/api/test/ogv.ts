import type { ogvs } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = ogvs | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  // switch (req.method) {
  //   case "GET":
  //     return get(req, res);
  //   case "POST":
  //     return post(req, res);
  //   case "PATCH":
  //     return patch(req, res);
  //   default:
  //     return res.status(404).end();
  // }
}
