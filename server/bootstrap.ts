var http = require("http");
var port = +(process.env.PORT || 5000);
var preloadPid = parseInt(process.env.PRELOAD_PID || "0", 10);

var srv = http.createServer(function(req: any, res: any) {
  if ((srv as any)._app) return (srv as any)._app(req, res);
  res.writeHead(200);
  res.end("OK");
});

function listen() {
  srv.listen(port, "0.0.0.0", function() {
    console.log("[bootstrap] Ready on port " + port);
  });
  srv.on("error", function(e: any) {
    if (e.code === "EADDRINUSE") {
      srv.removeAllListeners("error");
      if (preloadPid > 0) {
        try { process.kill(preloadPid, "SIGTERM"); } catch(ex) {}
      }
      setTimeout(listen, 250);
    }
  });
}

new Function("p", "return import(p)")(__dirname + "/app.cjs").then(async function(mod: any) {
  await mod.initialize(srv);
  (srv as any)._app = mod.expressApp;
  console.log("[bootstrap] App initialized, taking over port");

  if (preloadPid > 0) {
    try { process.kill(preloadPid, "SIGTERM"); } catch(e) {}
  }
  setTimeout(listen, 300);
}).catch(function(e: any) { console.error(e); process.exit(1); });
