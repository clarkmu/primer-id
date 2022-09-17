import LINKS from "@/utils/constants/LINKS";
import { useEffect, useState } from "react";

const bestEffortAtKeepingVersionUpToDate = "2.5.1";

export default function useTCSVersion() {
  const [tcsVersion, setTCSVersion] = useState(
    typeof window !== "undefined" && window?.localStorage.tcsVersion
      ? window?.localStorage.tcsVersion
      : bestEffortAtKeepingVersionUpToDate
  );

  const getTCSVersion = async () => {
    try {
      const data = await (await fetch(LINKS.TCS_VERSION_SOURCE)).json();
      const version = data.tag_name?.replace("v", "");
      setTCSVersion(version);
      localStorage.tcsVersion = version;
    } catch (e) {
      setTimeout(getTCSVersion, 500);
    }
  };

  useEffect(() => {
    getTCSVersion();
  }, []);

  return [tcsVersion];
}
