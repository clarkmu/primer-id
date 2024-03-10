import { useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/outline";

export default function Tooltip({ tooltip }: { tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((b) => !b)}
      className="relative text-primary hover:bg-grey rounded-full h-8 w-8 cursor-pointer"
    >
      <QuestionMarkCircleIcon className="w-6 h-6 text-primary" />
      {show ? (
        <div className="overflow-visible p-2 text-xs font-semibold text-black !z-[999] absolute bottom-0 left-0 translate-y-[110%] translate-x-[-50%] w-60 bg-grey">
          {tooltip}
        </div>
      ) : null}
    </div>
  );
}
