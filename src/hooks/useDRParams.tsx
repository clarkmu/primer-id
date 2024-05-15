import LINKS from "@/utils/constants/LINKS";
import { useQuery } from "react-query";

export default function useDRParams() {
  const { data: params = {} } = useQuery("drParams", async () => {
    const response = await fetch(`${LINKS.RUBY_API_SERVER}/list_dr_params`);
    return await response.json();
  });

  return { params };
}
