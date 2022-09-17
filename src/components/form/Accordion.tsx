import { ChevronDownIcon } from "@heroicons/react/solid";
import { ReactNode } from "react";
import Collapse from "./Collapse";
import Paper from "./Paper";

const Accordion = ({
  title,
  expanded,
  onChange,
  children,
}: {
  title: string;
  expanded: boolean;
  onChange: (b: boolean) => void;
  children: ReactNode;
}) => (
  <Paper>
    <div
      className="px-4 flex justify-start items-center gap-4 cursor-pointer border-b border-b-grey"
      onClick={(e) => onChange(!expanded)}
    >
      <div className="font-lg text-lg flex-1">{title}</div>
      <ChevronDownIcon
        className={"w-4 h-4 text-black " + (expanded ? "" : "rotate-180")}
      />
    </div>
    <Collapse open={expanded}>{children}</Collapse>
  </Paper>
);

export default Accordion;
