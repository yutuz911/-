# Security Policy

## Production checklist

- Run only behind HTTPS.
- Keep `OPENAI_API_KEY` server-side. Never expose it to browser code.
- Set `ALLOWED_ORIGINS` to the exact production domains.
- Replace in-memory rate limiting with Redis or another shared store before horizontal scaling.
- Do not log uploaded image data, base64 payloads, raw IP addresses, or full prompts.
- Keep uploaded photos in request memory only unless the user explicitly saves a result.
- Add account-level quotas before public launch.
- Add abuse reporting and deletion workflows for generated assets.
- Add stronger flows for minors: guardian consent, non-photoreal output only, and conservative moderation.
- Add object storage lifecycle rules if generated images are persisted.

## Content rules

This project is designed for fictional, stylized portraits. It should reject or avoid:

- Non-consensual images.
- Sexualized, nude, violent, hateful, or harassing output.
- Political endorsement or impersonation.
- Identity documents, certificates, badges, uniforms, or official-looking records.
- Requests to copy copyrighted mascots, anime characters, brand characters, logos, or watermarks.

## Current MVP safeguards

- File type and magic-byte validation.
- 5 MB upload cap and 8 MB request cap.
- Consent checkbox required for every generation.
- CORS allowlist.
- Security headers and restrictive CSP.
- Per-IP in-memory throttle.
- Provider errors mapped to safer user-facing messages.
