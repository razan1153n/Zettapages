import { useQuery } from "@tanstack/react-query";
import { createAccessUrls } from "@/lib/server-fns";

const THUMB_TTL_MS = 45 * 60 * 1000;

/** Preview URLs for the image files currently on screen (never the whole library). */
export function useThumbnails(files) {
  const ids = (files || [])
    .filter((file) => file.category === "image" && file.status !== "trashed")
    .slice(0, 30)
    .map((file) => file.id);
  const key = ids.join("|");

  const query = useQuery({
    queryKey: ["thumbnails", key],
    queryFn: () => createAccessUrls({ data: { fileIds: ids, ttlMinutes: 60 } }),
    enabled: ids.length > 0,
    staleTime: THUMB_TTL_MS,
  });

  return query.data?.urls ?? {};
}