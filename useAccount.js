import { useQuery } from "@tanstack/react-query";
import { getAccount } from "@/lib/server-fns";

/** The signed-in member's account, quota and storage state. */
export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: () => getAccount(),
    staleTime: 20_000,
  });
}