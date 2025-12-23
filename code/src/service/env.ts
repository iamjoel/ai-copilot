import { useQuery } from "@tanstack/react-query";

export const useEnv = () => {
  return useQuery({
    queryKey: ["env"],
    queryFn: async () => {
      const res = await fetch("/api/env");
      return res.json() as Promise<{ massType: string }>;
    }
  })
}

