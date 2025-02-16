import Primer from "./Primer";
import GlobalSettings from "./GlobalSettings";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import Accordion from "@/components/form/Accordion";
import PrimerContextProvider from "@/contexts/PrimerContext";
import { useEffect } from "react";
import INITIAL_PRIMER from "@/utils/constants/INITIAL_PRIMER";
import { TcsdrsPrimers } from "@prisma/client";

export default function PrimersContainer() {
  const {
    state: {
      pipeline: { primers },
      expandedPrimer,
    },
    setState,
    editState,
  } = useTCSDRContext();

  useEffect(() => {
    if (!primers.length) {
      editState({
        primers: [INITIAL_PRIMER],
        expandedPrimer: 0,
      });
    }
  }, [primers.length]);

  return (
    <>
      <GlobalSettings />
      {primers.map((primer: TcsdrsPrimers, i) => (
        <Accordion
          key={`primer_${i}`}
          title={`Sequence Region #${i + 1}${
            primer.region?.length ? ` - ${primer.region}` : ""
          }`}
          expanded={expandedPrimer === i}
          onChange={(ex) => editState({ expandedPrimer: ex ? i : false })}
        >
          <PrimerContextProvider
            primer={primer}
            index={i}
            finish={() => {
              editState({ showUploads: true });
              setState((s) => ({ ...s, expandedPrimer: s.expandedPrimer - 1 }));
            }}
          >
            <Primer />
          </PrimerContextProvider>
        </Accordion>
      ))}
    </>
  );
}
