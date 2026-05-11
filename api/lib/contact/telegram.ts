import {
  CONTACT_TELEGRAM_TEXT_MAX,
  type SanitizedContactPayload,
} from "../../../shared/contactValidation";

function truncateForTelegram(text: string): string {
  if (text.length <= CONTACT_TELEGRAM_TEXT_MAX) return text;
  return `${text.slice(0, CONTACT_TELEGRAM_TEXT_MAX - 20)}\n…(truncated)`;
}

export function formatContactTelegramText(payload: SanitizedContactPayload): string {
  const lines = [
    "JatriSwap — contact form",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Subject: ${payload.subject}`,
    "",
    "Message:",
    payload.message,
  ];
  return truncateForTelegram(lines.join("\n"));
}

export async function sendTelegramPlainText(opts: {
  token: string;
  chatId: string;
  text: string;
}): Promise<void> {
  const url = `https://api.telegram.org/bot${encodeURIComponent(opts.token)}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: opts.chatId,
      disable_web_page_preview: true,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const snippet = bodyText.length > 400 ? `${bodyText.slice(0, 400)}…` : bodyText;
    throw new Error(`telegram_http_${res.status}:${snippet}`);
  }

  const json = (await res.json()) as { ok?: unknown };
  if (json.ok !== true) {
    throw new Error("telegram_api_rejected");
  }
}
