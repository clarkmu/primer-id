// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls from "@/utils/gcp/createSignedUrls";

async function post(req, res) {
  const { body } = req;

  const data = {
    ...body,
    primers: body.primers.map((p) => ({
      ...p,
      //convert empty strings to null for field type Int
      endJoinOption: p.endJoinOption || 0,
      endJoinOverlap: p.endJoinOverlap || 0,
      supermajority: p.supermajority || 0,
      refStart: p.refStart || 0,
      refEnd: p.refEnd || 0,
      trimStart: p.trimStart || 0,
      trimEnd: p.trimEnd || 0,
    })),
    // if there are uploads, don't submit yet
    submit: !body.uploads?.length,
    //whitelist
    uploads: body.uploads?.map(({ fileName, poolName }) => ({
      fileName,
      poolName,
    })),
  };

  let newPipeline = await prisma.tcsdrs.create({ data });

  body.id = newPipeline.id;

  if (body.uploads?.length) {
    let signedUrls = await createSignedUrls(
      "tcs-dr",
      body.uploads,
      (upload) => `${newPipeline.id}/${upload.poolName}/${upload.fileName}`,
    );

    if (!signedUrls.length) {
      return res.status(400).json({ error: "Failed to create Signed URL's." });
    }

    body.uploads = signedUrls;
  }

  return res.status(200).json(body);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  switch (req.method) {
    case "GET":
      return getPublic(prisma.tcsdrs.findMany, res, (item) =>
        !!item.htsf ? 20 : item.uploads?.length || 0,
      );
    case "POST":
      return post(req, res);
    default:
      return res.status(404).end();
  }
}
