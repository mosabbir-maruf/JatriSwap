import type { VercelRequest, VercelResponse } from "@vercel/node";

import { ContactHttpError } from "./lib/contact/httpError";
import { logUnexpectedContactError } from "./lib/contact/logUnexpectedContact";

function applyCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { handleContactPost } = await import("./lib/contact/httpPost");
    res.status(200).json(await handleContactPost(req.body, req.headers));
  } catch (err) {
    if (err instanceof ContactHttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    logUnexpectedContactError("handler", err);
    res.status(500).json({ error: "Could not send your message right now. Please try again later." });
  }
}
