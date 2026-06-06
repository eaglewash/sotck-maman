# 🧺 Mon Garde-Manger — Guide de déploiement

Suis ces étapes dans l'ordre. Comptez ~20 minutes au total.

---

## ÉTAPE 1 — Créer la base de données (Supabase)

1. Va sur **https://supabase.com** et crée un compte gratuit
2. Clique **"New project"**
   - Nom : `maison-stock` (ou ce que tu veux)
   - Mot de passe : note-le quelque part
   - Région : choisir `West EU (Paris)` pour la France
3. Attends ~2 minutes que le projet se crée
4. Dans le menu gauche, clique **"SQL Editor"**
5. Clique **"New query"**, colle tout le contenu du fichier `supabase_schema.sql`, puis clique **"Run"**
   - Tu dois voir "Success. No rows returned"
6. Dans le menu gauche, clique **"Project Settings" → "API"**
7. Copie ces deux valeurs (tu en auras besoin à l'étape 3) :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon / public key** → longue chaîne de caractères

---

## ÉTAPE 2 — Mettre le code sur GitHub

1. Va sur **https://github.com** et crée un compte si tu n'en as pas
2. Clique le **"+"** en haut à droite → **"New repository"**
   - Nom : `maison-stock`
   - Visibilité : **Private** (recommandé)
   - Clique **"Create repository"**
3. Sur ton ordinateur, ouvre un terminal dans le dossier `maison-stock/` et tape :

```bash
npm install
git init
git add .
git commit -m "premier commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/maison-stock.git
git push -u origin main
```

*(Remplace `TON_USERNAME` par ton nom d'utilisateur GitHub)*

---

## ÉTAPE 3 — Déployer sur Vercel

1. Va sur **https://vercel.com** et connecte-toi avec ton compte GitHub
2. Clique **"Add New Project"**
3. Sélectionne le dépôt `maison-stock`
4. Dans la section **"Environment Variables"**, ajoute ces deux variables :

   | Nom | Valeur |
   |-----|--------|
   | `VITE_SUPABASE_URL` | ta Project URL (ex: `https://abcdefgh.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | ta anon key |

5. Clique **"Deploy"** — Vercel construit et déploie automatiquement
6. En ~1 minute, tu reçois une URL du type `https://maison-stock-xxx.vercel.app`

**C'est ton app ! Partage cette URL à maman.**

---

## ÉTAPE 4 — Utiliser l'app

### Ajouter des articles au stock
- Onglet **Stock** → bouton **Ajouter**
- Remplis : nom, quantité actuelle, unité, catégorie
- **Quantité min.** = le seuil en dessous duquel l'article apparaît dans les courses

### Créer une recette
- Onglet **Recettes** → **Nouvelle recette**
- Ajoute les ingrédients depuis la liste du stock
- Précise les quantités nécessaires pour le repas

### Cuisiner
- Sur une recette, clique **Cuisiner**
- L'app montre ce qui va être déduit et si le stock est suffisant
- Confirme → le stock est mis à jour automatiquement

### Liste de courses
- Onglet **Courses** → généré automatiquement
- Tous les articles en dessous de leur quantité minimum apparaissent
- Coche ceux achetés, puis clique **Reçu** pour remettre à jour le stock

---

## Mises à jour futures

Si tu modifies le code plus tard, un simple `git push` sur GitHub redéploie automatiquement sur Vercel.

---

*Fait avec ❤️ pour maman*
