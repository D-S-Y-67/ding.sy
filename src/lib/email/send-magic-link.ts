import { render } from "@react-email/render";
import { createElement } from "react";
import { Resend } from "resend";
import { MagicLinkEmail } from "@/emails/magic-link-email";
import { optionalEnv } from "../env";

/**
 * Delivers the magic-link email via Resend, rendered from the themed
 * react-email template (HTML + plain-text alternative).
 *
 * Without RESEND_API_KEY (local dev) the link is printed to the server
 * console instead of sending real email — this is also how the E2E flow
 * is tested without an inbox.
 */
export async function sendMagicLinkEmail(params: {
  email: string;
  url: string;
}): Promise<void> {
  const apiKey = optionalEnv("RESEND_API_KEY");

  if (!apiKey) {
    console.log(
      `\n✦ [dev] Magic link for ${params.email}:\n  ${params.url}\n`,
    );
    return;
  }

  const email = createElement(MagicLinkEmail, { url: params.url });
  const [html, text] = await Promise.all([
    render(email),
    render(email, { plainText: true }),
  ]);

  const resend = new Resend(apiKey);
  const from = optionalEnv("EMAIL_FROM") ?? "Regmaglypt <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: params.email,
    subject: "Your sign-in link for Regmaglypt",
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend rejected the magic-link email: ${error.message}`);
  }
}
