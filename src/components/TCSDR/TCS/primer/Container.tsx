/**
 * This is a workaround to get the Tooltips to not be contained in the Primer selection
 *
 * Not responsive, but neither are the back/next/finished buttons.
 *      If this needs to be improved then set Tooltip directions and set PrimerContainer.overflow-y-auto
 *
 */

export default function PrimerContainer({ children }) {
  return <div className="h-[400px]">{children}</div>;
}

export function PrimerContainerChild({ children }) {
  return <div className="h-[400px] overflow-y-auto">{children}</div>;
}
