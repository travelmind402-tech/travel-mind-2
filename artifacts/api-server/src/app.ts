import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "http";
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

function proxyToPython(req: Request, res: Response) {
  const backendPath = req.originalUrl.replace(/^\/api/, "");
  const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0;
  const body = hasBody ? JSON.stringify(req.body) : undefined;

  const headers: http.OutgoingHttpHeaders = {
    "Content-Type": "application/json",
  };
  if (body !== undefined) {
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  const options: http.RequestOptions = {
    hostname: "localhost",
    port: 8000,
    path: backendPath,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
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

  if (body !== undefined) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

app.all("/api/session/*splat", proxyToPython);

app.use("/api", router);

export default app;
