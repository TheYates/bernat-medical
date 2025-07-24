import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/error";
import apiRoutes from "./routes/api";
import prescriptionRoutes from "./routes/prescription.routes";
import path from "path";
import fs from "fs";
import serviceRoutes from "./routes/service.routes";
import pharmacyRoutes from "./routes/pharmacy.routes";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Set up uploads directory with absolute path
const uploadsDir = path.resolve(__dirname, "../uploads");
console.log("Uploads directory (absolute):", uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files with more permissive options
app.use(
  "/api/uploads",
  (req, res, next) => {
    console.log("File request:", {
      url: req.url,
      path: path.join(uploadsDir, req.url),
      exists: fs.existsSync(path.join(uploadsDir, req.url)),
    });
    next();
  },
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader(
        "Access-Control-Allow-Origin",
        process.env.CORS_ORIGIN || "http://localhost:5173"
      );
      res.setHeader("Access-Control-Allow-Methods", "GET");
    },
  })
);

// Then your API routes
app.use("/api", apiRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/pharmacy", pharmacyRoutes);

// Error handling
app.use(errorHandler);

// Add this for debugging
console.log("Registered routes:");
app._router.stack
  .filter((r: any) => r.route)
  .forEach((r: any) => {
    console.log(
      `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`
    );
  });

export default app;
