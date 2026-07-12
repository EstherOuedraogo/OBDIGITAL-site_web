require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers ----------
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Clé admin invalide.' });
  }
  next();
}

// ============================================================
// PUBLIC API — formulaires du site
// ============================================================

// Inscription Masterclass Gratuite (Prénom, Email, Téléphone)
app.post('/api/masterclass', (req, res) => {
  const { prenom, email, telephone } = req.body;
  if (!prenom || !isValidEmail(email) || !telephone) {
    return res.status(400).json({ error: 'Champs invalides ou manquants.' });
  }
  const stmt = db.prepare(
    `INSERT INTO leads (prenom, email, telephone, type_inscription) VALUES (?, ?, ?, 'masterclass')`
  );
  const info = stmt.run(prenom.trim(), email.trim().toLowerCase(), telephone.trim());
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// Inscription Programme Content IA Starter (Prénom, Email, Téléphone, offre choisie)
app.post('/api/programme', (req, res) => {
  const { prenom, email, telephone, offre } = req.body;
  if (!prenom || !isValidEmail(email) || !telephone) {
    return res.status(400).json({ error: 'Champs invalides ou manquants.' });
  }
  const offreChoisie = offre === 'accompagnement' ? 'accompagnement' : 'seule';
  const montant = offreChoisie === 'accompagnement' ? 15000 : 10000;

  const insertLead = db.prepare(
    `INSERT INTO leads (prenom, email, telephone, type_inscription) VALUES (?, ?, ?, 'programme')`
  );
  const insertCommande = db.prepare(
    `INSERT INTO commandes (lead_id, prenom, email, telephone, offre, montant) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    const leadInfo = insertLead.run(prenom.trim(), email.trim().toLowerCase(), telephone.trim());
    const cmdInfo = insertCommande.run(
      leadInfo.lastInsertRowid,
      prenom.trim(),
      email.trim().toLowerCase(),
      telephone.trim(),
      offreChoisie,
      montant
    );
    return { leadId: leadInfo.lastInsertRowid, commandeId: cmdInfo.lastInsertRowid };
  });

  const result = tx();
  res.status(201).json({ ok: true, ...result, montant });
});

// Formulaire de contact (Prénom, Email, Message)
app.post('/api/contact', (req, res) => {
  const { prenom, email, message } = req.body;
  if (!prenom || !isValidEmail(email) || !message) {
    return res.status(400).json({ error: 'Champs invalides ou manquants.' });
  }
  const stmt = db.prepare(
    `INSERT INTO leads (prenom, email, telephone, type_inscription, message) VALUES (?, ?, '', 'contact', ?)`
  );
  const info = stmt.run(prenom.trim(), email.trim().toLowerCase(), message.trim());
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// Témoignages publiés — pour affichage dynamique sur la page d'accueil
app.get('/api/temoignages', (req, res) => {
  const rows = db
    .prepare('SELECT id, nom, photo, texte, resultat FROM temoignages WHERE publie = 1 ORDER BY date_creation DESC')
    .all();
  res.json(rows);
});

// ============================================================
// ADMIN API — protégée par clé (en-tête x-admin-key)
// ============================================================

app.get('/api/admin/leads', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY date_creation DESC').all();
  res.json(rows);
});

app.patch('/api/admin/leads/:id', requireAdmin, (req, res) => {
  const { statut } = req.body;
  if (!statut) return res.status(400).json({ error: 'Statut requis.' });
  db.prepare('UPDATE leads SET statut = ? WHERE id = ?').run(statut, req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/commandes', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM commandes ORDER BY date_creation DESC').all();
  res.json(rows);
});

app.patch('/api/admin/commandes/:id', requireAdmin, (req, res) => {
  const { statut_paiement } = req.body;
  if (!statut_paiement) return res.status(400).json({ error: 'Statut requis.' });
  db.prepare('UPDATE commandes SET statut_paiement = ? WHERE id = ?').run(statut_paiement, req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/temoignages', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM temoignages ORDER BY date_creation DESC').all();
  res.json(rows);
});

app.post('/api/admin/temoignages', requireAdmin, (req, res) => {
  const { nom, photo, texte, resultat } = req.body;
  if (!nom || !texte) return res.status(400).json({ error: 'Nom et texte requis.' });
  const info = db
    .prepare('INSERT INTO temoignages (nom, photo, texte, resultat) VALUES (?, ?, ?, ?)')
    .run(nom.trim(), (photo || nom.slice(0, 2)).toUpperCase(), texte.trim(), resultat || '');
  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

app.patch('/api/admin/temoignages/:id', requireAdmin, (req, res) => {
  const { publie } = req.body;
  db.prepare('UPDATE temoignages SET publie = ? WHERE id = ?').run(publie ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/temoignages/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM temoignages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Simple dashboard summary
app.get('/api/admin/summary', requireAdmin, (req, res) => {
  const leads = db.prepare('SELECT COUNT(*) AS n FROM leads').get().n;
  const commandes = db.prepare('SELECT COUNT(*) AS n FROM commandes').get().n;
  const revenu = db.prepare("SELECT COALESCE(SUM(montant),0) AS total FROM commandes WHERE statut_paiement = 'payee'").get().total;
  res.json({ leads, commandes, revenu });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`OBDIGITAL backend démarré sur http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html (clé requise)`);
});
