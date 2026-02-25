const http = require("http");
const path = require("path");

const port = parseInt(process.env.PORT || "5000", 10);
let expressApp: any = null;

const server = http.createServer((req: any, res: any) => {
  if (expressApp) {
    return expressApp(req, res);
  }

  console.log(`[bootstrap] Healthcheck request: ${req.method} ${req.url} - responding 200`);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[bootstrap] Listening on port ${port}`);

  const appPath = path.join(__dirname, "app.cjs");
  const loadApp = new Function("p", "return import(p)");
  loadApp(appPath).then((mod: any) => {
    expressApp = mod.expressApp;
    mod.initialize(server);
    console.log(`[bootstrap] Express app loaded and initialized`);
  }).catch((err: any) => {
    console.error("[bootstrap] Failed to load application:", err);
    process.exit(1);
  });
});
