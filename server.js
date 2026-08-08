const http = require("node:http");
const https = require("node:https");
const tls = require("node:tls");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dns = require("node:dns");
const { spawn } = require("node:child_process");
const { MBTI_PERSONAS, normalizeMbti, buildImagePrompt } = require("./src/mbti-personas");
const { auditPrompt, assertPromptApproved } = require("./src/prompt-audit");
const {
  getIntegrationStatus,
  verifyTurnstile,
  createGenerationJob,
  updateGenerationJob,
  persistGeneratedImage,
  createStripeCheckoutSession,
  captureEvent,
  captureException
} = require("./src/integrations");

loadEnv();
dns.setDefaultResultOrder("ipv4first");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 8);
const ALLOWED_ORIGINS = new Set(
  String(process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const limiter = new Map();

async function appHandler(req, res) {
  try {
    applySecurityHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/api/personas") {
      sendJson(res, 200, { personas: MBTI_PERSONAS });
      return;
    }

    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, getHealth());
      return;
    }

    if (req.method === "GET" && req.url === "/api/integrations") {
      sendJson(res, 200, getPublicIntegrations());
      return;
    }

    if (req.method === "POST" && req.url === "/api/prompt-audit") {
      await handlePromptAudit(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/checkout") {
      await handleCheckout(req, res);
      return;
    }

    if (req.method === "POST" && (req.url === "/api/generate" || req.url === "/api/image2")) {
      await handleGenerate(req, res);
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const status = Number(error.status || 500);
    if (status >= 500) {
      console.error(redactError(error));
      writeServerLog(error, { route: req.url, method: req.method, status });
      await captureException(error, { route: req.url, method: req.method });
    }
    sendJson(res, status, { error: publicErrorMessage(error) });
  }
}

const server = http.createServer(appHandler);

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`MBTI image2image system running at http://${HOST}:${PORT}`);
  });
}

async function handleGenerate(req, res) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    sendJson(res, 429, { error: "Too many requests. Please wait before generating again." });
    return;
  }

  const payload = await readJsonBody(req);
  const turnstile = await verifyTurnstile(payload.turnstileToken, ip);
  if (!turnstile.ok) {
    sendJson(res, 403, { error: "人机校验失败，请刷新后重试。" });
    return;
  }

  const mbti = normalizeMbti(payload.mbti);
  if (!mbti) {
    sendJson(res, 400, { error: "Please choose a valid MBTI type." });
    return;
  }
  if (payload.consent !== true) {
    sendJson(res, 400, { error: "Generation requires consent from the person in the uploaded photo." });
    return;
  }

  const image = parseDataUrl(payload.imageDataUrl);
  validateImage(image);

  const style = allowList(payload.style, ["lowpoly", "storybook", "anime", "editorial", "sticker"], "lowpoly");
  const aspectRatio = allowList(payload.aspectRatio, ["1:1", "2:3", "3:2"], "1:1");
  const designerName = String(payload.designerName || "设计人：王星");
  const prompt = buildImagePrompt({ mbti, style, aspectRatio, designerName });
  const audit = assertPromptApproved(prompt);
  const provider = allowList(process.env.IMAGE_PROVIDER || "openai", ["openai"], "openai");
  const generationId = crypto.randomUUID();
  const model = getImageConfig().model;

  await bestEffort("createGenerationJob", () => createGenerationJob({
    id: generationId,
    mbti,
    style,
    aspectRatio,
    provider,
    model,
    prompt,
    auditStatus: audit.status,
    status: "started"
  }));

  if (process.env.MOCK_GENERATION === "true") {
    const imageDataUrl = makeMockSvg({ mbti, style });
    const storedImageUrl = await bestEffort("persistGeneratedImage", () => persistGeneratedImage({ id: generationId, imageDataUrl }));
    await bestEffort("updateGenerationJob", () => updateGenerationJob(generationId, {
      status: "completed",
      stored_image_url: storedImageUrl
    }));
    await bestEffort("captureEvent", () => captureEvent("image2_generated", { mbti, style, aspectRatio, model, mock: true }));
    sendJson(res, 200, {
      id: generationId,
      mock: true,
      provider,
      model,
      prompt,
      audit,
      imageDataUrl,
      storedImageUrl
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 503, {
      error: "OPENAI_API_KEY is not configured.",
      prompt
    });
    return;
  }

  let result;
  try {
    result = await generateImage2Image({
      provider,
      prompt,
      imageBuffer: image.buffer,
      mime: image.mime,
      aspectRatio
    });
  } catch (error) {
    if (!canReturnPreviewFallback(error)) {
      throw error;
    }

    const imageDataUrl = makeUploadedImageDataUrl(image);
    const storedImageUrl = await bestEffort("persistGeneratedImage", () => persistGeneratedImage({ id: generationId, imageDataUrl }));
    await bestEffort("updateGenerationJob", () => updateGenerationJob(generationId, {
      status: "fallback",
      stored_image_url: storedImageUrl
    }));
    await bestEffort("captureEvent", () => captureEvent("image2_fallback", {
      mbti,
      style,
      aspectRatio,
      model,
      reason: publicErrorMessage(error)
    }));
    sendJson(res, 200, {
      id: generationId,
      provider,
      model,
      prompt,
      audit,
      imageDataUrl,
      storedImageUrl,
      fallback: true,
      warning: publicErrorMessage(error)
    });
    return;
  }
  const storedImageUrl = await bestEffort("persistGeneratedImage", () => persistGeneratedImage({ id: generationId, imageDataUrl: result.imageDataUrl }));

  await bestEffort("updateGenerationJob", () => updateGenerationJob(generationId, {
    status: "completed",
    stored_image_url: storedImageUrl
  }));
  await bestEffort("captureEvent", () => captureEvent("image2_generated", { mbti, style, aspectRatio, model, mock: false }));

  sendJson(res, 200, {
    id: generationId,
    provider,
    model,
    prompt,
    audit,
    imageDataUrl: result.imageDataUrl,
    storedImageUrl
  });
}

