import { useOGVContext } from "@/contexts/OGVContext";
import { useState } from "react";
import Button from "@/components/form/Button";
import InputFile from "@/components/form/InputFile";
import Alert from "../form/Alert";
import { XCircleIcon } from "@heroicons/react/20/solid";

export default function Uploads() {
  const {
    state: { files, uploads, showConversion },
    addFiles,
    removeFile,
    setState,
  } = useOGVContext();

  const [error, setError] = useState("");

  const disableButtons = files.length < 1 || error.length > 0;

  const handleAdd = async (files: File[]) => {
    const addError = await addFiles(files);
    if (addError) {
      setError(addError);
    } else if (error) {
      setError("");
    }
  };

  const finishFileSection = () => {
    setState((s) => ({
      ...s,
      showConversion: true,
      uploads: s.files.map((f) => ({
        name: f.name,
        progress: 0,
        type: f.type,
        libName: f.name.split("_")[0],
      })),
    }));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="w-full">
        <InputFile multiple onChange={handleAdd} label="Upload Files" />
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
          files.map((file) => (
            <div
              className="flex flex-col gap-2 even:bg-slate-100"
              key={`upload_${file.name}`}
            >
              <div className="flex items-center justify-center p-2 w-full even:bg-blue-50 hover:bg-blue-100">
                <div className="flex-1 flex flex-col gap-2">
                  <div>{file.name}</div>
                  <div>Subject: {file.name.split("_")[0]}</div>
                </div>
                <div
                  className="cursor-pointer w-8 h-8 flex items-center justify-center hover:bg-grey rounded-full"
                  onClick={() => removeFile(file.name)}
                >
                  {/* <Button
                    iconButton={true}
                    onClick={() => removeFile(file.file.name)}
                  > */}
                  <XCircleIcon className="w-6 h-6 text-red" />
                  {/* </Button> */}
                </div>
                {/* <Button onClick={() => removeFile(file.name)}>X</Button> */}
              </div>
              <Alert
                msg={uploads.find((u) => u.fileName === file.name)?.error || ""}
              />
            </div>
          ))
        )}
      </div>
      <Alert msg={error} />
      <div className="flex justify-center items-center gap-8">
        <Button
          disabled={disableButtons}
          onClick={finishFileSection}
          variant={showConversion ? "outlined" : "primary"}
          fullWidth
        >
          {disableButtons
            ? "Upload .fasta files to process with OGV-Dating pipeline"
            : "Finish File Selection"}
        </Button>
      </div>
    </div>
  );
}
