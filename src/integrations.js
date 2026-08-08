const crypto = require("node:crypto");

function getIntegrationStatus() {
  return {
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseStorage: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    posthog: Boolean(process.env.POSTHOG_API_KEY),
    sentry: Boolean(process.env.SENTRY_DSN),
    turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY),
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ""
  };
}

async function verifyTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return { enabled: false, ok: true };
  }
  if (!token) {
    return { enabled: true, ok: false, error: "Turnstile verification is required." };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token
  });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await response.json().catch(() => ({}));
  return {
    enabled: true,
    ok: json.success === true,
    error: json["error-codes"]?.join(", ") || "Turnstile verification failed."
  };
}

async function createGenerationJob(job) {
  if (!getIntegrationStatus().supabase) return null;

  const table = process.env.SUPABASE_GENERATION_TABLE || "generation_jobs";
  const row = {
    id: job.id,
    mbti: job.mbti,
    style: job.style,
    aspect_ratio: job.aspectRatio,
    provider: job.provider,
    model: job.model,
    status: job.status || "started",
    audit_status: job.auditStatus,
    prompt_sha256: sha256(job.prompt),
    created_at: new Date().toISOString()
  };
  if (process.env.STORE_PROMPTS === "true") {
    row.prompt = job.prompt;
  }

  return supabaseRequest(`/rest/v1/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row)
  });
}

async function updateGenerationJob(id, patch) {
  if (!getIntegrationStatus().supabase || !id) return null;

  const table = process.env.SUPABASE_GENERATION_TABLE || "generation_jobs";
  const row = {
    ...patch,
    updated_at: new Date().toISOString()
  };
  return supabaseRequest(`/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row)
  });
}

async function persistGeneratedImage({ id, imageDataUrl }) {
  if (!getIntegrationStatus().supabaseStorage || !imageDataUrl?.startsWith("data:image/")) {
    return null;
  }

  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(imageDataUrl);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const objectPath = `generations/${id}.${ext}`;
  const url = `${trimSlash(process.env.SUPABASE_URL)}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": mime,
      "x-upsert": "true"
    },
    body: Buffer.from(match[2], "base64")
  });

  if (!response.ok) {
    throw new Error(`Supabase storage upload failed with ${response.status}`);
  }

  if (process.env.SUPABASE_STORAGE_PUBLIC === "true") {
    return `${trimSlash(process.env.SUPABASE_URL)}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
  }
  return objectPath;
}

async function createStripeCheckoutSession({ successUrl, cancelUrl }) {
  if (!getIntegrationStatus().stripe) {
    const error = new Error("Stripe is not configured.");
    error.status = 503;
    throw error;
  }

  const body = new URLSearchParams({
    mode: "payment",
    success_url: successUrl || process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/?checkout=success",
    cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL || "http://localhost:3000/?checkout=cancel",
    "line_items[0][price]": process.env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    "metadata[product]": "mbti_persona_image"
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.error?.message || `Stripe checkout failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return { id: json.id, url: json.url };
}

async function captureEvent(event, properties = {}) {
  if (!process.env.POSTHOG_API_KEY) return;

  const host = trimSlash(process.env.POSTHOG_HOST || "https://app.posthog.com");
  await fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.POSTHOG_API_KEY,
      event,
      properties: {
        distinct_id: properties.distinctId || "anonymous",
        ...properties
      }
    })
  }).catch(() => {});
}

async function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN) return;

  const dsn = parseSentryDsn(process.env.SENTRY_DSN);
  if (!dsn) return;

  const eventId = crypto.randomBytes(16).toString("hex");
  const now = new Date().toISOString();
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: now, dsn: process.env.SENTRY_DSN }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({
      event_id: eventId,
      timestamp: now,
      level: "error",
      platform: "node",
      message: error?.message || String(error),
      exception: {
        values: [
          {
            type: error?.name || "Error",
            value: error?.message || String(error)
          }
        ]
      },
      extra: scrub(context)
    })
  ].join("\n");

  await fetch(`${dsn.baseUrl}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}&sentry_version=7`, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: envelope
  }).catch(() => {});
}

async function supabaseRequest(path, options) {
  const response = await fetch(`${trimSlash(process.env.SUPABASE_URL)}${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

function parseSentryDsn(dsn) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace("/", "");
    return {
      publicKey: url.username,
      projectId,
      baseUrl: `${url.protocol}//${url.host}`
    };
  } catch {
    return null;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function scrub(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (/key|token|secret|image|base64|authorization/i.test(key)) return "[redacted]";
    return item;
  }));
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

module.exports = {
  getIntegrationStatus,
  verifyTurnstile,
  createGenerationJob,
  updateGenerationJob,
  persistGeneratedImage,
  createStripeCheckoutSession,
  captureEvent,
  captureException
};
