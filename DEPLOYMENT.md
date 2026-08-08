# Deployment

`localhost:3100` only works on your own computer. To let outside users open the system, deploy the Node server to a public host and set environment variables there.

## Required production environment

```env
HOST=0.0.0.0
PORT=3000
PUBLIC_BASE_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

IMAGE_PROVIDER=openai
OPENAI_API_KEY=your_server_side_key
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_MODERATION=auto
OPENAI_IMAGE_OUTPUT_FORMAT=png
MOCK_GENERATION=false
```

Do not put `OPENAI_API_KEY` in browser code.

## Render

1. Push this project to GitHub.
2. Create a Render Web Service from the repository.
3. Use `render.yaml` or set:
   - Build command: empty
   - Start command: `node server.js`
   - Health check path: `/api/health`
4. Add `OPENAI_API_KEY` in Render environment variables.
5. Add your Render domain to `ALLOWED_ORIGINS`.

## Docker

```bash
docker build -t mbti-persona-image-system .
docker run -p 3000:3000 --env-file .env mbti-persona-image-system
```

## Local network note

The server binds to `0.0.0.0`, so other devices on the same LAN can open it with:

```text
http://YOUR_LOCAL_IP:3100
```

For the public internet, use a real host such as Render, Fly.io, Railway, Cloudflare, or Vercel.
