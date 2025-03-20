import { useMutation } from "react-query";

export default function useSplicing() {
  const mutateSubmit = useMutation(
    async ({
      body,
    }: {
      body: {
        sequences: string;
        email: string;
        jobID: string;
        resultsFormat: string;
      };
      callback: (id: string) => void;
    }) => {
      return await (
        await fetch("/api/splicing", {
          method: "POST",
          body: JSON.stringify(body),
        })
      ).json();
    },
    {
      onSuccess: (data, { callback }) => {
        callback(data);
      },
    },
  );

  return mutateSubmit;
}
