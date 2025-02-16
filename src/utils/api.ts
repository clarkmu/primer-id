import { NextApiRequest, NextApiResponse } from "next";

const { API_KEY } = process.env;

// 'middleware' to ensure API Key or return id
export const validateIdRequest = (req: NextApiRequest) => {
  let error = "";
  let id = req.query.id || "";

  if (req.headers["x-api-key"] !== API_KEY) {
    error = "Unauthorized reqest";
  } else if (!id || Array.isArray(id)) {
    error = "Missing id";
  }

  if (Array.isArray(id)) {
    id = id[0];
  }

  return { id, error };
};

// GET api/*/index
export const getPublic = async (
  prismaFindManyFunction: (query: any) => Promise<any>,
  res: NextApiResponse,
  calcUploadCount: (item: any) => number,
) => {
  try {
    const all: any[] = await prismaFindManyFunction({
      where: {
        AND: [
          {
            OR: [{ submit: true }, { pending: true }],
          },
          {
            processingError: {
              not: true,
            },
          },
        ],
      },
    });

    const filtered_results = all.map(
      ({ id, submit, pending, createdAt, ...item }) => ({
        id,
        submit,
        pending,
        createdAt,
        uploadCount: calcUploadCount(item),
      }),
    );

    return res.status(200).json(filtered_results);
  } catch (e) {
    return res.status(400).json({ error: `Database error:\n${e}` });
  }
};

// GET api/coreceptor|intactness/[id]
export const getById = async (
  id: String,
  res: NextApiResponse,
  prismaFindUniqueFunction: (query: any) => Promise<void>,
) => {
  try {
    const item = await prismaFindUniqueFunction({ where: { id } });
    return res.status(200).json(item);
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error: " + e });
  }
};

// PATCH api/ogv|tcsdr/submit/[id]
export const patchSubmit = async (
  req: NextApiRequest,
  res: NextApiResponse,
  prismaUpdateFunction: (query: any) => Promise<void>,
) => {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    await prismaUpdateFunction({
      where: { id },
      data: { submit: true },
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
};

//PATCH api/*/[id]
export const patchItem = async (
  req: NextApiRequest,
  res: NextApiResponse,
  id: String,
  prismaUpdateFunction: (query: any) => Promise<void>,
) => {
  let data;

  try {
    data = JSON.parse(req.body);
  } catch (e) {
    data = req.body;
  }

  try {
    await prismaUpdateFunction({
      where: { id },
      data,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.log({ e });
    return res.status(400).json({ error: "Database error. Please try again." });
  }
};
