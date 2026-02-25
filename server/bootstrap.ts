var http = require("http");
var port = +(process.env.PORT || 5000);
var preloadPid = parseInt(process.env.PRELOAD_PID || "0", 10);

var srv = http.createServer(function(req: any, res: any) {
  if ((srv as any)._app) return (srv as any)._app(req, res);
  res.writeHead(200);
  res.end("OK");
});

new Function("p", "return import(p)")(__dirname + "/app.cjs").then(async function(mod: any) {
  await mod.initialize(srv);
  (srv as any)._app = mod.expressApp;

  if (preloadPid > 0) {
    try { process.kill(preloadPid, "SIGTERM"); } catch(e) {}
    await new Promise(function(r: any) { setTimeout(r, 100); });
  }

  srv.listen(port, "0.0.0.0", function() {
    console.log("[bootstrap] Ready on port " + port);
  });
}).catch(function(e: any) { console.error(e); process.exit(1); });
