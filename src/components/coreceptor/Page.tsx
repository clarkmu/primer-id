import Alert from "@/components/form/Alert";
import Button from "@/components/form/Button";
import Input from "@/components/form/Input";
import { useState } from "react";
import Confirmation from "./Confirmation";
import RadioGroup from "@/components/form/RadioGroup";
import Paper from "@/components/form/Paper";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import useSequenceFile from "@/hooks/useSequenceFile";
import PageDescription from "../templates/PageDescription";

const approvedFileTypes = ["fasta", "fasta.gz", "fastq", "fastq.gz"];

export default function IntactnessPage() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [jobID, setJobID] = useState("");
  const [resultsFormat, setResultsFormat] = useState<"tar" | "zip">("tar");
  const [continued, setContinued] = useState(false);

  const {
    SequenceFileInput,
    sequences,
    parseError,
    filename,
    approvedFileTypesDisplay,
  } = useSequenceFile(approvedFileTypes);

  const [scrollToRef] = useScrollToDivOnVisibilityToggle(continued);

  const onSubmit = () => {
    // check email seqs
    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!sequences) {
      setError("Sequences are required.");
      return;
    }

    setError("");

    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 m-4">
      <Paper className="flex flex-col gap-8">
        <PageDescription
          title="Geno2Pheno Coreceptor Pipeline"
          description="Upload multiple unaligned sequences to run through Geno2Pheno Coreceptor"
          files={`should be uncompressed and in one of the following formats: ${approvedFileTypesDisplay}. Submissions cannot exceed 16MB.`}
          results="include ID, V3 Loop, Subtype, FPR, Percentage."
          extra={
            <>
              More details can be found at the{" "}
              <a
                href="https://coreceptor.geno2pheno.org/"
                target="_BLANK"
                rel="noreferrer"
                className="underline ml-1"
              >
                Geno2Pheno Coreceptor page
              </a>
              .
            </>
          }
        />
      </Paper>
      <Paper className="flex flex-col gap-4">
        <div className="text-center text-lg">
          Upload an uncompressed file with an extension of{" "}
          {approvedFileTypesDisplay}
        </div>
        <SequenceFileInput />
        {!!parseError ? (
          <Alert severity="info" msg={parseError} />
        ) : !!sequences?.result?.length && filename.length ? (
          <div className="flex flex-col gap-2 font-bold my-2">
            <div className="">Files: {filename}</div>
            <div className="">
              {sequences?.result?.length || ""} sequences found.
            </div>
          </div>
        ) : null}
        <Button disabled={!sequences?.ok} onClick={() => setContinued(true)}>
          Continue
        </Button>
      </Paper>
      {continued && (
        <div className="" ref={scrollToRef}>
          <Paper className="flex flex-col gap-4">
            <Input
              label="Email"
              placeholder="example@uni.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              name="jobID"
              label="Name Output (optional* whitespace is replaced by _)"
              placeholder=""
              value={jobID}
              onChange={(e) => setJobID(e.target.value.replace(/\s/g, "_"))}
            />
            <RadioGroup
              label={`Results Format: Geno2Pheno_${jobID || "{id}"}${
                resultsFormat === "tar" ? ".tar.gz" : ".zip"
              }`}
              value={resultsFormat}
              radios={[
                { label: ".tar.gz", value: "tar" },
                { label: ".zip", value: "zip" },
              ]}
              onChange={(e) => setResultsFormat(e.target.value)}
            />
            {!!error && <Alert severity="error" msg={error} />}
            <Button
              onClick={onSubmit}
              disabled={!sequences || !email || !sequences?.ok}
              fullWidth
            >
              Submit
            </Button>
          </Paper>
        </div>
      )}
      <Confirmation
        open={open}
        onClose={() => setOpen(false)}
        email={email}
        sequences={sequences}
        filename={filename}
        resultsFormat={resultsFormat}
        jobID={jobID}
      />
    </div>
  );
}
