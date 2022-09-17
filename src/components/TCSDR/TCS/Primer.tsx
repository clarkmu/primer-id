import Button from "@/components/form/Button";
import Collapse from "@/components/form/Collapse";
import { usePrimerContext } from "@/contexts/PrimerContext";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import Region from "./primer/Region";
import EndJoin from "./primer/EndJoin";
import QC from "./primer/QC";
import Trim from "./primer/Trim";
import Summary from "./primer/Summary";

export default function Primer() {
  const {
    page,
    deletePrimer,
    addPrimer,
    finish,
    handleNextPage,
    handleBackPage,
  } = usePrimerContext();

  const {
    state: {
      pipeline: { primers },
    },
  } = useTCSDRContext();

  return (
    <div className="flex flex-col gap-4">
      <div className="h-[400px] overflow-y-auto">
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
      </div>
      <div className="flex justify-around">
        <Button onClick={deletePrimer} disabled={primers.length < 2}>
          Delete Region
        </Button>
        <Button disabled={page === 1} onClick={handleBackPage}>
          Back
        </Button>
        <Button disabled={page === 5} onClick={handleNextPage}>
          Next
        </Button>
        <Button onClick={() => addPrimer(false)} disabled={page !== 5}>
          Add Region
        </Button>
        <Button onClick={finish} disabled={page !== 5}>
          Finish
        </Button>
      </div>
    </div>
  );
}
