// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls from "@/utils/gcp/createSignedUrls";
import { toPrismaFloat, toPrismaInt } from "@/utils/prismaUtils";

async function post(req, res) {
  const { body } = req;

  const data = {
    ...body,
    primers: body.primers.map((p) => ({
      ...p,
      //convert empty strings to null for field type Int
      endJoinOption: toPrismaInt(p.endJoinOption),
      endJoinOverlap: toPrismaInt(p.endJoinOverlap),
      supermajority: toPrismaFloat(p.supermajority),
      refStart: toPrismaInt(p.refStart),
      refEnd: toPrismaInt(p.refEnd),
      trimStart: toPrismaInt(p.trimStart),
      trimEnd: toPrismaInt(p.trimEnd),
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
