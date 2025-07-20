import { usePrimerContext } from "@/contexts/PrimerContext";
import { PrimerContainerChild } from "./Container";

export default function Summary() {
  const { primer } = usePrimerContext();

  return (
    <PrimerContainerChild>
      <pre data-cy="primerSummary">{JSON.stringify(primer, null, 2)}</pre>
    </PrimerContainerChild>
  );
}
