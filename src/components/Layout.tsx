import { ReactNode } from "react";
import Nav from "./Nav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <Nav />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[800px] mx-auto my-8">{children}</div>
      </div>
      <footer
        className={`w-full text-center px-2 py-1 bg-paper text-white flex flex-col`}
      >
        <a
          href="https://github.com/ViralSeq/viral_seq"
          target="_blank"
          rel="noreferrer"
          color="primary"
        >
          Source code
        </a>
        <div className="text-white text-sm">
          This web app was established with support from the National Institutes
          of Health and UNC Information Technology Services.
        </div>
      </footer>
    </div>
  );
}
