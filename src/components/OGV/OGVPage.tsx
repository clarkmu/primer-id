import ConfirmModal from "@/components/OGV/ConfirmModal";
import Conversion from "@/components/OGV/Conversion";
import Submit from "@/components/OGV/Submit";
import Uploads from "@/components/OGV/Uploads";
import { useOGVContext } from "@/contexts/OGVContext";
import Paper from "@/components/form/Paper";

export default function OGVPage() {
  const {
    state: { showSubmit, showConversion, files },
  } = useOGVContext();

  return (
    <div className="flex flex-col gap-4 items-center justify-center">
      <Paper>
        <div className="flex flex-col gap-8">
          <div>
            <b>DESCRIPTION</b> This pipeline times outgrowth virus (OGV) strains
            from a single host using serially sampled RNA data. Four different
            approaches are used to assign dates to unobserved strains. First,
            each tree is rooted to maximize the root-to-tip to sampling time
            correlation coefficient.
          </div>
          <div>
            <b>FILE NAMING CONVENTION</b> File names should be formatted as
            {` {subject}_{sample}.fasta`}. Special characters (-/*) in filename
            will be filtered out.
          </div>
          <div>
            <div>
              <a
                href="https://github.com/clarkmu/ogv-dating"
                target="_BLANK"
                rel="noreferrer"
                className="underline"
              >
                This pipeline
              </a>{" "}
              was adapted from the{" "}
              <a
                href="https://github.com/veg/ogv-dating"
                target="_BLANK"
                rel="noreferrer"
                className="underline"
              >
                Outgrowth Virus Dating pipeline
              </a>{" "}
              created by{" "}
              <a
                href="http://sdcsb.ucsd.edu/igem/"
                target="_BLANK"
                rel="noreferrer"
                className="underline"
              >
                iGEM/UCSD evolutionary biology and bioinformatics group
              </a>
              .
            </div>
          </div>
        </div>
      </Paper>
      <Paper>
        <Uploads />
      </Paper>
      {showConversion && (
        <Paper>
          <Conversion />
        </Paper>
      )}
      {showSubmit && files.length > 0 && (
        <Paper>
          <Submit />
        </Paper>
      )}
      <ConfirmModal />
    </div>
  );
}
