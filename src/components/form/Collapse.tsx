import { Transition } from "@headlessui/react";
import { ReactNode } from "react";

export default function Collapse({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <Transition
      show={open}
      enter="transition-opacity duration-150"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-0"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      {open ? children : null}
    </Transition>
  );
}
