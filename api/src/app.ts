import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { query } from "./db.js";
import { errorHandler, HttpError, parse } from "./lib/http.js";
import { locatePoint } from "./lib/locate.js";
import { provincesRouter } from "./routes/provinces.js";
import { z } from "zod";

// Tạo ứng dụng Express (tách khỏi index.ts để kiểm thử dễ hơn)
export function createApp() {
  const app = express();
  // CORS: cho phép trang web ở địa chỉ khác cổng (localhost:3000) gọi API này
  app.use(cors({ origin: config.webOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", async (_req, res) => {
    const [row] = await query<{ postgis: string }>("SELECT postgis_version() AS postgis");
    res.json({ ok: true, postgis: row.postgis });
  });

  app.use("/api/provinces", provincesRouter);

  // GET /api/geo/locate?lat=..&lng=..: điểm này thuộc tỉnh, xã/phường nào
  app.get("/api/geo/locate", async (req, res) => {
    const { lat, lng } = parse(
      z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }),
      req.query,
    );
    const location = await locatePoint(lng, lat);
    if (!location) throw new HttpError(404, "Vị trí nằm ngoài ranh giới hành chính Việt Nam");
    res.json(location);
  });

  app.use((_req, _res, next) => next(new HttpError(404, "Không tìm thấy đường dẫn API")));
  app.use(errorHandler);
  return app;
}
