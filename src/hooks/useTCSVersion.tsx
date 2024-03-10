import LINKS from "@/utils/constants/LINKS";
import { useQuery } from "react-query";

export default function useTCSVersion() {
  const { data = "" } = useQuery(
    "tcsVersion",
    async () => await (await fetch(LINKS.TCS_VERSION_SOURCE)).json()
  );

  const tcsVersion = data?.tag_name?.replace("v", "") || "2.5.#";

  return [tcsVersion];
}
