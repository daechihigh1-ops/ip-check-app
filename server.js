const http = require("http");

const PORT = process.env.PORT || 3000;

http
  .createServer(async (req, res) => {
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      const data = await r.json();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ outboundIp: data.ip, checkedAt: new Date().toISOString() }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    }
  })
  .listen(PORT, () => console.log(`listening on ${PORT}`));
