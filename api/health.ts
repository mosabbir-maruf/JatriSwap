/** Minimal probe — if this 200s but `/api/contact` fails, the bug is in the contact graph (Firebase/Telegram), not Vercel routing. */

export default async function health(): Promise<Response> {
  return Response.json({ ok: true });
}
