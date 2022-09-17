import { useState } from "react";
import Primer from "./Primer";
import GlobalSettings from "./GlobalSettings";
import { useTCSDRContext } from "@/contexts/TCSDRContext";
import Accordion from "@/components/form/Accordion";
import PrimerContextProvider from "@/contexts/PrimerContext";
import { PrimerInterface } from "@/models/TCSDR";

export default function PrimersContainer() {
  const {
    state: {
      pipeline: { primers },
    },
    editState,
  } = useTCSDRContext();

  const [expanded, setExpanded] = useState(0);

  return (
    <>
      <GlobalSettings />
      {primers.map((primer: PrimerInterface, i) => (
        <Accordion
          key={`primer_${i}`}
          title={`Sequence Region #${i + 1}${
            primer.region?.length ? ` - ${primer.region}` : ""
          }`}
          expanded={expanded === i}
          onChange={(ex) => setExpanded(ex ? i : false)}
        >
          <PrimerContextProvider
            primer={primer}
            index={i}
            finish={() => {
              editState({ showUploads: true });
              setExpanded(-1);
            }}
          >
            <Primer />
          </PrimerContextProvider>
        </Accordion>
      ))}
    </>
  );
}
