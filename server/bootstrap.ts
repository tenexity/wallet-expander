var http = require("http");
var port = +(process.env.PORT || 5000);
var app: any = null;

var srv = http.createServer(function(req: any, res: any) {
  if (app) return app(req, res);
  if (req.url === "/health") {
    res.writeHead(200, {"Content-Type": "application/json"});
    return res.end('{"status":"OK","starting":true}');
  }
  res.writeHead(200, {"Content-Type": "text/html"});
  res.end("<!DOCTYPE html><html><head><meta http-equiv='refresh' content='3'></head><body><p>Starting up...</p></body></html>");
});

srv.listen(port, "0.0.0.0", function() {
  console.log("[bootstrap] Listening on port " + port);
  new Function("p", "return import(p)")(__dirname + "/app.cjs").then(async function(mod: any) {
    await mod.initialize(srv);
    app = mod.expressApp;
    console.log("[bootstrap] Ready");
  }).catch(function(e: any) { console.error(e); process.exit(1); });
});
