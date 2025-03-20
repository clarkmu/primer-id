import axios from "axios";
import { useEffect, useState } from "react";

// handle file uploads and return a component that shows each file's upload progress

// files are passed in and a side joined array of file names includes progress

export default function useUploadSignedURLs(files: File[]) {
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>(
    [],
  );

  useEffect(() => {
    setUploads(
      files.map((f) => ({
        name: f.name || f.fileName,
        progress: 0,
      })),
    );
  }, [files]);

  async function uploadFilesToSignedURL(
    signedURLs: { fileName: string; signedURL: string }[],
  ): Promise<boolean> {
    try {
      for (const signedURL of signedURLs) {
        const file = files.find((f) => f.name === signedURL.fileName);

        if (!file) {
          setUploadError(`File not found: ${signedURL.fileName}`);
          return false;
        }

        const config = {
          onUploadProgress: (p) => {
            const progress = parseInt((p.loaded / p.total) * 100);
            setUploads((uploads) =>
              uploads.map((u) =>
                u.name === signedURL.fileName ? { ...u, progress } : u,
              ),
            );
          },
          headers: {
            "Content-Type": file?.type || "",
            // "x-goog-resumable": "start",
          },
        };

        await axios.put(signedURL.signedURL, file, config);
      }
    } catch (e) {
      setUploadError(`File upload error: ${e}`);
      return false;
    }

    return true;
  }

  const UploadProgress = () => (
    <div className="flex flex-col gap-2" data-cy="uploadProgressContainer">
      <span className="font-bold">You will upload the following files:</span>
      <div className="list-decimal list-inside divide-y-2 bg-grey-50">
        {uploads.map((upload, index) => (
          <div key={`file_confirmation_${index}`} className="flex mx-8 my-2">
            <div className="flex-1">{upload.name}</div>
            <div className="" data-cy="file_upload_progress">
              {upload.progress}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return {
    uploadError,
    UploadProgress,
    uploadFilesToSignedURL,
    isUploading,
    isUploadComplete,
  };
}
