import { usePrimerContext } from "@/contexts/PrimerContext";

export default function Summary() {
  const { primer } = usePrimerContext();

  return <pre>{JSON.stringify(primer, null, 2)}</pre>;
}
