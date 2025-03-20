import { splice } from "@prisma/client";
import { useMemo, useState } from "react";
import SpliceConfig from "./SpliceConfig";
import PageDescription from "../templates/PageDescription";
import Paper from "../form/Paper";
import MyCollapse from "../form/MyCollapse";
import Confirmation from "./Confirmation";
import SharedSubmissionData from "@/components/templates/SharedSubmissionData";
import Uploads, {
  FileError,
  validateMatchingFiles,
} from "@/components/templates/Uploads";
import HTSF from "@/components/templates/HTSF";
import useStepForm from "@/hooks/useStepForm";
import useUploadsOrHTSF from "@/hooks/useUploadsOrHTSF";
import useSharedSubmissionData from "@/hooks/useSharedSubmissionData";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const { sharedSubmissionData, setSharedSubmissionData } =
    useSharedSubmissionData();
  const [spliceConfig, setSpliceConfig] = useState<splice | {}>({
    strain: "NL43",
    distance: "2",
    sequence: "",
  });

  const { useUploads, useHTSF, UploadOrHTSFButtons } = useUploadsOrHTSF();
  const { step, stepBack, ContinueButton } = useStepForm();
  const [scrollToUploads] = useScrollToDivOnVisibilityToggle(step > 0, "end");
  const [scrollToFinish] = useScrollToDivOnVisibilityToggle(step > 1, "end");

  // update submission object when showConfirmation modal opens
  const showConfirmation = useMemo(() => step === 3, [step]);
  const submissionData: splice & { files: File[] } = useMemo(
    () => ({
      ...sharedSubmissionData,
      ...spliceConfig,
      files: useUploads ? files : [],
      uploads: useUploads
        ? files.map((file) => ({
            fileName: file.name,
            poolName: file.name.split("_")[0],
          }))
        : [],
      htsf: useHTSF ? sharedSubmissionData.htsf : "",
      poolName: useHTSF ? sharedSubmissionData.poolName : "",
    }),
    [showConfirmation],
  );

  const fileErrors: FileError[] =
    (useUploads && files.length > 0 && validateMatchingFiles(files)) || [];

  // if htsf , ensure htsf and poolname
  // if files , ensure each r1 file has a matching r2 file
  const isFileSelectionValid = useUploads
    ? files.length > 0 && !fileErrors.length
    : !!sharedSubmissionData.htsf && !!sharedSubmissionData.poolName;

  return (
    <div className="flex flex-col gap-4 items-center justify-center">
      <Paper>
        <PageDescription
          title="HIV Splicing Pipeline"
          description="RNA synthesis from the HIV-1 provirus results in only full-length transcripts, and
most avoid splicing to remain full length at approximately 9.2 kb"
          files="Use uncompressed .fastq or .fasta files."
        />
      </Paper>
      <Paper className="flex flex-col gap-4">
        <SpliceConfig
          spliceConfig={spliceConfig}
          setSpliceConfig={setSpliceConfig}
        />
        <ContinueButton level={1} />
      </Paper>
      <div ref={scrollToUploads} className="w-full">
        <MyCollapse show={step > 0} className="flex flex-col gap-4">
          <UploadOrHTSFButtons />
          {useUploads && (
            <Uploads
              files={files}
              setFiles={setFiles}
              error={""}
              fileErrors={fileErrors}
            />
          )}
          {useHTSF && (
            <HTSF
              state={sharedSubmissionData}
              setState={setSharedSubmissionData}
            />
          )}
          <ContinueButton level={2} disabled={!isFileSelectionValid} />
        </MyCollapse>
      </div>
      <div ref={scrollToFinish} className="w-full">
        <MyCollapse show={step > 1} className="flex flex-col gap-4">
          <SharedSubmissionData
            state={sharedSubmissionData}
            setState={setSharedSubmissionData}
            defaultJobID="hiv-splicing-results"
          />
          <ContinueButton level={3} disabled={!sharedSubmissionData.email} />
        </MyCollapse>
      </div>
      <Confirmation
        submission={submissionData}
        open={showConfirmation}
        onClose={stepBack}
      />
    </div>
  );
}
