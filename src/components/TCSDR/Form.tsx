import { useEffect, useMemo, useState } from "react";
import Confirmation from "./Confirmation";
import MyCollapse from "@/components/form/MyCollapse";
import useTCSVersion from "@/hooks/queries/useTCSVersion";
import Button from "../form/Button";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import Paper from "../form/Paper";
import LINKS from "@/utils/constants/LINKS";
import dynamic from "next/dynamic";
import DRVersion from "./DRVersion";
import PageDescription from "../templates/PageDescription";
import useStepForm from "@/hooks/useStepForm";
import SharedSubmissionDataForm from "../templates/SharedSubmissionData";
import { useRouter } from "next/router";
import useUploadsOrHTSF from "@/hooks/useUploadsOrHTSF";
import Uploads from "../templates/Uploads";
import { defaultSharedSubmissionData } from "@/hooks/useSharedSubmissionData";
import HTSF from "../templates/HTSF";
import { tcsdrs } from "@prisma/client";
import INITIAL_PRIMER from "@/utils/constants/INITIAL_PRIMER";
import { variablesToViralSeqCLI } from "@/utils/translateVariablesForCLI";
import { useIsLoadingAnimation } from "@/hooks/useIsLoadingAnimation";
import TCSContextProvider from "@/contexts/TCSContext";
const TCSContainer = dynamic(() => import("./TCS/TCS"), {
  loading: () => null,
});

export type drVersionType = "v1" | "v2" | "v3" | "v4";

export enum ParamTypes {
  JSON = "Use Existing Params",
  NEW = "Start Your Run",
}

export type TCSDRState = Omit<tcsdrs, "id" | "createdAt"> & { id?: string };

const initialState: TCSDRState = {
  primers: [INITIAL_PRIMER],
  drVersion: "v1",
  errorRate: 0.02,
  platformFormat: 300,
  uploads: [],
  ...defaultSharedSubmissionData,
};

