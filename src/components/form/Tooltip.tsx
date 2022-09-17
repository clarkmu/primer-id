import { Transition } from "@headlessui/react";
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
      <Transition
        show={show}
        enter="transition-opacity duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="p-2 text-xs font-semibold text-black z-[999] absolute bottom-0 left-0 translate-y-[110%] translate-x-[-50%] w-60 bg-grey">
          {tooltip}
        </div>
      </Transition>
    </div>
  );
}
