// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getPublic } from "@/utils/api";
import prisma from "@/utils/prisma";
import createSignedUrls, {
  InputFileWithSignedUrl,
} from "@/utils/gcp/createSignedUrls";
import { toPrismaFloat, toPrismaInt } from "@/utils/prismaUtils";
import { TCSDRState } from "@/components/TCSDR/Form";

async function post(req: NextApiRequest, res: NextApiResponse) {
  let body: TCSDRState = JSON.parse(req.body);

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
    errorRate: toPrismaFloat(body.errorRate),
    platformFormat: toPrismaInt(body.platformFormat),
    // if there are uploads, don't submit yet
    submit: !body.uploads?.length,
    //whitelist
    uploads: body.uploads?.map(({ fileName, poolName }) => ({
      fileName,
      poolName,
    })),
  };

  const { uploads } = data;

  let newPipeline = await prisma.tcsdrs.create({ data });

  body.id = newPipeline.id;

  let signedURLs: InputFileWithSignedUrl[] = [];

  if (uploads?.length) {
    signedURLs = await createSignedUrls(
      "tcs-dr",
      uploads,
      (upload) => `${newPipeline.id}/${upload.poolName}/${upload.fileName}`,
    );

    if (!signedURLs.length) {
      return res.status(400).json({ error: "Failed to create Signed URL's." });
    }
  }

  return res.status(200).json({ ...body, signedURLs });
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
