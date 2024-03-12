import { useState } from "react";
import Collapse from "@/components/form/Collapse";
import { UPLOAD_PROCEDURES, useTCSDRContext } from "@/contexts/TCSDRContext";
import Button from "../form/Button";
import Paper from "@/components/form/Paper";
import Alert from "../form/Alert";
import Input from "../form/Input";
import { FolderIcon, XCircleIcon } from "@heroicons/react/20/solid";
import InputFile from "../form/InputFile";
import useScrollToDivOnChange from "@/hooks/useScrollToDivOnChange";

const GridContent = ({ children, show }) => (
  <Collapse open={show}>
    <Paper>{children}</Paper>
  </Collapse>
);

const HTSF = () => {
  const {
    state: {
      pipeline: { htsf, poolName },
    },
    editPipeline,
  } = useTCSDRContext();

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="HTSF Location"
        placeholder="Bucket Location"
        value={htsf}
        onChange={(e) => editPipeline({ htsf: e.target.value })}
      />
      <Input
        label="Pool Name"
        value={poolName}
        onChange={(e) => editPipeline({ poolName: e.target.value })}
      />
      <ShowSubmitButton
        disabled={!htsf || !htsf?.length || !poolName || !poolName?.length}
      />
    </div>
  );
};

const DropBox = () => {
  const {
    state: {
      pipeline: { dropbox },
    },
    editPipeline,
  } = useTCSDRContext();

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="DropBox URL"
        placeholder="https://www.dropbox.com/sh/id"
        value={dropbox}
        onChange={(e) => editPipeline({ dropbox: e.target.value })}
      />
      <ShowSubmitButton disabled={!dropbox?.length} />
    </div>
  );
};

const ListFiles = ({ errors }) => {
  const {
    state: { files },
    setState,
  } = useTCSDRContext();

  const removeFile = (fileName) =>
    setState((s) => ({
      ...s,
      files: s.files.filter((f) => f.file.name !== fileName),
    }));

  return (
    <>
      <div>{files.length} Files</div>
      <div className="flex flex-col gap-4 max-h-[44vh] overflow-y-auto">
        {files.map((file, i) => {
          const hasError = errors.find((f) => f.name === file.name)?.errors;

          return (
            <div
              key={`file_${i}`}
              className="flex gap-4 justify-start items-center"
            >
              {!!hasError ? (
                <XCircleIcon className="w-6 h-6 text-red" />
              ) : (
                <FolderIcon className="w-6 h-6 text-primary" />
              )}
              <div className="flex-1 flex flex-col gap-1">
                <div>{file.file.name}</div>
                <div className="text-sm">
                  {!!hasError
                    ? `Errors: ${hasError.join(", ")}`
                    : file.poolName
                    ? `Lib: ${file.poolName}`
                    : ""}
                </div>
              </div>
              <div
                className="cursor-pointer w-8 h-8 flex items-center justify-center hover:bg-grey rounded-full"
                onClick={() => removeFile(file.file.name)}
              >
                {/* <Button
              iconButton={true}
              onClick={() => removeFile(file.file.name)}
            > */}
                <XCircleIcon className="w-6 h-6 text-red" />
                {/* </Button> */}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const Upload = () => {
  const { state, validateFileNames } = useTCSDRContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);

  const { setState } = useTCSDRContext();

  const addFiles = (files: File[]) => {
    const acceptedFiles = Array.from(files)
      .filter((f) => f.name[0] !== ".")
      .filter(
        (f) =>
          f.name.indexOf(".fast") !== -1 &&
          !state.files.find((fi) => fi.name === f.name)?.name
      )
      .map((file) => ({
        file,
        errors: [],
      }));

    setState((s) => ({ ...s, files: [...s.files, ...acceptedFiles] }));
  };

  const handleContinueButtonClick = async () => {
    setError("");
    setErrors([]);

    setLoading(true);

    const res = await validateFileNames();
    setLoading(false);

    const { files: resFiles, allPass, error } = res;

    if (error) {
      setError(error);
      return;
    }

    if (allPass !== true) {
      setError("Please check file errors above.");
      setErrors(resFiles.filter((f) => !!f.errors));
      return;
    }

    // addLibNameToFiles(resFiles);
    setState((s) => ({
      ...s,
      showSubmit: true,
      files: s.files.map((file) => ({
        ...file,
        poolName:
          resFiles.find((f) => f.fileName === file.file.name)?.libName || "",
      })),
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-around w-full my-4">
        <InputFile onChange={addFiles} />
      </div>
      {state.files.length > 0 ? (
        <ListFiles errors={errors} />
      ) : (
        <div className="flex flex-col gap-4">
          {[...Array(5).keys()].map((i) => (
            <div
              className="w-full h-4 animate-pulse bg-grey rounded"
              key={`loading_file_${i}`}
            ></div>
          ))}
        </div>
      )}
      {loading && (
        <Alert severity="info" msg="Verifying files. Please wait..." />
      )}
      <Alert msg={error} />
      <ShowSubmitButton
        disabled={state.files.length < 1}
        // loading={loading}
        onClick={handleContinueButtonClick}
      />
    </div>
  );
};

const ShowSubmitButton = (props) => {
  const { editState } = useTCSDRContext();

  const setShowSubmit = () => editState({ showSubmit: true });

  return (
    <Button
      fullWidth
      {...props}
      disabled={props.disabled || props.loading}
      onClick={props.onClick || setShowSubmit}
      isLoading={props.loading}
    >
      Continue
    </Button>
  );
};

export default function Uploads() {
  const {
    state: { uploadProcedure },
    editState,
  } = useTCSDRContext();

  const setProcedure = (uploadProcedure) => editState({ uploadProcedure });

  const [scrollToDiv] = useScrollToDivOnChange(uploadProcedure);

  return (
    <div className="flex flex-col gap-6" ref={scrollToDiv}>
      <div className="flex flex-col gap-6">
        <div className="text-center font-lg text-lg flex flex-col">
          <span>Upload .fastq or .fastq.gz Files</span>
          <small className="italic">Dropbox uploads have been disabled.</small>
        </div>
        <div className="flex justify-around">
          {[
            UPLOAD_PROCEDURES.UPLOAD,
            // UPLOAD_PROCEDURES.DROPBOX,
            UPLOAD_PROCEDURES.HTSF,
          ].map((p, i) => (
            <Button
              key={`upload_procedure_${i}`}
              color="secondary"
              variant={uploadProcedure === p ? "primary" : "outlined"}
              onClick={() => setProcedure(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
      <GridContent show={uploadProcedure === UPLOAD_PROCEDURES.HTSF}>
        <HTSF />
      </GridContent>
      <GridContent show={uploadProcedure === UPLOAD_PROCEDURES.UPLOAD}>
        <Upload />
      </GridContent>
      <GridContent show={uploadProcedure === UPLOAD_PROCEDURES.DROPBOX}>
        <DropBox />
      </GridContent>
    </div>
  );
}
