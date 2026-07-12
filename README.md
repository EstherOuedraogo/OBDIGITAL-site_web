# OBDIGITAL — Site + Backend (base de données réelle)

Ce projet contient le site OBDIGITAL complet **avec un vrai backend** :
- Serveur **Node.js / Express**
- Base de données **SQLite** (fichier `data/obdigital.db`, créé automatiquement)
- 3 tables réelles : `leads`, `commandes`, `temoignages`
- Un tableau de bord admin (`/admin.html`) pour consulter et gérer les données

## 1. Installation

```bash
cd obdigital-backend
npm install
cp .env.example .env
```

Ouvrez `.env` et changez `ADMIN_KEY` pour une valeur secrète à vous (c'est le mot de passe du tableau de bord admin).

## 2. Lancer le site en local

```bash
npm start
```

Le site est servi sur **http://localhost:3000**
Le tableau de bord admin est sur **http://localhost:3000/admin.html**

## 3. Ce qui est branché

| Formulaire (page)          | Endpoint API          | Table remplie          |
|-----------------------------|------------------------|--------------------------|
| Masterclass Gratuite        | `POST /api/masterclass`| `leads`                  |
| Programme (inscription)     | `POST /api/programme`  | `leads` + `commandes`    |
| Contact                     | `POST /api/contact`    | `leads`                  |
| Témoignages (accueil)       | `GET /api/temoignages` | lecture depuis `temoignages` |

Toutes les données envoyées sont validées côté serveur (email, champs obligatoires) avant d'être écrites en base — les erreurs s'affichent directement dans le formulaire.

## 4. Tableau de bord admin

Sur `/admin.html`, entrez la clé définie dans `ADMIN_KEY`. Vous pouvez :
- Voir tous les **leads** (masterclass, programme, contact) et changer leur statut (nouveau / contacté / converti / perdu)
- Voir toutes les **commandes** et marquer un paiement comme reçu (`en_attente` → `payee`)
- Voir et gérer les **témoignages** (publier / masquer) — ils s'affichent automatiquement sur la page d'accueil

⚠️ C'est une protection simple par clé, suffisante pour démarrer. Pour une mise en production sérieuse, prévoyez une vraie authentification (compte + mot de passe hashé, ou SSO).

## 5. Mettre le site en ligne — Render (backend + frontend ensemble)

### Étape A — Pousser le code sur GitHub

```bash
cd obdigital-backend
git init
git add .
git commit -m "Premier commit — site OBDIGITAL"
```

Puis va sur [github.com/new](https://github.com/new), crée un repo vide (nom libre, ex: `obdigital`), **sans** cocher "Add README" (on en a déjà un). GitHub t'affichera des commandes à copier, du style :

```bash
git remote add origin https://github.com/TON-NOM/obdigital.git
git branch -M main
git push -u origin main
```

Exécute-les. Ton code est maintenant sur GitHub.

### Étape B — Créer le service sur Render

1. Va sur [render.com](https://render.com), connecte-toi avec ton compte GitHub
2. Clique **New +** → **Web Service**
3. Choisis le repo `obdigital` que tu viens de pousser
4. Render détecte automatiquement `npm install` et `npm start` (un fichier `render.yaml` est déjà inclus pour préconfigurer ça)
5. Dans **Environment Variables**, ajoute :
   - `ADMIN_KEY` → ta clé secrète pour le tableau de bord admin
6. **Important — persistance des données** : dans l'onglet **Disks**, ajoute un disque persistant monté sur le dossier `data/` de ton projet (sinon la base SQLite est effacée à chaque redéploiement). Le `render.yaml` fourni le configure déjà automatiquement ; vérifie juste que le chemin correspond bien à ton projet une fois déployé (Render l'affiche dans les logs si besoin d'ajuster).
7. Clique **Create Web Service** — Render installe, build et démarre ton app.

Après quelques minutes, ton site est en ligne sur une adresse du type `https://obdigital.onrender.com`.

### Étape C — Mettre à jour le site plus tard

À chaque modification :
```bash
git add .
git commit -m "description du changement"
git push
```
Render redéploie automatiquement à chaque `push`.

### Note sur Vercel

Tu n'as **pas besoin de Vercel** avec cette configuration : Render héberge le backend *et* sert les pages HTML en même temps (un seul service, une seule adresse). Vercel serait utile seulement si tu voulais séparer front et back plus tard — dis-le-moi si tu changes d'avis, je t'aiderai à faire la bascule (CORS, URLs d'API à adapter, etc.).


## 6. Structure du projet

```
obdigital-backend/
  server.js          → serveur Express + toutes les routes API
  db.js               → connexion SQLite + création des tables + données de départ
  public/              → le site (HTML/CSS/JS), servi tel quel par Express
    index.html, services.html, masterclass.html, programme.html,
    apropos.html, contact.html, merci.html, admin.html
    assets/style.css, assets/script.js
  data/                → contient obdigital.db (créé au premier lancement)
  .env.example         → modèle de configuration
```

## 7. Sauvegarder vos données

Le fichier `data/obdigital.db` contient toutes vos données. Sauvegardez-le régulièrement (copie du fichier) si vous êtes en production.
