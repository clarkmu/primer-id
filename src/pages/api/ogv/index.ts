import type { NextApiRequest, NextApiResponse } from "next";
import { ogvs } from "@prisma/client";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls from "@/utils/gcp/createSignedUrls";

type Data = ogvs | { error: string };

async function post(req, res) {
  try {
    let data = JSON.parse(req.body);

    let newOGV = await prisma.ogvs.create({
      data,
    });

    const { id } = newOGV;

    let signedURLs = await createSignedUrls(
      "ogv-dating",
      data.uploads,
      (upload) => `${id}/${upload.libName}/${upload.name}`,
    );

    if (!signedURLs.length) {
      return res.status(400).json({ error: "Failed to create Signed URL's." });
    }

    return res.status(200).json({ id, signedURLs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Database error. Please try again." });
  }
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
