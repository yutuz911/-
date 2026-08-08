const { spawn } = require("node:child_process");

const PORT = process.env.SMOKE_PORT || "3199";
const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${PORT}`;
const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

async function main() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT,
      SKIP_DOTENV: "true",
      MOCK_GENERATION: "true",
      ALLOWED_ORIGINS: BASE_URL
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(BASE_URL);
    const health = await getJson(`${BASE_URL}/api/health`);
    const personas = await getJson(`${BASE_URL}/api/personas`);
    const audit = await postJson(`${BASE_URL}/api/prompt-audit`, {
      mbti: "ENFP",
      style: "storybook",
      aspectRatio: "1:1"
    });
    const generated = await postJson(`${BASE_URL}/api/image2`, {
      imageDataUrl: SAMPLE_PNG,
      mbti: "ENFP",
      style: "storybook",
      aspectRatio: "1:1",
      consent: true
    });

    console.log(JSON.stringify({
      ok: true,
      health: health.status,
      model: health.image.model,
      personas: Object.keys(personas.personas || {}).length,
      promptAudit: audit.audit.status,
      generated: Boolean(generated.imageDataUrl)
    }, null, 2));
  } finally {
    child.kill();
  }
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      await getJson(`${baseUrl}/api/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Smoke test server did not start in time.");
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${json.error}`);
  return json;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
