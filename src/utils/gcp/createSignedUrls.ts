import GCP_CREDENTIALS from "@/utils/gcp/GCP_CREDENTIALS";
import { Storage } from "@google-cloud/storage";

const { NODE_ENV } = process.env;

const storage = new Storage({
  projectId: GCP_CREDENTIALS.project_id,
  credentials: GCP_CREDENTIALS,
});

const bucketPrefixDev = NODE_ENV === "production" ? "" : "dev/";

type InputFile = any;

interface InputFileWithSignedUrl extends InputFile {
  signedURL: string;
}

// attach a signed URL to each provided file object
async function createSignedUrls(
  bucketName: string,
  files: InputFile[],
  createPath: (file: InputFile) => String,
) {
  const bucket = storage.bucket(bucketName);

  let signedUrls: InputFileWithSignedUrl[] = [];

  const expires = new Date(
    new Date().getTime() + 24 * 60 * 60 * 1000,
  ).getTime();

  try {
    for (const file of files) {
      const signedURL = await bucket
        .file(bucketPrefixDev + createPath(file))
        .getSignedUrl({
          action: "write",
          expires,
          contentType: file.type,
          version: "v4",
        });

      if (!signedURL[0]) {
        throw "Network error. Please try again.";
      }

      signedUrls.push({ signedURL: signedURL[0], ...file });
    }

    return signedUrls;
  } catch (e) {
    return [];
  }
}

export default createSignedUrls;
