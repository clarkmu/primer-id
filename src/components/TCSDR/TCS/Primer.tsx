import Button from "@/components/form/Button";
import Collapse from "@/components/form/Collapse";
import Region from "./primer/Region";
import EndJoin from "./primer/EndJoin";
import QC from "./primer/QC";
import Trim from "./primer/Trim";
import Summary from "./primer/Summary";
import PrimerContainer from "./primer/Container";
import { useTCS } from "@/contexts/TCSContext";
import { usePrimerContext } from "@/contexts/PrimerContext";

export default function Primer({ countPrimers }: { countPrimers: number }) {
  const { stepForward, setExpandedPrimer } = useTCS();

  const { page, deletePrimer, addPrimer, handleNextPage, handleBackPage } =
    usePrimerContext();

  const finish = () => {
    stepForward();
    setExpandedPrimer(-1);
  };

  return (
    <div className="flex flex-col gap-4">
      <PrimerContainer>
        <Collapse open={page === 1}>
          <Region />
        </Collapse>
        <Collapse open={page === 2}>
          <EndJoin />
        </Collapse>
        <Collapse open={page === 3}>
          <QC />
        </Collapse>
        <Collapse open={page === 4}>
          <Trim />
        </Collapse>
        <Collapse open={page === 5}>
          <Summary />
        </Collapse>
      </PrimerContainer>
      <div className="flex justify-around">
        <Button
          onClick={deletePrimer}
          disabled={countPrimers < 2}
          data-cy="primerDeleteButton"
        >
          Delete Region
        </Button>
        <Button
          disabled={page === 1}
          onClick={handleBackPage}
          data-cy="primerBackButton"
        >
          Back
        </Button>
        <Button
          disabled={page === 5}
          onClick={handleNextPage}
          data-cy="primerNextButton"
        >
          Next
        </Button>
        <Button
          onClick={() => addPrimer(false)}
          disabled={page !== 5}
          data-cy="primerAddButton"
        >
          Add Region
        </Button>
        <Button
          onClick={finish}
          disabled={page !== 5}
          data-cy="primerFinishButton"
        >
          Finish
        </Button>
      </div>
    </div>
  );
}
