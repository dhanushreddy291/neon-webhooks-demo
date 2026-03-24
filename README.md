<picture>
	<source media="(prefers-color-scheme: dark)" srcset="https://neon.com/brand/neon-logo-dark-color.svg">
	<source media="(prefers-color-scheme: light)" srcset="https://neon.com/brand/neon-logo-light-color.svg">
	<img width="250px" alt="Neon Logo fallback" src="https://neon.com/brand/neon-logo-dark-color.svg">
</picture>

### Customizing Neon Auth with Webhooks (Next.js)

A Next.js demo app that shows how to intercept Neon Auth events with webhooks, verify signatures, send custom OTP/magic link emails with Resend, and block signups from disposable domains.

Follow the guide on [Neon: Customizing Neon Auth with Webhooks](https://neon.com/guides/neon-auth-webhooks-nextjs) for step-by-step walkthrough.

---

Neon Auth ships with secure defaults for authentication and delivery. This project demonstrates how to take control of that flow when you need custom delivery channels, branding, or validation logic.

It includes:

- Event handling for `send.otp`, `send.magic_link`, `user.before_create`, and `user.created`
- Ed25519 webhook signature verification using detached JWS + JWKS
- Custom email delivery through Resend
- Blocking logic for disposable email domains
- A minimal Next.js UI using Neon Auth prebuilt components

## Key Features

- **Next.js App Router** app with Neon Auth integration
- **Secure webhook verification** (signature + freshness check)
- **Custom delivery handlers** for OTP and magic links
- **Blocking event support** using `user.before_create`
- **Easy local testing** with ngrok + Neon API webhook registration

## Prerequisites

Before you start, make sure you have:

1. A [Neon account](https://console.neon.tech/signup)
2. [Node.js](https://nodejs.org/) 18+
3. A [Resend account](https://resend.com/docs/dashboard/api-keys/introduction)
4. [ngrok](https://ngrok.com/docs/getting-started/) (or any HTTPS tunnel)

## Get Started

### 1) Clone and install

```bash
git clone https://github.com/dhanushreddy291/neon-webhooks-demo.git
cd neon-webhooks-demo
npm install
```

### 2) Configure Neon project

1. Create a Neon project in the [Neon Console](https://console.neon.tech)
2. Enable **Neon Auth** in your project
3. Collect these values:
	 - `NEON_AUTH_BASE_URL`
	 - `NEON_API_KEY`
	 - `NEON_PROJECT_ID`
	 - `NEON_BRANCH_ID`

### 3) Configure environment variables

Create a `.env.local` file in the project root and add:

```env
# Neon Auth
NEON_AUTH_BASE_URL="https://ep-xxx.neon.tech/neondb/auth"
NEON_AUTH_COOKIE_SECRET="your-secure-random-secret"
NEON_API_KEY="your-neon-api-key"
NEON_PROJECT_ID="your-project-id"
NEON_BRANCH_ID="your-branch-id"

# Email provider (Resend)
RESEND_API_KEY="re_xxxxxxxxx"
EMAIL_FROM="onboarding@resend.dev"
```

Generate a secure cookie secret (recommended):

```bash
openssl rand -base64 32
```

### 4) Run the app

```bash
npm run dev
```

This app runs on **http://localhost:3000**.

### 5) Expose local webhook endpoint

In a second terminal:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL from ngrok.

### 6) Register webhook with Neon Auth

```bash
curl -X PUT "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$NEON_BRANCH_ID/auth/webhooks" \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer $NEON_API_KEY" \
	-d '{
		"enabled": true,
		"webhook_url": "https://YOUR-NGROK-SUBDOMAIN.ngrok.app/api/webhooks/neon",
		"enabled_events": ["send.otp", "send.magic_link", "user.before_create", "user.created"]
	}'
```

If successful, Neon returns your updated webhook config.

## Test the Flow

1. Open **http://localhost:3000**
2. Try signing up with `testuser@spam.com` (should be blocked)
3. Sign up with a valid email (custom OTP flow)
4. Use forgot password / email link flow (custom magic link email)

## How It Works

### 1) Neon Auth setup

- Server auth client is configured in `lib/auth/server.ts`
- Browser auth client is configured in `lib/auth/client.ts`
- Auth routes are proxied in `app/api/auth/[...path]/route.ts`
- Auth UI is mounted through `NeonAuthUIProvider` in `app/layout.tsx`

### 2) Webhook signature verification

The helper in `lib/neon-webhook.ts` does the following:

1. Reads Neon webhook headers (`x-neon-signature`, `x-neon-signature-kid`, `x-neon-timestamp`)
2. Fetches JWKS from your Neon Auth base URL
3. Locates key by `kid` and imports Ed25519 public key
4. Reconstructs signing input for detached JWS verification
5. Verifies signature
6. Enforces timestamp freshness window (5 minutes)

### 3) Event handling

`app/api/webhooks/neon/route.ts` routes events:

- `send.otp` -> sends custom OTP email via Resend
- `send.magic_link` -> sends custom sign-in/reset email via Resend
- `user.before_create` -> allows or blocks signup by email domain
- `user.created` -> logs successful user creation

For blocking events, the route returns JSON like:

```json
{
	"allowed": false,
	"error_message": "Signups from this domain are not allowed. Please use a work email.",
	"error_code": "DOMAIN_BLOCKED"
}
```

## Optional: Send OTP via SMS (Twilio)

Install Twilio:

```bash
npm install twilio
```

Then adapt `handleSendOtp` in the webhook route to call Twilio instead of Resend when desired.

## Deploying to Production

1. Deploy to your host (Vercel/Netlify/AWS/etc.)
2. Add all env vars in your hosting dashboard
3. Re-run webhook registration with your production URL:

```text
https://your-domain.com/api/webhooks/neon
```

Important: `user.before_create` is a **blocking** event. If your webhook endpoint is down or times out, signups can fail (fail-closed behavior). Keep handlers fast and reliable.

## Scripts

```bash
npm run dev    # Next.js dev server on port 3000
npm run build  # Production build
npm run start  # Start production server
```

## Learn More

- [Customizing Neon Auth with Webhooks](https://neon.com/guides/neon-auth-webhooks-nextjs)
- [Neon Auth Webhooks Reference](https://neon.com/docs/auth/guides/webhooks)
- [Neon Auth Overview](https://neon.com/docs/auth/overview)
- [Neon Auth UI Components](https://neon.com/docs/auth/reference/ui-components)
- [Resend Documentation](https://resend.com/docs)