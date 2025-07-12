import { useMutation } from "react-query";

export default function usePost(url: string) {
  const mutateSubmit = useMutation(
    async ({ body }: { body: object; callback: (id: string) => void }) => {
      return await (
        await fetch(url, {
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
