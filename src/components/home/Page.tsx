import Button from "@/components/form/Button";
import usePrideMonthStyling from "@/hooks/usePrideMonthStyling";
import Paper from "@/components/form/Paper";
import { useRouter } from "next/router";
import ImageWithOverlay from "./ImageWithOverlay";

const Card = ({ title, src, alt, Buttons, priority }) => {
  const [titleStyle, titleTextStyle] = usePrideMonthStyling();

  return (
    <Paper className={`flex flex-col gap-4 items-center ${titleStyle}`}>
      <div className={`text-3xl font-bold ${titleTextStyle}`}>{title}</div>
      <hr className="w-[80%]" />
      <ImageWithOverlay src={src} alt={alt} priority={priority} />
      <Buttons />
    </Paper>
  );
};

export default function HomePage() {
  const { push } = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Primer ID Sequencing"
        src="/primeridbanner.jpg"
        alt="Primer ID Sequencing Diagram"
        priority={true}
        Buttons={() => (
          <div className="flex justify-around w-full">
            <Button onClick={() => push("/tcs")}>TCS Pipeline</Button>
            <Button onClick={() => push("/dr")}>DR Pipeline</Button>
          </div>
        )}
      />
      <Card
        priority={false}
        title="Outgrowth Virus Dating"
        src="https://github.com/veg/ogv-dating/blob/master/img/3.png?raw=true"
        alt="OGV Diagram"
        Buttons={() => (
          <Button onClick={() => push("/ogv")}>OGV Pipeline</Button>
        )}
      />
      <Card
        priority={false}
        title="HIV Proviral Intactness"
        src="/intactness.png"
        alt="Intactness Diagram"
        Buttons={() => (
          <Button onClick={() => push("/intactness")}>
            Intactness Pipeline
          </Button>
        )}
      />
    </div>
  );
}
