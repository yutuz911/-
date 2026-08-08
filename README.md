# MBTI Persona Portrait

一个开源的 MBTI 个性化 image-to-image 头像/封面生成系统。用户上传本人授权照片并选择 MBTI 类型，系统会根据原创 MBTI 气质设定生成 Image2 提示词，优先调用 OpenAI `gpt-image-2` 输出风格化图片，并同步生成一张潮流质感封面。

## 功能

- 上传本人授权照片，选择 16 种 MBTI 类型。
- 支持低多边形、绘本、动漫、杂志、贴纸等风格。
- 自动生成并展示经过审核的图片提示词。
- 生成结果包含 AI 风格图和封面图，封面右下角署名为 `设计人：王星`。
- OpenAI API 额度或网络受限时，返回可下载的封面预览，不让用户流程卡死。
- 默认不保存用户上传原图；可选接入 Supabase、Stripe、PostHog、Sentry、Cloudflare Turnstile。

## 安全原则

- 不抓取、不复刻网上已有 MBTI 卡通形象，避免版权和商标风险。
- 上传照片只用于本次生成请求，默认不落盘。
- 不把 `OPENAI_API_KEY` 放进浏览器代码或 GitHub 仓库。
- 提示词避免身份证件、裸露、血腥、仇恨、政治背书、未成年人敏感场景。
- 每次生成都要求确认照片中的人已同意被用于生成风格化头像。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
cp .env.example .env
npm start
```

打开：

```text
http://localhost:3000
```

本地不消耗 API 额度测试：

```bash
MOCK_GENERATION=true npm start
```

Windows PowerShell：

```powershell
$env:MOCK_GENERATION="true"; npm start
```

## Image2 配置

在 `.env` 中填写：

```env
IMAGE_PROVIDER=openai
OPENAI_API_KEY=your_server_side_api_key
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_MODERATION=auto
OPENAI_IMAGE_OUTPUT_FORMAT=png
MOCK_GENERATION=false
```

如果本机访问 OpenAI 需要代理：

```env
OPENAI_PROXY_URL=http://localhost:1080
```

ChatGPT 订阅额度和 OpenAI API 额度是分开的。这个公开网站需要使用 OpenAI API 项目的额度。

## 接口

- `GET /api/health`：服务和模型配置检查。
- `GET /api/integrations`：插件式集成状态。
- `GET /api/personas`：返回 16 种 MBTI 原创设定。
- `POST /api/prompt-audit`：生成并审核提示词。
- `POST /api/image2`：执行 image-to-image 图片生成。
- `POST /api/checkout`：创建 Stripe Checkout 会话。

## 交付检查

```bash
npm run check
npm run smoke
```

## 部署

`localhost:3100` 只适合本机访问。要让外界访问，需要部署到 Render、Railway、Fly.io、Cloudflare、Vercel 或其他 Node 托管平台，并在平台后台配置环境变量。详细步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 目录

```text
server.js               # 零依赖 Node 后端
src/mbti-personas.js    # 原创 MBTI 气质设定和提示词生成
src/prompt-audit.js     # 提示词安全审核
src/integrations.js     # Supabase/Stripe/PostHog/Sentry/Turnstile 接入
public/                 # 前端页面
scripts/                # smoke test 和 Windows OpenAI 请求辅助脚本
supabase/schema.sql     # Supabase 建表脚本
```

## License

MIT
