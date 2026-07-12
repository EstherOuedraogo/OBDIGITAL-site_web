const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL n\'est pas défini. Ajoutez-le dans votre fichier .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render / la plupart des hébergeurs Postgres managés exigent SSL en production,
  // mais avec un certificat auto-signé -> on désactive la vérification stricte.
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : (process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false)
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      prenom TEXT NOT NULL,
      email TEXT NOT NULL,
      telephone TEXT,
      type_inscription TEXT NOT NULL DEFAULT 'contact',
      message TEXT,
      statut TEXT NOT NULL DEFAULT 'nouveau',
      date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS commandes (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id),
      prenom TEXT NOT NULL,
      email TEXT NOT NULL,
      telephone TEXT,
      offre TEXT NOT NULL,
      montant INTEGER NOT NULL,
      statut_paiement TEXT NOT NULL DEFAULT 'en_attente',
      date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS temoignages (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      photo TEXT,
      texte TEXT NOT NULL,
      resultat TEXT,
      publie INTEGER NOT NULL DEFAULT 1,
      date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed testimonials on first run only
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM temoignages');
  if (rows[0].n === 0) {
    const seed = [
      { nom: 'Salma A.', photo: 'SA', texte: "En quatre semaines, j'ai publié plus de contenu qu'en un an tout seul. La méthode change tout.", resultat: '+2 400 abonnés en 60 jours' },
      { nom: 'Youssef M.', photo: 'YM', texte: "Je ne savais pas monter une vidéo. Aujourd'hui je produis seul tout le contenu de ma marque.", resultat: 'Studio vidéo personnel lancé' },
      { nom: 'Imane K.', photo: 'IK', texte: "L'accompagnement après la formation a fait toute la différence pour rester régulier.", resultat: '+100k vues cumulées' }
    ];
    for (const r of seed) {
      await pool.query(
        'INSERT INTO temoignages (nom, photo, texte, resultat) VALUES ($1, $2, $3, $4)',
        [r.nom, r.photo, r.texte, r.resultat]
      );
    }
  }
}

module.exports = { pool, initDb };
