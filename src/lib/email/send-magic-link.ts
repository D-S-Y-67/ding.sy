import { Resend } from "resend";
import { optionalEnv } from "../env";

/**
 * Delivers the magic-link email. Without RESEND_API_KEY (local dev) the
 * link is printed to the server console instead of sending real email —
 * this is also how the E2E flow is tested without an inbox.
 *
 * M4 replaces the plain HTML body with the themed react-email template.
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

  const resend = new Resend(apiKey);
  const from = optionalEnv("EMAIL_FROM") ?? "Regmaglypt <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: params.email,
    subject: "Your sign-in link for Regmaglypt",
    html: `<p>Sign in to Regmaglypt by opening this link: <a href="${params.url}">${params.url}</a></p><p>The link stays valid for 10 minutes and works once. If you didn't request it, ignore this email.</p>`,
  });

  if (error) {
    throw new Error(`Resend rejected the magic-link email: ${error.message}`);
  }
}
