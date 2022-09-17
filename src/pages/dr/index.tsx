import { SEODR } from "@/components/SEO";
import Form from "@/components/TCSDR/Form";
import TCSDRContextProvider from "@/contexts/TCSDRContext";

export default function DR() {
  return (
    <TCSDRContextProvider isDR={true}>
      <SEODR>
        <Form />
      </SEODR>
    </TCSDRContextProvider>
  );
}
