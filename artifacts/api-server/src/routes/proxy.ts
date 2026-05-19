import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const router = Router();

const PYTHON_BACKEND = "http://localhost:8000";

router.use(
  "/session",
  createProxyMiddleware({
    target: PYTHON_BACKEND,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq: any, req: any) => {
        const restPath = req.url || "/";
        proxyReq.path = `/session${restPath === "/" ? "" : restPath}`;
      },
      error: (_err: Error, _req: any, res: any) => {
        res.status(502).json({ detail: "Python backend unavailable. Please wait and retry." });
      },
    },
  })
);

export default router;
