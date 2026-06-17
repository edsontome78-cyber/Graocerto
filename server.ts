import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to persistent store inside container
const USERS_FILE = path.join(process.cwd(), 'data_users.json');
const REPORTS_FILE = path.join(process.cwd(), 'data_reports.json');

// Default initial storage data
const DEFAULT_USERS = [
  {
    email: 'edsontome78@gmail.com',
    name: 'Edson Tomé',
    password: '@Scul3d3nado',
    approved: true,
    role: 'admin',
    createdAt: '2026-05-24 22:09:07'
  },
  {
    email: 'marcia.agrominas@gmail.com',
    name: 'Márcia Silva',
    password: 'agro123_password',
    approved: false,
    role: 'user',
    createdAt: '25/05/2026 09:12'
  },
  {
    email: 'thiago.safra@gmail.com',
    name: 'Thiago Peixoto',
    password: 'safra123_password',
    approved: false,
    role: 'user',
    createdAt: '25/05/2026 10:33'
  }
];

const SEED_REPORTS = [
  {
    id: 'rep-001',
    reportNumber: '1024',
    date: '2026-05-24 16:35',
    farmerName: 'Fazenda Tres Lagoas (Silva)',
    cityState: 'Piracicaba / SP',
    lotReference: 'LOTE-A24',
    vehiclePlate: 'AGR-2026',
    operatorName: 'Técnico Agrícola Tomé',
    sample: {
      grainType: 'SOJA',
      totalWeight: 14500,
      rawFieldSampleWeight: 500,
      officialSampleWeight: 100,
      impurityGrams: 1.8,
      damagedGrams: 9.2,
      brokenGrams: 18.0,
      moisture: 16.5
    },
    result: {
      sampleDiscountMoisture: 4.22,
      sampleDiscountImpurity: 0.8,
      sampleDiscountDamaged: 1.2,
      sampleDiscountBroken: 0.0,
      sampleTotalDiscounts: 6.22,
      sampleFinalNetWeight: 93.78,
      discountMoistureWeight: 612,
      discountImpurityWeight: 116,
      discountDamagedWeight: 174,
      discountBrokenWeight: 0,
      totalDiscounts: 902,
      finalNetWeight: 13598,
      moisturePercent: 16.5,
      impurityPercent: 1.8,
      damagedPercent: 9.2,
      brokenPercent: 18.0,
      hasDeduction: true,
      classificationGrade: 'TIPO 2 (Adequado)'
    },
    notes: 'Amostra colhida ontem no Talhão 4. Classificação com determinador aferido.'
  }
];

// Helper to read/write users
function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading users file:', e);
  }
  // Store default users on first boot
  writeUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

function writeUsers(users: any) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing users file:', e);
  }
}

// Helper to read/write reports
function readReports() {
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      const data = fs.readFileSync(REPORTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading reports file:', e);
  }
  writeReports(SEED_REPORTS);
  return SEED_REPORTS;
}

function writeReports(reports: any) {
  try {
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing reports file:', e);
  }
}

// --- API ENDPOINTS ---

// GET Users
app.get('/api/users', (req, res) => {
  res.json(readUsers());
});

// POST Register user / Add user
app.post('/api/users', (req, res) => {
  const users = readUsers();
  const newUser = req.body;
  
  if (!newUser.email || !newUser.name) {
    return res.status(400).json({ error: 'Cadastro incompleto' });
  }

  const emailClean = newUser.email.toLowerCase().trim();
  const originalEmail = newUser.originalEmail ? newUser.originalEmail.toLowerCase().trim() : emailClean;
  
  // Update if exists or add new
  const index = users.findIndex((u: any) => u.email.toLowerCase() === originalEmail);
  if (index >= 0) {
    const oldUser = users[index];
    users[index] = { ...oldUser, ...newUser, email: emailClean };
    delete users[index].originalEmail;
  } else {
    const existingIndex = users.findIndex((u: any) => u.email.toLowerCase() === emailClean);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...newUser, email: emailClean };
    } else {
      users.push({ ...newUser, email: emailClean });
    }
  }

  writeUsers(users);
  res.json({ success: true, users });
});

// POST Approve user status
app.post('/api/users/approve', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email não informado' });
  }
  const users = readUsers();
  const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    user.approved = true;
    writeUsers(users);
    res.json({ success: true, users });
  } else {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
});

// DELETE User
app.delete('/api/users/:email', (req, res) => {
  const { email } = req.params;
  const users = readUsers();
  const filtered = users.filter((u: any) => u.email.toLowerCase() !== email.toLowerCase());
  writeUsers(filtered);
  res.json({ success: true, users: filtered });
});

// GET Reports
app.get('/api/reports', (req, res) => {
  res.json(readReports());
});

// POST Report (Add or Update)
app.post('/api/reports', (req, res) => {
  const reports = readReports();
  const report = req.body;

  if (!report.id) {
    report.id = 'rep-' + Date.now();
  }

  const index = reports.findIndex((r: any) => r.id === report.id);
  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.push(report);
  }

  writeReports(reports);
  res.json({ success: true, report, reports });
});

// DELETE Report
app.delete('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  const reports = readReports();
  const filtered = reports.filter((r: any) => r.id !== id);
  writeReports(filtered);
  res.json({ success: true, reports: filtered });
});


// --- INTEGRATE VITE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
