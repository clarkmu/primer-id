import type { NextApiRequest, NextApiResponse } from "next";
import { Storage } from "@google-cloud/storage";

import GCP_CREDENTIALS from "@/utils/gcp/GCP_CREDENTIALS";
import OGV, { OGVInterface } from "@/models/OGV";
import dbConnect from "@/utils/dbConnect";

const storage = new Storage({
  projectId: GCP_CREDENTIALS.project_id,
  credentials: GCP_CREDENTIALS,
});

const bucket = storage.bucket("ogv-dating");

const devPrefix = process.env.NODE_ENV === "production" ? "" : "dev/";

type Data = OGVInterface | { error: string };

async function get(req, res) {
  // show jobs ready to submit or are pending that have not had a processing error
  try {
    const all = await OGV.find({
      $and: [
        { $or: [{ submit: true }, { pending: true }] },
        { processingError: { $ne: true } },
      ],
    });

    const allFiltered = all.map(({ id, pending, submit }) => ({
      id,
      pending,
      submit,
    }));

    return res.status(200).json(allFiltered);
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
}

async function post(req, res) {
  // save job to db then files to bucket
  const body = JSON.parse(req.body);

  let newOGV = new OGV(body);

  const { uploads } = body;

  let signedURLs = [];

  const expires = new Date(
    new Date().getTime() + 24 * 60 * 60 * 1000
  ).getTime();

  try {
    for (const file of uploads) {
      const { name, type, libName } = file;

      const signedURL = await bucket
        .file(`${devPrefix}${newOGV.id}/${libName}/${name}`)
        .getSignedUrl({
          action: "write",
          expires,
          contentType: type,
          version: "v4",
        });

      if (!signedURL[0]) {
        throw "Network error. Please try again.";
      }

      newOGV?.uploads?.push({
        fileName: name,
        libName,
      });

      signedURLs.push({
        name,
        type,
        libName,
        signedURL: signedURL[0],
      });
    }
  } catch (e) {
    return res.status(400).json({ error: "Network error. Please try again." });
  }

  newOGV.uploads = newOGV.uploads.filter((f) => !!f.fileName);

  try {
    const p = await newOGV.save();
    return res.status(200).json({ ...p._doc, signedURLs });
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
