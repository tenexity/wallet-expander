var port = +(process.env.PORT || 5000);
var app: any = null;
var srv = require("http").createServer(function(req: any, res: any) {
  if (app) return app(req, res);
  res.writeHead(200);
  res.end("OK");
});
srv.listen(port, "0.0.0.0", function() {
  console.log("[bootstrap] Listening on port " + port);
  new Function("p", "return import(p)")(__dirname + "/app.cjs").then(async function(mod: any) {
    await mod.initialize(srv);
    app = mod.expressApp;
    console.log("[bootstrap] Ready");
  }).catch(function(e: any) { console.error(e); process.exit(1); });
});
