import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// No longer using /tmp for local development to ensure persistence
const DATA_DIR = process.cwd();

const UPLOADS_FILE = path.join(DATA_DIR, 'uploads.json');
const SHIPMENTS_FILE = path.join(DATA_DIR, 'shipments.json');

// Ensure files exist helper
const ensureFiles = () => {
  try {
    if (!fs.existsSync(UPLOADS_FILE)) {
      console.log("Initializing uploads file...");
      fs.writeFileSync(UPLOADS_FILE, '[]');
    }

    const defaultShipments = Array.from({ length: 6 }, (_, i) => ({
      id: (i + 1).toString(),
      trackingNumber: i === 0 ? "6635471299413458" : `663547129941300${i}`,
      name: i === 0 ? "Nicola Tella" : `Cliente Ejemplo ${i + 1}`,
      postalCode: "50001, Zaragoza",
      address: "Ps. Independencia 33, 50001, Zaragoza",
      contact: "+34 614 11 39 38",
      packageVerified: "Paquete Estándar",
      beneficiary: "5000",
      concept: "Envío Programado",
      ibanLabel: "IBAN",
      ibanValue: "ES00 0000 0000 0000 0000 0000",
      shippingCost: "14,50€",
      packageCost: "0,00€",
      totalAmount: "14,50€",
      status: "pending",
      badge: "EN TRÁNSITO"
    }));

    if (!fs.existsSync(SHIPMENTS_FILE)) {
      console.log("Initializing shipments file...");
      fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(defaultShipments, null, 2));
    } else {
      try {
        const data = fs.readFileSync(SHIPMENTS_FILE, 'utf-8');
        const current = JSON.parse(data);
        if (!Array.isArray(current) || current.length < 6) {
          console.log("Fixing shipments file: current data is not 6 entries array. Resetting...");
          const merged = Array.isArray(current) ? [...current] : [];
          // Fill missing to reach 6
          for (let i = merged.length; i < 6; i++) {
            merged.push(defaultShipments[i]);
          }
          fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(merged.slice(0, 6), null, 2));
        }
      } catch (e) {
        console.error("Error repairing shipments file, resetting to defaults:", e);
        fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(defaultShipments, null, 2));
      }
    }
  } catch (err) {
    console.error("Critical: Could not initialize data files in", DATA_DIR, err);
  }
};

ensureFiles();

// API Routes
app.get('/api/shipment', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    ensureFiles(); // Force structure check on every read
    const data = fs.readFileSync(SHIPMENTS_FILE, 'utf-8');
    const shipments = JSON.parse(data);
    
    // Safety check: ensure we always return an array of 6
    if (!Array.isArray(shipments) || shipments.length < 6) {
       ensureFiles();
       const freshData = fs.readFileSync(SHIPMENTS_FILE, 'utf-8');
       return res.json(JSON.parse(freshData));
    }
    res.json(shipments);
  } catch (e) {
    console.error("Read shipment error:", e);
    res.status(500).json({ error: "Failed to read shipments" });
  }
});

app.post('/api/shipment/update', (req, res) => {
  const { id, ...updates } = req.body;
  try {
    const data = fs.readFileSync(SHIPMENTS_FILE, 'utf-8');
    const shipments = JSON.parse(data);
    const index = shipments.findIndex((s: { id: string }) => s.id === id);
    if (index !== -1) {
      shipments[index] = { ...shipments[index], ...updates };
      fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2));
      return res.json({ success: true });
    }
    res.status(404).json({ error: "Shipment not found" });
  } catch (e) {
    res.status(500).json({ error: "Failed to update shipment" });
  }
});

app.post('/api/uploads', (req, res) => {
  const { image, trackingNumber } = req.body;
  if (!image) return res.status(400).json({ error: "Missing image" });
  
  try {
    if (!fs.existsSync(UPLOADS_FILE)) {
      ensureFiles();
    }
    const data = fs.readFileSync(UPLOADS_FILE, 'utf-8');
    const uploads = JSON.parse(data);
    const newUpload = {
      id: Date.now().toString(),
      image,
      trackingNumber: trackingNumber || "N/A",
      date: new Date().toISOString()
    };
    uploads.push(newUpload);
    fs.writeFileSync(UPLOADS_FILE, JSON.stringify(uploads, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error("Upload error:", e);
    res.status(500).json({ error: "Failed to save upload" });
  }
});

// Admin API
const ADMIN_PASSWORD = "192021"; // User requested password

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: "admin-token-123" });
  } else {
    console.log("Login failed for password:", password);
    return res.status(401).json({ success: false, error: "Contraseña incorrecta" });
  }
});

// Middleware for admin auth
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer admin-token-123') {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.get('/api/admin/uploads', adminAuth, (req, res) => {
  try {
    const data = fs.readFileSync(UPLOADS_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: "Failed to read uploads" });
  }
});

app.delete('/api/admin/uploads/:id', adminAuth, (req, res) => {
  try {
    const data = fs.readFileSync(UPLOADS_FILE, 'utf-8');
    let uploads = JSON.parse(data);
    uploads = uploads.filter(u => u.id !== req.params.id);
    fs.writeFileSync(UPLOADS_FILE, JSON.stringify(uploads, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete upload" });
  }
});

app.post('/api/admin/shipment', adminAuth, (req, res) => {
  try {
    const shipments = req.body;
    if (!Array.isArray(shipments) || shipments.length < 6) {
      return res.status(400).json({ error: "Deben ser exactamente 6 envíos" });
    }
    fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error("Admin save error:", e);
    res.status(500).json({ error: "Failed to save shipments" });
  }
});

app.post('/api/admin/shipment/reset', adminAuth, (req, res) => {
  const defaultShipments = Array.from({ length: 6 }, (_, i) => ({
    id: (i + 1).toString(),
    trackingNumber: i === 0 ? "6635471299413458" : `663547129941300${i}`,
    name: i === 0 ? "Nicola Tella" : `Cliente Ejemplo ${i + 1}`,
    postalCode: "50001, Zaragoza",
    address: "Ps. Independencia 33, 50001, Zaragoza",
    contact: "+34 614 11 39 38",
    packageVerified: "Paquete Estándar",
    beneficiary: "5000",
    concept: "Envío Programado",
    ibanLabel: "IBAN",
    ibanValue: "ES00 0000 0000 0000 0000 0000",
    shippingCost: "14,50€",
    packageCost: "0,00€",
    totalAmount: "14,50€",
    status: "pending",
    badge: "EN TRÁNSITO"
  }));
  try {
    fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(defaultShipments, null, 2));
    res.json({ success: true, data: defaultShipments });
  } catch (e) {
    res.status(500).json({ error: "Failed to reset shipments" });
  }
});

// Vite middleware for development
const setupMiddleware = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    // Note: We don't need the fallback here if Vercel handles it via rewrites,
    // but it doesn't hurt for other environments.
    app.get('*', (req, res, next) => {
      // If it starts with /api, don't serve index.html
      if (req.path.startsWith('/api')) return next();
      
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }
};

// We don't await this because on Vercel the file serving is handled by Vercel
// and we only care about the API routes which are already defined above.
if (!process.env.VERCEL) {
  setupMiddleware();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
