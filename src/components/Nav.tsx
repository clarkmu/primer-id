import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const pipelineLinks = [
  {
    value: "/tcs",
    label: "TCS",
  },
  {
    value: "/dr",
    label: "HIV Drug Resistance & Quantitative Recency",
  },
  {
    value: "/ogv",
    label: "Outgrowth Virus Dating",
  },
  {
    value: "/intactness",
    label: "Intactness",
  },
];

const MyLink = ({
  value,
  label,
  active,
  onClick,
}: {
  value: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) => {
  const { push } = useRouter();

  return (
    <div
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (value) {
          push(value);
        }
      }}
      className={
        "flex-1 flex justify-center items-center py-2 my-2 cursor-pointer hover:text-gray-300 " +
        (active ? "text-secondary" : "text-grey")
      }
    >
      {label}
    </div>
  );
};

export default function Nav() {
  const { pathname, push } = useRouter();
  const [open, setOpen] = useState(false);

  // handle pipelines nav open/close
  useEffect(() => {
    const handleClick = (e) => {
      if (open && !e.target.closest("#nav-bar-opener")) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [open, setOpen]);

  return (
    <div className="flex justify-around w-full shadow bg-primary">
      <MyLink value="/" label="Home" active={pathname === "/"} />
      <div className="flex-1 relative flex justify-center items-center">
        <div id="nav-bar-opener">
          <MyLink
            label="Pipelines"
            active={pathname !== "/" && pathname !== "/links"}
            onClick={() => setOpen(true)}
          />
        </div>
        {open && (
          <div className="absolute w-full bg-primary border-t-white border-t-2 left-0 bottom-0 translate-y-full divide-y outline-none z-[99]">
            {pipelineLinks.map(({ value, label }) => (
              <MyLink
                key={value}
                value={value}
                label={label}
                active={pathname === value}
                onClick={() => push(value)}
              />
            ))}
          </div>
        )}
      </div>
      <MyLink value="/links" label="Links" active={pathname === "/links"} />
    </div>
  );
}
