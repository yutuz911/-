const DESIGNER_CREDIT = "设计人：王星";

const form = document.querySelector("#generator-form");
const mbtiSelect = document.querySelector("#mbti");
const photoInput = document.querySelector("#photo");
const inputPreview = document.querySelector("#input-preview");
const previewStage = document.querySelector(".preview-stage");
const resultImage = document.querySelector("#result-image");
const emptyState = document.querySelector("#empty-state");
const statusText = document.querySelector("#status");
const generateButton = document.querySelector("#generate");
const promptPreview = document.querySelector("#prompt-preview");
const checkoutButton = document.querySelector("#checkout");
const turnstileSlot = document.querySelector("#turnstile-slot");
const posterCanvas = document.querySelector("#poster-canvas");
const downloadPosterButton = document.querySelector("#download-poster");
const downloadImageButton = document.querySelector("#download-image");
const promptOutput = document.querySelector("#prompt-output");

let personas = {};
let integrations = {};

init();

async function init() {
  setStatus("正在加载 MBTI 设定...");
  const [personasResponse, integrationsResponse] = await Promise.all([
    fetch("/api/personas"),
    fetch("/api/integrations")
  ]);
  const data = await personasResponse.json();
  integrations = await integrationsResponse.json();
  personas = data.personas || {};

  for (const type of Object.keys(personas)) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = `${type} - ${personas[type].title}`;
    mbtiSelect.appendChild(option);
  }

  mbtiSelect.value = "INTJ";
  setupTurnstile();
  setupCheckout();
  setStatus("");
}

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setStatus("图片不能超过 5 MB。", true);
    photoInput.value = "";
    return;
  }
  inputPreview.src = URL.createObjectURL(file);
  inputPreview.style.display = "block";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = photoInput.files?.[0];
  if (!file) {
    setStatus("请先上传一张照片。", true);
    return;
  }

  try {
    generateButton.disabled = true;
    setStatus("正在执行 image-to-image 生成，这可能需要几十秒...");
    const imageDataUrl = await prepareImageDataUrl(file);
    const body = {
      imageDataUrl,
      mbti: mbtiSelect.value,
      style: new FormData(form).get("style"),
      aspectRatio: document.querySelector("#aspect-ratio").value,
      designerName: DESIGNER_CREDIT,
      consent: document.querySelector("#consent").checked,
      turnstileToken: getTurnstileToken()
    };

    const response = await fetch("/api/image2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "生成失败");
    }

    resultImage.src = data.imageDataUrl;
    await renderPoster(data.imageDataUrl);
    resultImage.style.display = "block";
    posterCanvas.style.display = "block";
    previewStage.classList.add("has-results");
    downloadPosterButton.hidden = false;
    downloadImageButton.hidden = false;
    promptOutput.hidden = false;
    emptyState.style.display = "none";
    promptPreview.textContent = data.prompt || "";

    if (data.fallback) {
      setStatus(`OpenAI 暂时无法出图：${data.warning || "额度或权限受限"}。已生成可下载封面预览，补充 API 额度后会自动输出 AI 风格图。`);
    } else {
      setStatus(data.mock ? "已生成本地模拟图。配置 gpt-image-2 后可生成真实图片。" : "Image2 生成完成。");
    }
  } catch (error) {
    setStatus(error.message, true);
    resetTurnstile();
  } finally {
    generateButton.disabled = false;
  }
});

function setupTurnstile() {
  if (!integrations.turnstileSiteKey) return;
  turnstileSlot.className = "turnstile-box";
  const widget = document.createElement("div");
  widget.className = "cf-turnstile";
  widget.dataset.sitekey = integrations.turnstileSiteKey;
  turnstileSlot.appendChild(widget);

  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function setupCheckout() {
  checkoutButton.hidden = !integrations.stripe;
  checkoutButton.addEventListener("click", async () => {
    try {
      setStatus("正在创建 Stripe 支付会话...");
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/?checkout=success`,
          cancelUrl: `${window.location.origin}/?checkout=cancel`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "创建支付会话失败");
      window.location.href = data.url;
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

function getTurnstileToken() {
  if (!integrations.turnstile || !window.turnstile) return "";
  return window.turnstile.getResponse() || "";
}

function resetTurnstile() {
  if (integrations.turnstile && window.turnstile) {
    window.turnstile.reset();
  }
}

downloadPosterButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${mbtiSelect.value}-mbti-poster.png`;
  link.href = posterCanvas.toDataURL("image/png");
  link.click();
});

downloadImageButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${mbtiSelect.value}-generated-image.png`;
  link.href = resultImage.src;
  link.click();
});

async function renderPoster(imageDataUrl) {
  const ctx = posterCanvas.getContext("2d");
  const width = posterCanvas.width;
  const height = posterCanvas.height;
  const img = await loadImage(imageDataUrl);
  const type = mbtiSelect.value;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#151b3e");
  gradient.addColorStop(0.42, "#080914");
  gradient.addColorStop(0.72, "#1b0730");
  gradient.addColorStop(1, "#071d24");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let x = 0; x < width; x += 54) ctx.fillRect(x, 0, 2, height);
  for (let y = 0; y < height; y += 54) ctx.fillRect(0, y, width, 2);

  drawGlow(ctx, width * 0.22, height * 0.16, 360, "rgba(255,59,212,0.36)");
  drawGlow(ctx, width * 0.78, height * 0.78, 420, "rgba(36,231,255,0.25)");

  ctx.font = "900 66px Arial";
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  ctx.strokeText("MBTI CARTOON", 72, 120);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 142px Arial";
  ctx.fillText(type, 72, 260);

  ctx.fillStyle = "#c8ff00";
  ctx.font = "900 42px Arial";
  ctx.fillText("IMAGE2 PERSONA POSTER", 78, 320);

  const imageBox = { x: 92, y: 374, w: 896, h: 728 };
  roundRect(ctx, imageBox.x - 20, imageBox.y - 20, imageBox.w + 40, imageBox.h + 40, 38);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();
  ctx.shadowColor = "rgba(255,59,212,0.65)";
  ctx.shadowBlur = 28;
  drawImageCover(ctx, img, imageBox.x, imageBox.y, imageBox.w, imageBox.h, 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundRect(ctx, 72, height - 150, 360, 72, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 30px Arial";
  ctx.fillText("Y2K MBTI AVATAR", 104, height - 104);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(DESIGNER_CREDIT, width - 70, height - 70);
  ctx.textAlign = "left";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("主图合成失败"));
    image.src = src;
  });
}

function drawImageCover(ctx, img, x, y, w, h, radius) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawGlow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

async function prepareImageDataUrl(file) {
  const source = await readAsDataUrl(file);
  const image = await loadImage(source);
  const maxSide = 1536;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}
