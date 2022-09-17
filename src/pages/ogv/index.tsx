import OGVPage from "@/components/OGV/OGVPage";
import { SEOOGV } from "@/components/SEO";
import OGVContextProvider from "@/contexts/OGVContext";

export default function OGV() {
  return (
    <OGVContextProvider>
      <SEOOGV>
        <OGVPage />
      </SEOOGV>
    </OGVContextProvider>
  );
}
