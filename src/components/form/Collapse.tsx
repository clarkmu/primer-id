import { ReactNode } from "react";

export default function Collapse({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return open ? children : null;
}
