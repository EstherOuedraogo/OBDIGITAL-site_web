require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');
const { notifyNewLead } = require('./mailer');

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

// Petit wrapper pour éviter un try/catch dans chaque route
function asyncRoute(fn) {
  return (req, res) => fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  });
}

// ============================================================
// PUBLIC API — formulaires du site
// ============================================================

// Inscription Masterclass Gratuite (Prénom, Email, Téléphone)
app.post('/api/masterclass', asyncRoute(async (req, res) => {
  const { prenom, email, telephone } = req.body;
  if (!prenom || !isValidEmail(email) || !telephone) {
    return res.status(400).json({ error: 'Champs invalides ou manquants.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO leads (prenom, email, telephone, type_inscription) VALUES ($1, $2, $3, 'masterclass') RETURNING id`,
    [prenom.trim(), email.trim().toLowerCase(), telephone.trim()]
  );
  notifyNewLead({ type: 'masterclass', prenom: prenom.trim(), email: email.trim().toLowerCase(), telephone: telephone.trim() });
  res.status(201).json({ ok: true, id: rows[0].id });
}));

// Inscription Programme Content IA Starter (Prénom, Email, Téléphone, offre choisie)
app.post('/api/programme', asyncRoute(async (req, res) => {
  const { prenom, email, telephone, offre } = req.body;
  if (!prenom || !isValidEmail(email) || !telephone) {
    return res.status(400).json({ error: 'Champs invalides ou manquants.' });
  }
  const offreChoisie = offre === 'accompagnement' ? 'accompagnement' : 'seule';
  const montant = offreChoisie === 'accompagnement' ? 15000 : 10000;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const leadResult = await client.query(
      `INSERT INTO leads (prenom, email, telephone, type_inscription) VALUES ($1, $2, $3, 'programme') RETURNING id`,
      [prenom.trim(), email.trim().toLowerCase(), telephone.trim()]
    );
    const leadId = leadResult.rows[0].id;

    const cmdResult = await client.query(
      `INSERT INTO commandes (lead_id, prenom, email, telephone, offre, montant) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [leadId, prenom.trim(), email.trim().toLowerCase(), telephone.trim(), offreChoisie, montant]
    );
    const commandeId = cmdResult.rows[0].id;

    await client.query('COMMIT');
    notifyNewLead({
      type: 'programme',
      prenom: prenom.trim(),
      email: email.trim().toLowerCase(),
      telephone: telephone.trim(),
      offre: offreChoisie,
      montant
    });
    res.status(201).json({ ok: true, leadId, commandeId, montant });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// Formulaire de contact (Prénom, Email, Message)
app.post('/api/contact', asyncRoute(async (req, res) => {
  const { prenom, email, message } = req.body;
  if (!prenom || !isValidEmail(email) || !message) {
    return res.status(400).json({ error: 'Champs invalides ou manquants.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO leads (prenom, email, telephone, type_inscription, message) VALUES ($1, $2, '', 'contact', $3) RETURNING id`,
    [prenom.trim(), email.trim().toLowerCase(), message.trim()]
  );
  notifyNewLead({ type: 'contact', prenom: prenom.trim(), email: email.trim().toLowerCase(), message: message.trim() });
  res.status(201).json({ ok: true, id: rows[0].id });
}));

// Témoignages publiés — pour affichage dynamique sur la page d'accueil
app.get('/api/temoignages', asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, nom, photo, texte, resultat FROM temoignages WHERE publie = 1 ORDER BY date_creation DESC'
  );
  res.json(rows);
}));

// ============================================================
// ADMIN API — protégée par clé (en-tête x-admin-key)
// ============================================================

app.get('/api/admin/leads', requireAdmin, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM leads ORDER BY date_creation DESC');
  res.json(rows);
}));

app.patch('/api/admin/leads/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { statut } = req.body;
  if (!statut) return res.status(400).json({ error: 'Statut requis.' });
  await pool.query('UPDATE leads SET statut = $1 WHERE id = $2', [statut, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/commandes', requireAdmin, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM commandes ORDER BY date_creation DESC');
  res.json(rows);
}));

app.patch('/api/admin/commandes/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { statut_paiement } = req.body;
  if (!statut_paiement) return res.status(400).json({ error: 'Statut requis.' });
  await pool.query('UPDATE commandes SET statut_paiement = $1 WHERE id = $2', [statut_paiement, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/temoignages', requireAdmin, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM temoignages ORDER BY date_creation DESC');
  res.json(rows);
}));

app.post('/api/admin/temoignages', requireAdmin, asyncRoute(async (req, res) => {
  const { nom, photo, texte, resultat } = req.body;
  if (!nom || !texte) return res.status(400).json({ error: 'Nom et texte requis.' });
  const { rows } = await pool.query(
    'INSERT INTO temoignages (nom, photo, texte, resultat) VALUES ($1, $2, $3, $4) RETURNING id',
    [nom.trim(), (photo || nom.slice(0, 2)).toUpperCase(), texte.trim(), resultat || '']
  );
  res.status(201).json({ ok: true, id: rows[0].id });
}));

app.patch('/api/admin/temoignages/:id', requireAdmin, asyncRoute(async (req, res) => {
  const { publie } = req.body;
  await pool.query('UPDATE temoignages SET publie = $1 WHERE id = $2', [publie ? 1 : 0, req.params.id]);
  res.json({ ok: true });
}));

app.delete('/api/admin/temoignages/:id', requireAdmin, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM temoignages WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// Simple dashboard summary
app.get('/api/admin/summary', requireAdmin, asyncRoute(async (req, res) => {
  const leadsResult = await pool.query('SELECT COUNT(*)::int AS n FROM leads');
  const commandesResult = await pool.query('SELECT COUNT(*)::int AS n FROM commandes');
  const revenuResult = await pool.query(
    "SELECT COALESCE(SUM(montant),0)::int AS total FROM commandes WHERE statut_paiement = 'payee'"
  );
  res.json({
    leads: leadsResult.rows[0].n,
    commandes: commandesResult.rows[0].n,
    revenu: revenuResult.rows[0].total
  });
}));

app.get('/health', (req, res) => res.json({ ok: true }));

// ---------- Démarrage ----------
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`OBDIGITAL backend démarré sur http://localhost:${PORT}`);
      console.log(`Admin: http://localhost:${PORT}/admin.html (clé requise)`);
    });
  })
  .catch((err) => {
    console.error('❌ Impossible d\'initialiser la base de données PostgreSQL :', err);
    process.exit(1);
  });
