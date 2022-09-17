import { useRouter } from "next/router";
import { ReactNode, useMemo } from "react";

const MyLink = ({ value, label }: { value: any; label: string }) => {
  const { push, pathname: p } = useRouter();
  const currentPage = useMemo(
    () =>
      p.indexOf("/tcs") > -1
        ? "/tcs"
        : p.indexOf("/dr") > -1
        ? "/dr"
        : p.indexOf("/link") > -1 || p.indexOf("/contact") > -1
        ? "/links"
        : p.indexOf("/ogv") > -1
        ? "/ogv"
        : "/",
    [p]
  );

  return (
    <div
      onClick={() => push(value)}
      className={
        "flex-1 flex justify-center items-center py-2 my-2 cursor-pointer " +
        (value === currentPage
          ? "text-white border-b border-b-secondary"
          : "text-grey")
      }
    >
      {label}
    </div>
  );
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex justify-around w-full shadow bg-primary">
        <MyLink value="/" label="Home" />
        <MyLink value="/tcs" label="TCS Pipeline" />
        <MyLink value="/dr" label="DR Pipeline" />
        <MyLink value="/ogv" label="OGV Pipeline" />
        <MyLink value="/links" label="Links" />
      </div>
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
