import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/utils/dbConnect";
import Intact, { IntactInterface } from "@/models/Intact";

async function get(req, res) {
  try {
    const all: IntactInterface[] = await Intact.find({
      $and: [
        { $or: [{ submit: true }, { pending: true }] },
        { processingError: { $ne: true } },
      ],
    });
    const filtered_results = all.map(
      ({ id, submit, pending, createdAt, sequences }) => ({
        id,
        submit,
        pending,
        createdAt,
        uploadCount: (sequences.match(/>/g) || []).length,
      })
    );
    return res.status(200).json(filtered_results);
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
}

async function post(req, res) {
  const { sequences, email, resultsFormat, jobID } = JSON.parse(req.body);

  if (!sequences)
    return res.status(500).json({ error: "Sequence is required." });

  if (!email) return res.status(500).json({ error: "Email is required." });

  let newIntact = new Intact({
    sequences: sequences.trim(),
    email,
    resultsFormat,
    jobID,
  });
  const intact = await newIntact.save();

  return res.status(200).json({ success: true });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await dbConnect();
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Database error. Please try again later" });
  }

  switch (req.method) {
    case "GET":
      return get(req, res);
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
