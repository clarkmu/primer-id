import type { NextApiRequest, NextApiResponse } from "next";
import { splice } from "@prisma/client";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls, {
  InputFileWithSignedUrl,
} from "@/utils/gcp/createSignedUrls";
import { toPrismaInt } from "@/utils/prismaUtils";

type Data = splice | { error: string };

async function post(req, res) {
  // save job to db then files to bucket
  let data = JSON.parse(req.body);

  // remove frontend data
  delete data.poolName;
  delete data.id;

  data.distance = toPrismaInt(data.distance);

  let newItem = await prisma.splice.create({
    data,
  });

  data.id = newItem.id;

  const { uploads } = data;

  let signedURLs: InputFileWithSignedUrl[] = [];

  if (uploads.length) {
    signedURLs = await createSignedUrls(
      "hiv-splicing",
      uploads,
      (upload) => `${newItem.id}/${upload.fileName}`,
    );

    if (!signedURLs.length) {
      return res.status(400).json({ error: "Failed to create Signed URL's." });
    }
  }

  // data.uploads = data.uploads.filter((f) => !!f.fileName);

  return res.status(200).json({ ...data, signedURLs });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  switch (req.method) {
    case "GET":
      return getPublic(prisma.splice.findMany, res, (item) => 5);
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