async function handlePromptAudit(req, res) {
  const payload = await readJsonBody(req);
  const mbti = normalizeMbti(payload.mbti);
  if (!mbti) {
    sendJson(res, 400, { error: "Please choose a valid MBTI type." });
    return;
  }

  const style = allowList(payload.style, ["lowpoly", "storybook", "anime", "editorial", "sticker"], "lowpoly");
  const aspectRatio = allowList(payload.aspectRatio, ["1:1", "2:3", "3:2"], "1:1");
  const designerName = String(payload.designerName || "设计人：王星");
  const prompt = buildImagePrompt({ mbti, style, aspectRatio, designerName });
  sendJson(res, 200, {
    mbti,
    style,
    aspectRatio,
    prompt,
    audit: auditPrompt(prompt)
  });
}

async function handleCheckout(req, res) {
  const payload = await readJsonBody(req);
  const session = await createStripeCheckoutSession({
    successUrl: payload.successUrl,
    cancelUrl: payload.cancelUrl
  });
  await bestEffort("captureEvent", () => captureEvent("checkout_created", { sessionId: session.id }));
  sendJson(res, 200, session);
}

async function generateImage2Image({ provider, prompt, imageBuffer, mime, aspectRatio }) {
  if (provider !== "openai") {
    throw new AppError(500, "Unsupported image provider.");
  }

  const ext = mime === "image/png" ? "png" : "jpg";
  const size = {
    "1:1": "1024x1024",
    "2:3": "1024x1536",
    "3:2": "1536x1024"
  }[aspectRatio];

  const multipart = buildMultipart([
    { name: "model", value: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2" },
    { name: "prompt", value: prompt },
    { name: "size", value: size },
    { name: "quality", value: allowList(process.env.OPENAI_IMAGE_QUALITY || "medium", ["low", "medium", "high", "auto"], "medium") },
    { name: "moderation", value: allowList(process.env.OPENAI_IMAGE_MODERATION || "auto", ["auto", "low"], "auto") },
    { name: "output_format", value: allowList(process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "png", ["png", "jpeg", "webp"], "png") },
    { name: "image[]", filename: `portrait.${ext}`, contentType: mime, value: imageBuffer }
  ]);

  let response;
  try {
    response = await requestOpenAI({
      path: "/v1/images/edits",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${multipart.boundary}`,
        "Content-Length": multipart.body.length
      },
      body: multipart.body
    });
  } catch (error) {
    response = await requestOpenAIWithPowerShell({
      prompt,
      imageBuffer,
      mime,
      filename: `portrait.${ext}`,
      size
    }).catch((fallbackError) => {
      throw new AppError(503, `OpenAI network request failed: ${error.message}; fallback failed: ${fallbackError.message}`, {
        publicMessage: "服务器连接 OpenAI 失败，请检查网络、代理或稍后重试。"
      });
    });
  }

  const json = parseJson(response.body);
  if (response.status < 200 || response.status >= 300) {
    throw mapOpenAIError(response, json);
  }

  const first = Array.isArray(json.data) ? json.data[0] : null;
  const outputFormat = allowList(process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "png", ["png", "jpeg", "webp"], "png");
  if (first?.b64_json) {
    return { imageDataUrl: `data:image/${outputFormat};base64,${first.b64_json}` };
  }
  if (first?.url) {
    return { imageDataUrl: first.url };
  }
  throw new AppError(502, "Image provider returned no image.");
}

function requestOpenAIWithPowerShell({ prompt, imageBuffer, mime, filename, size }) {
  if (process.platform !== "win32") {
    return Promise.reject(new Error("PowerShell fallback is only available on Windows."));
  }

  const scriptPath = path.join(ROOT, "scripts", "openai-image-edit.ps1");
  const payload = JSON.stringify({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    prompt,
    size,
    quality: allowList(process.env.OPENAI_IMAGE_QUALITY || "medium", ["low", "medium", "high", "auto"], "medium"),
    moderation: allowList(process.env.OPENAI_IMAGE_MODERATION || "auto", ["auto", "low"], "auto"),
    output_format: allowList(process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "png", ["png", "jpeg", "webp"], "png"),
    mime,
    filename,
    image_base64: imageBuffer.toString("base64")
  });

  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath
    ], {
      cwd: ROOT,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `PowerShell exited with ${code}`));
        return;
      }
      const parsed = parseJson(stdout);
      if (!parsed.status) {
        reject(new Error("PowerShell returned an invalid response."));
        return;
      }
      resolve(parsed);
    });
    child.stdin.end(payload);
  });
}

function buildMultipart(parts) {
  const boundary = `----mbti-${crypto.randomBytes(12).toString("hex")}`;
  const chunks = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    if (part.filename) {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`));
      chunks.push(Buffer.from(`Content-Type: ${part.contentType || "application/octet-stream"}\r\n\r\n`));
      chunks.push(Buffer.isBuffer(part.value) ? part.value : Buffer.from(String(part.value)));
      chunks.push(Buffer.from("\r\n"));
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(chunks) };
}

function requestOpenAI({ path: requestPath, headers, body }) {
  return new Promise(async (resolve, reject) => {
    const options = {
      hostname: "api.openai.com",
      port: 443,
      path: requestPath,
      method: "POST",
      headers,
      timeout: 120000
    };

    if (process.env.OPENAI_PROXY_URL) {
      try {
        const socket = await createProxyTlsSocket("api.openai.com", 443, process.env.OPENAI_PROXY_URL);
        options.agent = false;
        options.createConnection = () => socket;
      } catch (error) {
        reject(error);
        return;
      }
    }

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode || 0,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    req.on("timeout", () => req.destroy(new Error("OpenAI request timed out.")));
    req.on("error", reject);
    req.end(body);
  });
}

function createProxyTlsSocket(targetHost, targetPort, proxyValue) {
  return new Promise((resolve, reject) => {
    const proxy = new URL(proxyValue);
    const auth = proxy.username
      ? `Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString("base64")}`
      : null;
    const req = http.request({
      host: proxy.hostname,
      port: Number(proxy.port || 80),
      method: "CONNECT",
      path: `${targetHost}:${targetPort}`,
      headers: auth ? { "Proxy-Authorization": auth } : undefined,
      timeout: 20000
    });
    req.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed with ${res.statusCode}`));
        return;
      }
      const secureSocket = tls.connect({ socket, servername: targetHost }, () => resolve(secureSocket));
      secureSocket.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("Proxy CONNECT timed out.")));
    req.on("error", reject);
    req.end();
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function serveStatic(req, res) {
  const pathname = req.url.split("?")[0];
  const urlPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(content);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new AppError(413, "Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new AppError(400, "Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i.exec(String(dataUrl || ""));
  if (!match) {
    throw new AppError(400, "Invalid image data.");
  }
  return {
    mime: match[1].replace("image/jpg", "image/jpeg"),
    buffer: Buffer.from(match[2], "base64")
  };
}

function validateImage(image) {
  if (image.buffer.length < 32 || image.buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError(400, "Image must be between 32 bytes and 5 MB.");
  }
  const header = image.buffer.subarray(0, 12);
  const png = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const jpg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const webp = header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
  if (!png && !jpg && !webp) {
    throw new AppError(400, "Unsupported or mismatched image file.");
  }
}

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = limiter.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (bucket.resetAt < now) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  bucket.count += 1;
  limiter.set(ip, bucket);
  return bucket.count <= RATE_LIMIT_MAX;
}

function applySecurityHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  const turnstile = process.env.TURNSTILE_SITE_KEY
    ? " https://challenges.cloudflare.com"
    : "";
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; img-src 'self' data: blob: https:; style-src 'self'; script-src 'self'${turnstile}; frame-src 'self'${turnstile}; connect-src 'self'${turnstile}; base-uri 'self'; form-action 'self' https://checkout.stripe.com`
  );
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function getHealth() {
  return {
    status: "ok",
    image: getImageConfig(),
    integrations: getPublicIntegrations(),
    limits: {
      maxImageBytes: MAX_IMAGE_BYTES,
      maxBodyBytes: MAX_BODY_BYTES,
      rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
      rateLimitMax: RATE_LIMIT_MAX
    }
  };
}

function getPublicIntegrations() {
  const status = getIntegrationStatus();
  return {
    supabase: status.supabase,
    supabaseStorage: status.supabaseStorage,
    stripe: status.stripe,
    posthog: status.posthog,
    sentry: status.sentry,
    turnstile: status.turnstile,
    turnstileSiteKey: status.turnstileSiteKey
  };
}

function getImageConfig() {
  return {
    provider: allowList(process.env.IMAGE_PROVIDER || "openai", ["openai"], "openai"),
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    quality: allowList(process.env.OPENAI_IMAGE_QUALITY || "medium", ["low", "medium", "high", "auto"], "medium"),
    moderation: allowList(process.env.OPENAI_IMAGE_MODERATION || "auto", ["auto", "low"], "auto"),
    outputFormat: allowList(process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "png", ["png", "jpeg", "webp"], "png"),
    mock: process.env.MOCK_GENERATION === "true"
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  }[ext] || "application/octet-stream";
}

function allowList(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function redactError(error) {
  const message = error?.message || String(error);
  return message.replace(process.env.OPENAI_API_KEY || "not-set", "[redacted]");
}

function publicErrorMessage(error) {
  if (error?.publicMessage) return error.publicMessage;
  return Number(error?.status || 500) >= 500 ? "Server error" : (error?.message || "Request failed");
}

function canReturnPreviewFallback(error) {
  return [403, 429, 502, 503].includes(Number(error?.status));
}

function makeUploadedImageDataUrl(image) {
  return `data:${image.mime};base64,${image.buffer.toString("base64")}`;
}

async function bestEffort(name, fn) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`${name} failed: ${redactError(error)}`);
    await captureException(error, { integration: name });
    return null;
  }
}

function writeServerLog(error, context = {}) {
  try {
    const logDir = path.join(ROOT, "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(
      path.join(logDir, "server.log"),
      JSON.stringify({
        time: new Date().toISOString(),
        message: redactError(error),
        stack: redactError(error?.stack || ""),
        context
      }) + "\n",
      "utf8"
    );
  } catch {
    // Logging must never break the request path.
  }
}

function mapOpenAIError(response, json) {
  const code = json.error?.code;
  if (code === "moderation_blocked") {
    return new AppError(
      400,
      "This image request was blocked by safety checks. Please use a different photo or a more neutral style.",
      { publicMessage: "该图片请求未通过安全检查。请换一张照片，或选择更中性的风格后重试。" }
    );
  }
  if (response.status === 401) {
    return new AppError(401, "OpenAI API Key is invalid or missing.", {
      publicMessage: "OpenAI API Key 无效或未生效，请检查 .env 里的 OPENAI_API_KEY。"
    });
  }
  if (response.status === 429) {
    return new AppError(429, "The image provider is busy or rate limited. Please try again soon.", {
      publicMessage: "OpenAI 额度或频率受限，请检查账户余额、项目额度或稍后重试。"
    });
  }
  if (response.status === 403) {
    return new AppError(403, json.error?.message || "Image provider permission denied.", {
      publicMessage: "OpenAI 项目没有当前图片模型权限，或账户/组织验证未完成。"
    });
  }
  if (response.status >= 500) {
    return new AppError(502, "The image provider is temporarily unavailable.", {
      publicMessage: "OpenAI 图片服务暂时不可用，请稍后重试。"
    });
  }
  return new AppError(400, json.error?.message || "Image generation failed.", {
    publicMessage: `图片生成参数错误：${json.error?.message || "请检查模型、图片格式和提示词。"}`
  });
}

class AppError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.status = status;
    this.publicMessage = options.publicMessage;
  }
}

function loadEnv() {
  if (process.env.SKIP_DOTENV === "true") return;
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] = value;
  }
}

function makeMockSvg({ mbti, style }) {
  const persona = MBTI_PERSONAS[mbti];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f7f4ed"/>
  <circle cx="512" cy="380" r="210" fill="#263238"/>
  <circle cx="512" cy="390" r="150" fill="#f2c9a7"/>
  <path d="M278 780c54-174 414-174 468 0" fill="#2a7f86"/>
  <text x="512" y="842" text-anchor="middle" font-family="Arial" font-size="72" font-weight="700" fill="#111">${mbti}</text>
  <text x="512" y="910" text-anchor="middle" font-family="Arial" font-size="34" fill="#333">${escapeXml(persona.title)}</text>
  <text x="512" y="962" text-anchor="middle" font-family="Arial" font-size="24" fill="#555">Mock ${escapeXml(style)} preview</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  }[char]));
}

module.exports = {
  appHandler,
  server
};