export default function Form() {
  const [tcsVersion] = useTCSVersion();
  const router = useRouter();

  const [state, setState] = useState<TCSDRState>(initialState);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const isFileSelectionValid = files.length > 0 && !fileError.length;
  const [fileValidationLoading, setFileValidationLoading] =
    useState<boolean>(false);

  const { step, stepBack, stepForward, ContinueButton } = useStepForm();
  const { useUploads, useHTSF, UploadOrHTSFButtons } = useUploadsOrHTSF();

  const isDR = useMemo(() => router.pathname?.includes("/dr"), []);

  const [scrollToUploads] = useScrollToDivOnVisibilityToggle(step > 0, "end");
  const [scrollToSubmit] = useScrollToDivOnVisibilityToggle(step > 1, "end");

  useEffect(() => {
    if (isDR) {
      setState((prev) => ({
        ...prev,
        primers: [],
      }));
    }
  }, []);

  const customAddFiles = (files: File[]) => asyncCustomAddFiles(files);
  const asyncCustomAddFiles = async (files: File[]) => {
    type ResponseFile = {
      fileName: string;
      errors: string | null;
      libName: string;
    };

    type ValidateFilesResponse = {
      files: ResponseFile[];
      allPass: boolean;
      error: string | null;
    };

    setFileValidationLoading(true);

    setFileError("");
    const filenames = files.map((f) => f.name);
    let response;
    try {
      const res = await fetch("/api/tcsdr/validateFiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileNames: filenames }),
      });
      response = await res.json();
    } catch (error) {
      setFileError("Network error. Please try again. " + (error as string));
      setFileValidationLoading(false);
      return;
    }

    const {
      files: resFiles,
      allPass,
      error: responseError,
    }: ValidateFilesResponse = response;

    if (responseError) {
      setFileError(responseError);
      return;
    }

    // for all resFiles without an error, add them to files and state.uploads
    // for all resFiles with an error, add the error to fileErrors

    if (!allPass) {
      const filesWithErrors: string = resFiles
        .filter((f) => !!f.errors)
        .map((f) => `${f.fileName}: ${f.errors}`)
        .join(", ");
      if (filesWithErrors.length) {
        setFileError(filesWithErrors);
      }
    }

    const validFilesResponse: ResponseFile[] = resFiles.filter(
      (f) => !f.errors,
    );

    if (validFilesResponse.length) {
      const validFiles = files.filter((f) =>
        validFilesResponse.some((vf) => vf.fileName === f.name),
      );

      const validUploads = validFilesResponse.map((f) => ({
        fileName: f.fileName,
        poolName: f.libName,
      }));

      setFiles((prev) => [...prev, ...validFiles]);

      setState((prev) => ({
        ...prev,
        uploads: [...(prev.uploads || []), ...validUploads],
      }));
    }

    setFileValidationLoading(false);
  };
  //reset error after uploads step, user probably ignoring those files
  useEffect(() => {
    if (step > 1) {
      setFileError("");
    }
  }, [step]);

  const DownloadJSONButton = () =>
    isDR ? null : (
      <Button
        fullWidth
        onClick={() => {
          const data = variablesToViralSeqCLI(state);
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `params${state.jobID ? `_${state.jobID}` : ""}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url); // cleanup
        }}
        download={`params${`_${state.jobID}` || ""}.json`}
        disabled={!state.email}
      >
        Download params.json
      </Button>
    );

  const loadingString = useIsLoadingAnimation(fileValidationLoading);

  return (
    <div className="flex flex-col gap-8">
      <Paper>
        <PageDescription
          title={
            isDR
              ? "Drug Resistance Pipeline"
              : "Template Concensus Sequence Pipeline"
          }
          description={
            isDR
              ? "Generate TCS and drug resistance report for using the HIV Drug Resistance Pipeline by the Swanstrom's lab."
              : "General application to create template concensus sequences (TCS) for single or multiplexed pair-end Primer ID (PID) MiSeq sequencing."
          }
          // files="should be uncompressed and in one of the following formats: fastq, fastq.gz, fq, fq.gz. Submissions cannot exceed 16MB."
          // results="include alignment views, Gene Cutter results, and a summary of large deletions, internal inversions, and inferred intactness."
          extra={
            <div className="flex flex-col gap-8">
              <div>
                <a
                  href={LINKS.prepProtocol}
                  target="_BLANK"
                  rel="noreferrer"
                  className="underline"
                >
                  Primer ID Lib Prep Protocol
                </a>
              </div>
              <div className="text-xs">
                Please cite TCS pipeline Version {tcsVersion}
              </div>
              <div className="text-xs">
                Zhou S, Jones C, Mieczkowski P, Swanstrom R. 2015. Primer ID
                Validates Template Sampling Depth and Greatly Reduces the Error
                Rate of Next-Generation Sequencing of HIV-1 Genomic RNA
                Populations. J Virol 89:8540-55.{" "}
                <a href={LINKS.citation} target="_BLANK" rel="noreferrer">
                  {LINKS.citation}
                </a>
              </div>
            </div>
          }
        />
      </Paper>
      {isDR ? (
        <DRVersion
          ContinueButton={<ContinueButton level={1} />}
          state={state}
          setState={setState}
        />
      ) : (
        <TCSContextProvider
          state={state}
          setState={setState}
          stepForward={stepForward}
        >
          <TCSContainer />
        </TCSContextProvider>
      )}
      <div ref={scrollToUploads}>
        <MyCollapse show={step > 0} className="flex flex-col gap-8">
          <UploadOrHTSFButtons />
          {useUploads && (
            <>
              <div className="flex flex-col gap-2 p-2 bg-secondary rounded-sm text-white px-4 py-2">
                <span>File name validation occurs at file selection:</span>
                <ol className="list-disc ml-6 flex flex-col gap-2">
                  <li>Attach R1-R2 pairs at the same time.</li>
                  <li>
                    Example file names: sample1_R1.fastq(.gz),
                    sample1_R2.fastq(.gz)
                  </li>
                  <li>
                    Files that fail validation will not be added to the list
                    below.
                  </li>
                </ol>
              </div>
              <Uploads
                files={files}
                setFiles={setFiles}
                error={fileError}
                customAddFiles={customAddFiles}
                showSubject={true}
              />
            </>
          )}
          {useHTSF && <HTSF state={state} setState={setState} />}
          <ContinueButton
            level={2}
            label={loadingString || "Continue"}
            disabled={
              fileValidationLoading ||
              (useUploads
                ? !isFileSelectionValid
                : !state.htsf || !state.poolName)
            }
          />
        </MyCollapse>
      </div>
      <div ref={scrollToSubmit}>
        <MyCollapse show={step > 1}>
          <div className="flex flex-col gap-8">
            <SharedSubmissionDataForm
              state={state}
              setState={setState}
              defaultJobID={`${isDR ? "dr" : "tcs"}-results`}
            />
            {!isDR && (
              <div className="flex gap-8">
                <DownloadJSONButton />
              </div>
            )}
            <ContinueButton level={3} disabled={!state.email} />
          </div>
        </MyCollapse>
      </div>
      <Confirmation
        open={step > 2}
        state={state}
        files={files}
        onClose={stepBack}
        isDR={isDR}
        useUploads={useUploads}
        DownloadJSONButton={DownloadJSONButton}
      />
    </div>
  );
}
