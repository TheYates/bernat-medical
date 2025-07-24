import { networkInterfaces } from "os";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

// Get local IP address
const getLocalIP = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost"; // Fallback
};

const localIP = getLocalIP();
console.log(`\nLocal IP address: ${localIP}\n`);

// Update frontend .env file
const frontendEnvPath = join(process.cwd(), ".env");
const frontendEnvContent = `VITE_API_URL=http://${localIP}:5000/api`;

// Update backend .env file
const backendEnvPath = join(process.cwd(), "../backend/.env");
try {
  // Read existing backend .env content
  const backendEnvContent = readFileSync(backendEnvPath, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("CORS_ORIGIN="))
    .join("\n");

  // Add new CORS_ORIGIN
  const updatedBackendEnvContent = `${backendEnvContent}\nCORS_ORIGIN=http://${localIP}:5173`;

  // Write the files
  writeFileSync(frontendEnvPath, frontendEnvContent);
  writeFileSync(backendEnvPath, updatedBackendEnvContent);

  console.log("✅ Updated frontend .env file with API URL");
  console.log("✅ Updated backend .env file with CORS configuration");
  console.log("\nYou can now:");
  console.log('1. Run "npm run dev:all" to start both servers');
  console.log(
    `2. Access the app from other devices using: http://${localIP}:5173\n`
  );
} catch (err) {
  console.error("❌ Failed to update environment files:", err);
}
