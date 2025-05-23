import Button from "@/components/form/Button";
import usePrideMonthStyling from "@/hooks/usePrideMonthStyling";
import Paper from "@/components/form/Paper";
import { useRouter } from "next/router";
import ImageWithOverlay from "./ImageWithOverlay";
import { changeLogList, Log } from "../ChangeLog";
import Link from "next/link";

const Card = ({ title, src, alt, Buttons, priority, Body }) => {
  const [titleStyle, titleTextStyle] = usePrideMonthStyling();

  return (
    <Paper className={`flex flex-col gap-4 items-center ${titleStyle}`}>
      <div className={`text-3xl font-bold ${titleTextStyle}`}>{title}</div>
      <hr className="w-[80%]" />
      {src && <ImageWithOverlay src={src} alt={alt} priority={priority} />}
      {Buttons && <Buttons />}
      {Body && Body}
    </Paper>
  );
};

export default function HomePage() {
  const { push } = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Change Log"
        Body={
          <div className="flex flex-col gap-1 w-4/5">
            <Log log={changeLogList[0]} />
            <Link className="underline text-sm" href="/changelog">
              See Change Log
            </Link>
          </div>
        }
      />
      <Card
        title="Primer ID Sequencing"
        src="/primeridbanner.webp"
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
        src="/ogvbanner.webp"
        alt="OGV Diagram"
        Buttons={() => (
          <Button onClick={() => push("/ogv")}>OGV Pipeline</Button>
        )}
      />
      <Card
        priority={false}
        title="HIV Proviral Intactness"
        src="/intactness.webp"
        alt="Intactness Diagram"
        Buttons={() => (
          <Button onClick={() => push("/intactness")}>
            Intactness Pipeline
          </Button>
        )}
      />
      <Card
        priority={false}
        title="HIV Coreceptor Tropism"
        alt="HIV Coreceptor Tropism"
        src="https://clinicalinfo.hiv.gov/sites/default/files/glossaries/images/ViralTropism-800.jpg"
        Buttons={() => (
          <Button onClick={() => push("/coreceptor")}>
            Coreceptor Pipeline
          </Button>
        )}
      />
    </div>
  );
}
