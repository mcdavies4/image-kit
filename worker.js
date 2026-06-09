/**
 * RightImageKit — AI proxy (Cloudflare Worker)
 * --------------------------------------------------
 * Keeps your Anthropic API key server-side and gates every
 * AI call behind a valid Lemon Squeezy license (or the dev code).
 *
 * Deploy:
 *   npm i -g wrangler           # if not installed
 *   wrangler secret put ANTHROPIC_API_KEY    # paste a FRESH key
 *   wrangler deploy
 *
 * The key lives only as a Worker secret — never in any file or the browser.
 */

const DEV_CODE = "rik2026";                 // remove before public launch
const MODEL = "claude-haiku-4-5-20251001";  // cheap + vision; swap to claude-sonnet-4-6 for richer output

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,           // lock to "https://rightimagekit.com" for production
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-License-Key",
      "Access-Control-Max-Age": "86400",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    try {
      // 1) Validate a license key (called from the unlock modal)
      if (url.pathname === "/license" && request.method === "POST") {
        const { license_key } = await request.json();
        return json({ valid: await isValid(license_key) }, cors);
      }

      // 2) Generate alt text / caption / keywords from an image
      if (url.pathname === "/alt-text" && request.method === "POST") {
        const key = request.headers.get("X-License-Key") || "";
        if (!(await isValid(key))) return json({ error: "Pro license required" }, cors, 402);

        const { image, media_type } = await request.json();
        if (!image) return json({ error: "No image supplied" }, cors, 400);

        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 400,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: media_type || "image/jpeg", data: image } },
                { type: "text", text:
                  'Look at this image and respond with ONLY a JSON object, no markdown, no preamble:\n' +
                  '{"alt":"concise accessible alt text under 125 characters","caption":"one engaging social caption","keywords":["3-6","seo","keywords"]}' }
              ]
            }]
          })
        });

        if (!r.ok) {
          const detail = await r.text();
          return json({ error: "Anthropic API error", detail }, cors, 502);
        }
        const data = await r.json();
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        return json({ result: text }, cors);
      }

      return json({ error: "Not found" }, cors, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, cors, 500);
    }
  }
};

/* Validate a Lemon Squeezy license key (or the dev code). */
async function isValid(key) {
  if (!key) return false;
  if (key === DEV_CODE) return true;
  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key })
    });
    const d = await res.json();
    return !!(d && d.valid);
  } catch { return false; }
}

function json(obj, cors, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" }
  });
}
