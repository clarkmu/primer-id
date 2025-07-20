import { ReactNode } from "react";

export default function Paper({
  children,
  className = "",
  ...props
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`px-4 py-6 sm:px-6 sm:py-8 w-full ${className}`}
      style={{
        boxShadow:
          "0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
