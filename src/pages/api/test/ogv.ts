import type { NextApiRequest, NextApiResponse } from "next";
import { OGVInterface } from "@/models/OGV";

type Data = OGVInterface | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
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
