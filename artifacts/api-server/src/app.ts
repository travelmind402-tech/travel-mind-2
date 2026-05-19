import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "http";
import https from "https";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const backendUrl = new URL(process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000");

function proxyToPython(req: Request, res: Response) {
  const backendPath = req.originalUrl.replace(/^\/api/, "");
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0;
  const body = hasBody ? JSON.stringify(req.body) : undefined;

  const headers: http.OutgoingHttpHeaders = { "Content-Type": "application/json" };
  if (body !== undefined) headers["Content-Length"] = Buffer.byteLength(body);

  const isHttps = backendUrl.protocol === "https:";
  const options: http.RequestOptions = {
    hostname: backendUrl.hostname,
    port: backendUrl.port ? Number(backendUrl.port) : isHttps ? 443 : 8000,
    path: backendPath,
    method: req.method,
    headers,
  };

  const transport = isHttps ? https : http;
  const proxyReq = transport.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode ?? 500);
    Object.entries(proxyRes.headers).forEach(([k, v]) => {
      if (v !== undefined) res.setHeader(k, v);
    });
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    logger.error({ err }, "Python backend proxy error");
    if (!res.headersSent) {
      res.status(502).json({ detail: "Python backend unavailable. Please wait and retry." });
    }
  });

  if (body !== undefined) proxyReq.write(body);
  proxyReq.end();
}

app.all("/api/session/{*splat}", proxyToPython);
app.use("/api", router);

// Serve desktop frontend static files
const frontendDist = path.resolve("./artifacts/travelmind/dist/public");
app.use(express.static(frontendDist));

// Fallback to index.html for client-side routing (Express 5 wildcard syntax)
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
