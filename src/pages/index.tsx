import LINKS from "@/utils/constants/LINKS";
import useTCSVersion from "@/hooks/useTCSVersion";
import Button from "@/components/form/Button";
import usePrideMonthStyling from "@/hooks/usePrideMonthStyling";
import Paper from "@/components/form/Paper";

const Home = () => {
  const [tcsVersion] = useTCSVersion();
  const [titleStyle, titleTextStyle] = usePrideMonthStyling();

  return (
    <div className="flex flex-col gap-4">
      <Paper>
        <div className={`flex flex-col gap-4 items-center ${titleStyle}`}>
          <div className={`text-3xl font-bold ${titleTextStyle}`}>
            Primer ID Sequencing
          </div>
          <hr className="divider" />
          <img src={LINKS.IMAGES.intro} className="max-w-[100%]" />
        </div>
      </Paper>
      <Paper>
        <div className="flex flex-col gap-4">
          <div className="text-lg font-bold">Instructions</div>
          <div>
            <b>TCS Pipline:</b>General application to create template concensus
            sequences (TCS) for single or multiplexed pair-end Primer ID (PID)
            MiSeq sequencing.
          </div>
          <div>
            <b>DR Pipline:</b>Generate TCS and drug resistance report for using
            the HIV Drug Resistance Pipeline by the Swanstrom{"'"}s lab.
          </div>
          <Button color="primary" href={LINKS.prepProtocol} target="_BLANK">
            Primer ID Lib Prep Protocol
          </Button>
          <div className="text-xs">
            Please cite TCS pipeline Version {tcsVersion}
          </div>
          <div className="text-xs">
            Zhou S, Jones C, Mieczkowski P, Swanstrom R. 2015. Primer ID
            Validates Template Sampling Depth and Greatly Reduces the Error Rate
            of Next-Generation Sequencing of HIV-1 Genomic RNA Populations. J
            Virol 89:8540-55.{" "}
            <a href={LINKS.citation} target="_BLANK" rel="noreferrer">
              {LINKS.citation}
            </a>
          </div>
        </div>
      </Paper>
    </div>
  );
};

export default Home;
