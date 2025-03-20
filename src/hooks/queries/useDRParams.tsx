import LINKS from "@/utils/constants/LINKS";
import { useQuery } from "react-query";

export default function useDRParams() {
  const { data: params = {} } = useQuery("drParams", async () => {
    const response = await fetch(`${LINKS.RUBY_API_SERVER}/list_drm_params`);
    // const response = await fetch(`http://localhost:9292/list_drm_params`, {
    //   mode: "no-cors",
    //   headers: {
    //     "Access-Control-Allow-Origin": "*",
    //   },
    // });
    return await response.json();
  });

  return { params };
}
