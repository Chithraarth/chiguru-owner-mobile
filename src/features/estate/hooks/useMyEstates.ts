import { useQuery } from "@tanstack/react-query";
import { getMyEstates } from "../../../api/endpoints/estates";

/**
 * Every estate this signed-in person may act on — their own farm(s), plus
 * every farm they've been invited to manage. Unlike useEstates() (backed by
 * GET /estates, which is scoped to whichever owner X-Estate-Id already
 * resolves to), this is the one hook that can answer "what are ALL my
 * options" before any estate has been chosen — used by the Choose Estate
 * screen right after sign-in, and by anything that needs to show both
 * relationships at once (e.g. a combined switcher).
 */
export function useMyEstates() {
  return useQuery({
    queryKey: ["my-estates"],
    queryFn: getMyEstates,
  });
}
