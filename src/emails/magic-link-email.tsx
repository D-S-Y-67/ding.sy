import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * The magic-link email. Email clients allow no webfonts-with-fallback
 * guarantees, no backdrop-filter and patchy dark-mode support, so the
 * space aesthetic is carried by solid colours: near-black canvas, a
 * bordered card, a starlight-lavender button. Georgia stands in for the
 * Marcellus wordmark.
 */

const palette = {
  sky: "#04050c",
  card: "#10121f",
  border: "#262a44",
  text: "#e6e9f5",
  muted: "#9ba0b8",
  accent: "#a7abff",
  buttonBg: "#e4e7ff",
  buttonText: "#0d0e1c",
};

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your sign-in link for Regmaglypt — valid for 10 minutes.</Preview>
      <Body
        style={{
          backgroundColor: palette.sky,
          margin: 0,
          padding: "40px 16px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        <Container
          style={{
            maxWidth: "440px",
            margin: "0 auto",
            backgroundColor: palette.card,
            border: `1px solid ${palette.border}`,
            borderRadius: "16px",
            padding: "36px 32px",
          }}
        >
          <Heading
            style={{
              margin: "0 0 4px",
              textAlign: "center" as const,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "26px",
              fontWeight: 400,
              letterSpacing: "0.04em",
              color: palette.text,
            }}
          >
            Regmaglypt
          </Heading>
          <Text
            style={{
              margin: "0 0 28px",
              textAlign: "center" as const,
              fontSize: "13px",
              color: palette.muted,
            }}
          >
            A shooting star&apos;s fingerprint
          </Text>

          <Text
            style={{
              margin: "0 0 24px",
              fontSize: "15px",
              lineHeight: "24px",
              color: palette.text,
              textAlign: "center" as const,
            }}
          >
            Here&apos;s your sign-in link. It stays valid for 10 minutes and
            works once.
          </Text>

          <Section style={{ textAlign: "center" as const, margin: "0 0 24px" }}>
            {/* Padding lives on the <a> itself so the whole pill is clickable. */}
            <Link
              href={url}
              style={{
                display: "inline-block",
                backgroundColor: palette.buttonBg,
                color: palette.buttonText,
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                borderRadius: "10px",
                padding: "13px 36px",
              }}
            >
              Sign in to Regmaglypt
            </Link>
          </Section>

          <Text
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              lineHeight: "18px",
              color: palette.muted,
              textAlign: "center" as const,
            }}
          >
            Button not working? Paste this link into your browser:
          </Text>
          <Text
            style={{
              margin: "0 0 24px",
              fontSize: "12px",
              lineHeight: "18px",
              textAlign: "center" as const,
              wordBreak: "break-all" as const,
            }}
          >
            <Link href={url} style={{ color: palette.accent, textDecoration: "underline" }}>
              {url}
            </Link>
          </Text>

          <Hr style={{ borderColor: palette.border, margin: "0 0 16px" }} />

          <Text
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: "18px",
              color: palette.muted,
              textAlign: "center" as const,
            }}
          >
            You&apos;re receiving this because someone entered this address on
            regmaglypt.com. If it wasn&apos;t you, ignore this email — nothing
            happens without the link.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;
