import { SEOTCS } from "@/components/SEO";
import Form from "@/components/TCSDR/Form";
import TCSDRContextProvider from "@/contexts/TCSDRContext";

export default function TCS() {
  return (
    <TCSDRContextProvider isDR={false}>
      <SEOTCS>
        <Form />
      </SEOTCS>
    </TCSDRContextProvider>
  );
}
