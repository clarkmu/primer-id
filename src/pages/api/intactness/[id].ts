import type { NextApiRequest, NextApiResponse } from "next";
import Intact, { IntactInterface } from "@/models/Intact";
import dbConnect from "@/utils/dbConnect";

type Data = IntactInterface | { error: string };

const { API_KEY } = process.env;

async function get(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
  id: string
) {
  try {
    const intact = await Intact.findById(id);
    return res.status(200).json(intact);
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error: " + e });
  }
}

async function patch(req, res, id) {
  let body;

  try {
    body = JSON.parse(req.body);
  } catch (e) {
    body = req.body;
  }

  try {
    await Intact.findByIdAndUpdate(id, body);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    await dbConnect();
  } catch (e) {
    return res.status(500).json({ error: "Database error: " + e });
  }

  if (req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = req.query.id || "";

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Missing id" });
  }

  switch (req.method) {
    case "GET":
      return get(req, res, id);
    case "PATCH":
      return patch(req, res, id);
    default:
      return res.status(404).end();
  }
}
