import Uploads from "./Uploads";
import Confirmation from "./Confirmation";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import MyCollapse from "@/components/form/MyCollapse";
import useTCSVersion from "@/hooks/queries/useTCSVersion";
import Button from "../form/Button";
import Input from "../form/Input";
import useScrollToDivOnVisibilityToggle from "@/hooks/useScrollToDivOnVisibilityToggle";
import RadioGroup from "../form/RadioGroup";
import Paper from "../form/Paper";
import LINKS from "@/utils/constants/LINKS";
// import TCSContainer from "./TCS/TCSContainer";
import dynamic from "next/dynamic";
import DRVersion from "./DRVersion";
import PageDescription from "../templates/PageDescription";
const TCSContainer = dynamic(() => import("./TCS/TCSContainer"), {
  loading: () => null,
});

export default function Form() {
  const [tcsVersion] = useTCSVersion();

  const {
    state: {
      isDR,
      showUploads,
      showSubmit,
      pipeline: { email, jobID, resultsFormat },
    },
    downloadJSON,
    editPipeline,
  } = useTCSDRContext();

  const [scrollToUploads] = useScrollToDivOnVisibilityToggle(
    showUploads,
    "end",
  );

  const [scrollToSubmit] = useScrollToDivOnVisibilityToggle(showSubmit, "end");

  return (
    <div className="flex flex-col gap-4">
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
            <div className="flex flex-col gap-4">
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
      {isDR ? <DRVersion /> : <TCSContainer />}
      <div ref={scrollToUploads}>
        <MyCollapse show={showUploads}>
          <Uploads />
        </MyCollapse>
      </div>
      <div ref={scrollToSubmit}>
        <MyCollapse show={showSubmit}>
          <div className="flex flex-col gap-6">
            <Input
              name="email"
              label="Email"
              placeholder="Email to receive results"
              value={email}
              onChange={(e) => editPipeline({ email: e.target.value.trim() })}
            />
            <Input
              name="jobID"
              label="Name output (optional* whitespace is replaced by _)"
              placeholder=""
              value={jobID}
              onChange={(e) =>
                editPipeline({ jobID: e.target.value.replace(/\s/g, "_") })
              }
            />
            <RadioGroup
              label={`Results Format: ${isDR ? "dr" : "tcs"}-results_${
                jobID || "{id}"
              }${resultsFormat === "tar" ? ".tar.gz" : ".zip"}`}
              value={resultsFormat}
              radios={[
                { label: ".tar.gz", value: "tar" },
                { label: ".zip", value: "zip" },
              ]}
              onChange={(e) => editPipeline({ resultsFormat: e.target.value })}
            />
            <div className="flex gap-4">
              <Button
                fullWidth
                href={downloadJSON()}
                download="params.json"
                disabled={!email}
              >
                Download params.json
              </Button>
              <Confirmation />
            </div>
          </div>
        </MyCollapse>
      </div>
    </div>
  );
}
