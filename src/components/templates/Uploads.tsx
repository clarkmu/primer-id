/* TODO: use this as a shared components with all the other Upload sections */

import { Dispatch, SetStateAction } from "react";
import InputFile from "../form/InputFile";
import Alert from "../form/Alert";
import { XCircleIcon } from "@heroicons/react/20/solid";

export interface FileError {
  name: string;
  error: string;
}

export function validateMatchingFiles(files: File[]): FileError[] {
  let errors: FileError[] = [];

  files.forEach((file) => {
    const name = file.name.toLocaleLowerCase();
    const isR1 = name.indexOf("r1") !== -1;
    const isR2 = name.indexOf("r2") !== -1;

    if (isR1) {
      const r2Name = name.replace(/r1/g, "r2");
      const isValid = files.some((f) => f.name.toLocaleLowerCase() === r2Name);
      if (!isValid) {
        errors.push({
          name: file.name,
          error: "R1 file does not have a matching R2 file: " + file.name,
        });
      }
    } else if (isR2) {
      const r1Name = name.replace(/r2/g, "r1");
      const isValid = files.some((f) => f.name.toLocaleLowerCase() === r1Name);
      if (!isValid) {
        errors.push({
          name: file.name,
          error: "R2 file does not have a matching R1 file: " + file.name,
        });
      }
    }
  });

  return errors;
}

export default function Uploads({
  files,
  setFiles,
  error,
  fileErrors = [],
  uniqueID = "",
}: {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  error: string;
  fileErrors?: FileError[];
  uniqueID?: string;
}) {
  const handleAddFiles = (files: File[]) => setFiles((f) => [...f, ...files]);

  const removeFile = (name: string) => {
    setFiles((files) => files.filter((f) => f.name !== name));
  };

  return (
    <div
      className="flex flex-col gap-8"
      data-cy={`${uniqueID}uploadsContainer`}
    >
      <div className="w-full">
        <InputFile
          multiple
          onChange={handleAddFiles}
          label="Upload Files"
          data-cy="uploadFilesButton"
        />
      </div>
      <div className="max-h-[33vh] overflow-y-auto flex flex-col">
        {files.length < 1 ? (
          <div className="flex flex-col gap-4">
            {[...Array(5).keys()].map((i) => (
              <div
                className="w-full h-4 animate-pulse bg-grey rounded"
                key={`loading_file_${i}`}
              ></div>
            ))}
          </div>
        ) : (
          files.map((file) => {
            const fileError =
              fileErrors?.find((u) => u.name === file.name)?.error || "";

            return (
              <div
                className="flex flex-col gap-2 even:bg-slate-100"
                key={`upload_${file.name}`}
              >
                <div className="flex items-center justify-center p-2 w-full even:bg-blue-50 hover:bg-blue-100">
                  <div className="flex-1 flex flex-col gap-2">
                    <div>{file.name}</div>
                    {/* <div>Subject: {file.name.split("_")[0]}</div> */}
                  </div>
                  <div
                    className="cursor-pointer w-8 h-8 flex items-center justify-center hover:bg-grey rounded-full"
                    onClick={() => removeFile(file.name)}
                  >
                    <XCircleIcon className="w-6 h-6 text-red" />
                  </div>
                </div>
                <Alert msg={fileError} />
              </div>
            );
          })
        )}
      </div>
      <Alert msg={error} />
    </div>
  );
}
