const http = require("http");

const PORT = process.env.PORT || 3000;
const RELAY_SECRET = process.env.RELAY_SECRET;

// Only these two fixed upstream URLs can be reached through this relay -
// NOT a general-purpose open proxy, to avoid it being abused to hide
// arbitrary traffic behind this server's IP.
const TARGETS = {
  "/aligo/send": "https://apis.aligo.in/send/",
  "/aligo/alimtalk": "https://kakaoapi.aligo.in/akv10/alimtalk/send/",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

http
  .createServer(async (req, res) => {
    // Root path keeps the original outbound-IP diagnostic behavior.
    if (req.url === "/") {
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const data = await r.json();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ outboundIp: data.ip, checkedAt: new Date().toISOString() }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }

    const target = TARGETS[req.url];
    if (!target) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unknown route" }));
      return;
    }

    if (req.method !== "POST" || req.headers["authorization"] !== `Bearer ${RELAY_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    try {
      const body = await readBody(req);
      const upstream = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": req.headers["content-type"] || "application/x-www-form-urlencoded" },
        body,
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      });
      res.end(text);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    }
  })
  .listen(PORT, () => console.log(`listening on ${PORT}`));
