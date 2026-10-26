import { createFileRoute } from "@tanstack/react-router";
import { requireUserRoute } from "@/lib/auth-middleware";
import { handleUpload } from "@/lib/upload.server";

export const Route = createFileRoute("/api/storage/upload")({
  server: {
    middleware: [requireUserRoute],
    handlers: {
      POST: async ({ request, context }) => handleUpload(request, context),
    },
  },
});