import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(404).end();
  }

  try {
    const { fileNames } = req.body;
    // http://localhost:9292
    const resRuby = await fetch(
      "https://api-ruby-secure-dept-tcs.apps.cloudapps.unc.edu/validate_file_names",
      {
        method: "POST",
        body: fileNames.join(","),
        headers: { "Content-Type": "text/plain" },
      }
    );
    const data = await resRuby.json();

    return res.status(200).json(data);
  } catch (e) {
    return res.status(400).json(e);
  }
}
