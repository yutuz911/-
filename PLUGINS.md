# Plugin Integrations

This project is wired for production services through environment variables. Every integration is optional; blank values keep local development working.

## OpenAI Image2

Required for real generation:

```env
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2
```

Endpoint used by the server:

- `POST https://api.openai.com/v1/images/edits`
- Uploaded user photo is sent as `image[]`.

## Supabase

Used for generation job records and optional generated image storage.

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_GENERATION_TABLE=generation_jobs
SUPABASE_STORAGE_BUCKET=mbti-generations
SUPABASE_STORAGE_PUBLIC=false
STORE_PROMPTS=false
```

Run [supabase/schema.sql](supabase/schema.sql) in Supabase SQL Editor.

## Stripe

Used for a hosted Checkout payment button.

```env
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_SUCCESS_URL=https://yourdomain.com/?checkout=success
STRIPE_CANCEL_URL=https://yourdomain.com/?checkout=cancel
```

The frontend automatically shows the payment button when Stripe is configured.

## PostHog

Used for product events such as `image2_generated` and `checkout_created`.

```env
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com
```

The implementation avoids sending uploaded images or raw base64 payloads.

## Sentry

Used for server-side error reporting.

```env
SENTRY_DSN=
```

The server redacts keys, tokens, images, and base64-like fields from context before sending.

## Cloudflare Turnstile

Used for bot protection before image generation.

```env
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

When configured, the frontend automatically renders Turnstile and the backend verifies the token before generation.

## Recommended Codex plugins to install

For direct account-level operations inside Codex, install these when you are ready:

- GitHub: publish the open-source repository and manage PRs.
- Supabase: create/manage database and storage.
- Stripe: manage products, prices, and payments.
- Cloudflare: DNS, Turnstile, and edge deployment.
- Sentry: production error triage.
- PostHog: analytics dashboards.
- Vercel: web deployment if you choose Vercel instead of Cloudflare.
