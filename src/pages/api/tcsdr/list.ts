import TCSDR from "@/models/TCSDR";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(404).end();
  }

  const { password } = JSON.parse(req.body);

  if (password !== process.env.LOGIN_PASSWORD) {
    return res.status(400).json({ error: "Incorrect password." });
  }
  try {
    let all = await TCSDR.find({}).sort({ createdAt: "desc" });
    return res.status(200).json(all);
  } catch (e) {
    return res.status(400).json({ error: "Database error. Please try again." });
  }
}
