/* TODO: use this as a shared components with all the other Upload sections */

import { Dispatch, SetStateAction } from "react";
import InputFile from "../form/InputFile";
import Alert from "../form/Alert";
import { XCircleIcon } from "@heroicons/react/20/solid";

export interface FileError {
  name: string;
  error: string;
}

// Splicing - validate that submitted files have a unique lib name and corresponding R1/R2
export function validateMatchingFiles(files: File[]): FileError[] {
  let errors: FileError[] = [];

  const libNames: { [key: string]: number } = {};

  files.forEach((file) => {
    const name = file.name.toLocaleLowerCase();
    const isR1 = name.indexOf("r1") !== -1;
    const isR2 = name.indexOf("r2") !== -1;

    const libName = name.split(/r1|r2/)[0] || "";

    libNames[libName] = (libNames[libName] || 0) + 1;

    if (!libName) {
      const rString = isR1 ? "r1" : "r2";
      errors.push({
        name: file.name,
        error: `Please use a valid file name format: <lib_name>_${rString}.fastq.gz`,
      });
    } else if (libNames[libName] > 2) {
      errors.push({
        name: file.name,
        error: `Duplicate library detected: ${libName} @ ${file.name}.`,
      });
    } else if (isR1) {
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

const FilesSkeleton = () => (
  <div className="flex flex-col gap-4">
    {[...Array(5).keys()].map((i) => (
      <div
        className="w-full h-4 animate-pulse bg-grey rounded"
        key={`loading_file_${i}`}
      ></div>
    ))}
  </div>
);

export default function Uploads({
  files,
  setFiles,
  error,
  fileErrors = [],
  uniqueID = "",
  showSubject = false,
  customAddFiles = undefined,
}: {
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  error: string;
  fileErrors?: FileError[];
  uniqueID?: string;
  showSubject?: boolean;
  customAddFiles?: (files: File[]) => string | Promise<string>; // return error string if any
}) {
  const handleAddFiles = (files: File[]) => {
    if (customAddFiles) {
      customAddFiles(files);
    } else {
      setFiles((f) => [...f, ...files]);
    }
  };

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
          <FilesSkeleton />
        ) : (
          files.map((file, i) => {
            const fileError =
              fileErrors?.find((u) => u.name === file.name)?.error || "";

            return (
              <div
                className="flex flex-col gap-2 even:bg-slate-100"
                key={`upload_${file.name}`}
                data-cy={`uploadedFile_${i}`}
              >
                <div className="flex items-center justify-center p-2 w-full even:bg-blue-50 hover:bg-blue-100">
                  <div className="flex-1 flex flex-col gap-2">
                    <div>{file.name}</div>
                    {showSubject && (
                      <div>Subject: {file.name.split("_")[0]}</div>
                    )}
                  </div>
                  <div
                    className="cursor-pointer w-8 h-8 flex items-center justify-center hover:bg-grey rounded-full"
                    onClick={() => removeFile(file.name)}
                  >
                    <XCircleIcon className="w-6 h-6 text-red" />
                  </div>
                </div>
                <Alert
                  msg={fileError}
                  data-cy={`upload-file-error-${file.name}`}
                />
              </div>
            );
          })
        )}
      </div>
      <Alert msg={error} data-cy="upload-file-error" />
    </div>
  );
}
