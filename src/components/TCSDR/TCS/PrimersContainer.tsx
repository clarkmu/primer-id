import Primer from "./Primer";
import Accordion from "@/components/form/Accordion";
import PrimerContextProvider from "@/contexts/PrimerContext";
import { useEffect } from "react";
import INITIAL_PRIMER from "@/utils/constants/INITIAL_PRIMER";
import { TcsdrsPrimers } from "@prisma/client";
import { useTCS } from "@/contexts/TCSContext";

export default function PrimersContainer() {
  const {
    state: { primers },
    setState,
    stepForward,
    expandedPrimer,
    setExpandedPrimer,
  } = useTCS();

  useEffect(() => {
    if (!primers.length) {
      setState((s) => ({ ...s, primers: [INITIAL_PRIMER] }));
      setExpandedPrimer(0);
    }
  }, [primers.length]);

  return (
    <>
      {primers.map((primer: TcsdrsPrimers, i) => (
        <Accordion
          key={`primer_${i}`}
          title={`Sequence Region #${i + 1}${
            primer.region?.length ? ` - ${primer.region}` : ""
          }`}
          expanded={expandedPrimer === i}
          onChange={(ex) => setExpandedPrimer(ex ? i : false)}
          data-cy={`primerContainer_${i}`}
        >
          <PrimerContextProvider primer={primer} index={i}>
            <Primer countPrimers={primers.length} />
          </PrimerContextProvider>
        </Accordion>
      ))}
    </>
  );
}
