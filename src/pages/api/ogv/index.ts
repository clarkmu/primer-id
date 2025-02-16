import type { NextApiRequest, NextApiResponse } from "next";
import { ogvs } from "@prisma/client";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls from "@/utils/gcp/createSignedUrls";

type Data = ogvs | { error: string };

async function post(req, res) {
  // save job to db then files to bucket
  const body = JSON.parse(req.body);

  // whitelist and make frontend names consistent with db names
  const data = {
    ...body,
    uploads: body.uploads.map((u) => ({
      fileName: u.name,
      libName: u.libName,
    })),
  };

  // remove frontend data
  delete data.showConversion;
  delete data.showSubmit;
  delete data.showConfirm;

  let newOGV = await prisma.ogvs.create({
    data,
  });

  body.id = newOGV.id;

  const { uploads } = body;

  let signedURLs = await createSignedUrls(
    "ogv-dating",
    uploads,
    (upload) => `${newOGV.id}/${upload.libName}/${upload.name}`,
  );

  if (!signedURLs.length) {
    return res.status(400).json({ error: "Failed to create Signed URL's." });
  }

  body.uploads = body.uploads.filter((f) => !!f.fileName);

  return res.status(200).json({ ...body, signedURLs });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  switch (req.method) {
    case "GET":
      return getPublic(prisma.ogvs.findMany, res, (item) => 5);
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
