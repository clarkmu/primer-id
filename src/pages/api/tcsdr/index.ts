// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import dbConnect from "@/utils/dbConnect";
import type { NextApiRequest, NextApiResponse } from "next";
import GCP_CREDENTIALS from "@/utils/gcp/GCP_CREDENTIALS";
import TCSDR, { TCSDRInterface } from "@/models/TCSDR";
import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: GCP_CREDENTIALS.project_id,
  credentials: GCP_CREDENTIALS,
});

const bucket = storage.bucket(GCP_CREDENTIALS.bucket_name);

const devPrefix = process.env.NODE_ENV === "production" ? "" : "dev/";

async function get(req, res) {
  try {
    const all: TCSDRInterface[] = await TCSDR.find({
      $and: [
        { $or: [{ submit: true }, { pending: true }] },
        { processingError: { $ne: true } },
      ],
    });
    const all_tcsdr = all.map(
      ({ id, createdAt, submit, pending, uploads }) => ({
        id,
        createdAt,
        submit,
        pending,
        uploadCount: uploads?.length || 0,
      })
    );
    return res.status(200).json(all_tcsdr);
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
}

async function post(req, res) {
  const {
    body,
    body: { uploads },
  } = req;

  let newPipeline = new TCSDR(body);

  if (newPipeline.dropbox) {
    //append download param to dropbox url
    //updated for dropbox's share-url format update 2023 (/s/ -> /scl/)

    let db = newPipeline.dropbox;

    if (db.indexOf("dl=1") !== -1 || db.indexOf("https://dl.") !== -1) {
      //do nothing, download params are set
    } else if (db.indexOf("dl=0") !== -1) {
      db = db.replace("dl=0", "dl=1");
    } else if (db.indexOf("?") !== -1) {
      db += "&dl=1";
    } else {
      db += "?dl=1";
    }

    newPipeline.dropbox = db;
  } else if (uploads && uploads.length) {
    newPipeline.submit = false;
    newPipeline.uploaded = true;
    newPipeline.uploads = [];

    const expires = new Date(
      new Date().getTime() + 24 * 60 * 60 * 1000
    ).getTime();

    try {
      for (const file of uploads) {
        const { fileName, type, poolName } = file;

        const signedURL = await bucket
          .file(`${devPrefix}${newPipeline._id}/${poolName}/${fileName}`)
          .getSignedUrl({
            action: "write",
            expires,
            contentType: type,
            version: "v4",
          });

        if (!signedURL[0]) {
          throw "Network error. Please try again.";
        }

        const newFile = {
          fileName,
          poolName,
          signedURL: signedURL[0],
        };

        newPipeline?.uploads?.push(newFile);
      }
    } catch (e) {
      return res
        .status(400)
        .json({ error: "Network error. Please try again." });
    }
  }

  try {
    const p = await newPipeline.save();
    return res.status(200).json(p);
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
    default:
      return res.status(404).end();
  }
}
