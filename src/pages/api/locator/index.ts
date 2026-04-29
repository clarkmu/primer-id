import type { NextApiRequest, NextApiResponse } from "next";
import { locators } from "@prisma/client";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls from "@/utils/gcp/createSignedUrls";

type Data = locators | { error: string };

async function post(req, res) {
  try {
    let data = JSON.parse(req.body);

    let newLocator = await prisma.locators.create({
      data,
    });

    const { id } = newLocator;

    let signedURLs = await createSignedUrls(
      "seq_locator",
      data.uploads,
      (upload) => `${id}/${upload.fileName}`,
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
      return getPublic(
        prisma.locators.findMany,
        res,
        (item) => item.uploads?.length || 0,
      );
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
