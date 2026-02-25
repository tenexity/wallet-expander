import http from "http";

const port = parseInt(process.env.PORT || "5000", 10);
let app: any = null;

const server = http.createServer((req, res) => {
  if (app) {
    return app(req, res);
  }

  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Loading...</title><meta http-equiv='refresh' content='3'></head><body><p>Starting up, please wait...</p></body></html>"
    );
    return;
  }

  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Application is starting up" }));
});

server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
  console.log(`Bootstrap server listening on port ${port}`);

  import("./app").then((mod) => {
    app = mod.expressApp;
    mod.initialize(server);
  });
});
