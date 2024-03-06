import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/utils/dbConnect";
import Intact from "@/models/Intact";

async function get(req, res) {
  try {
    const all = await Intact.find({
      $and: [
        { $or: [{ submit: true }, { pending: true }] },
        { processingError: { $ne: true } },
      ],
    });
    return res.status(200).json(all);
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
}

async function post(req, res) {
  const { sequences, email, resultsFormat, jobID } = JSON.parse(req.body);

  if (!sequences)
    return res.status(400).json({ error: "Sequence is required." });

  if (!email) return res.status(400).json({ error: "Email is required." });

  let newIntact = new Intact({
    sequences: sequences.trim(),
    email,
    resultsFormat,
    jobID,
  });
  const intact = await newIntact.save();

  return res.status(200).json({ success: true });
}

async function patch(req, res) {
  let body;

  try {
    body = JSON.parse(req.body);
  } catch (e) {
    body = req.body;
  }

  const { _id, patch } = body;

  let whitelistPatch: {
    submit?: boolean;
    pending?: boolean;
    processingError?: boolean;
  } = {};

  if (patch.hasOwnProperty("submit")) {
    whitelistPatch.submit = patch.submit;
  }
  if (patch.hasOwnProperty("pending")) {
    whitelistPatch.pending = patch.pending;
  }
  if (patch.hasOwnProperty("processingError")) {
    whitelistPatch.processingError = patch.processingError;
  }

  try {
    await Intact.findByIdAndUpdate(_id, whitelistPatch);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
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
    case "PATCH":
      return patch(req, res);
    default:
      return res.status(404).end();
  }
}
