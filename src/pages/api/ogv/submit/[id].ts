import type { NextApiRequest, NextApiResponse } from "next";
import OGV from "@/models/OGV";
import dbConnect from "@/utils/dbConnect";

type Data = { success: boolean } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    await dbConnect();
  } catch (e) {
    return res.status(500).json({ error: "Database error: " + e });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Missing id" });
  }

  switch (req.method) {
    case "DELETE":
      try {
        await OGV.findByIdAndUpdate(id, { submit: true });
        return res.status(200).json({ success: true });
      } catch (e) {
        console.log({ e });
        return res
          .status(400)
          .json({ error: "Database error. Please try again." });
      }
    default:
      return res.status(404).end();
  }
}
