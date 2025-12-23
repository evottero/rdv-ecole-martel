# 🏫 Application RDV École Martel

Application web simple pour gérer les rendez-vous parents/enseignants et les réunions d'équipe.

## ✨ Fonctionnalités

- **Parents** : Réserver un RDV avec l'enseignant de leur classe
- **Enseignants** : Créer des créneaux + organiser des sondages de réunion
- **Administration** : Gérer tous les codes d'accès

---

## 🚀 Installation en 15 minutes

### Étape 1 : Créer un compte Supabase (gratuit)

1. Va sur **https://supabase.com**
2. Clique sur **"Start your project"**
3. Connecte-toi avec GitHub (ou crée un compte email)
4. Clique sur **"New Project"**
5. Remplis :
   - **Name** : `ecole-martel`
   - **Database Password** : choisis un mot de passe (note-le !)
   - **Region** : `West EU (Paris)`
6. Clique sur **"Create new project"**
7. Attends 2 minutes que le projet se crée

### Étape 2 : Créer les tables

1. Dans Supabase, va dans **"SQL Editor"** (menu de gauche, icône terminal)
2. Clique sur **"New query"**
3. Copie-colle TOUT le contenu du fichier `database.sql` (fourni avec ce projet)
4. Clique sur **"Run"** (bouton vert)
5. Tu devrais voir "Success. No rows returned" - c'est normal !

### Étape 3 : Récupérer les clés API

1. Va dans **"Project Settings"** (icône engrenage en bas à gauche)
2. Clique sur **"API"** dans le menu
3. Note ces 2 informations :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** : une longue chaîne de caractères

### Étape 4 : Déployer sur Vercel (gratuit)

1. Va sur **https://vercel.com**
2. Clique sur **"Sign Up"** et connecte-toi avec GitHub
3. Clique sur **"Add New..."** → **"Project"**
4. Clique sur **"Import Third-Party Git Repository"**
5. Entre l'URL de ton dépôt GitHub (tu devras d'abord pousser ce code sur GitHub)

**Alternative plus simple - déploiement depuis ton ordinateur :**

```bash
# Installe l'outil Vercel
npm install -g vercel

# Dans le dossier du projet
vercel

# Réponds aux questions :
# - Set up and deploy? → Y
# - Which scope? → (ton compte)
# - Link to existing project? → N
# - What's your project's name? → rdv-ecole-martel
# - In which directory is your code? → ./
# - Override settings? → N
```

### Étape 5 : Configurer les variables d'environnement

Dans Vercel :
1. Va dans ton projet → **"Settings"** → **"Environment Variables"**
2. Ajoute ces 2 variables :

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` (ton URL Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (ta clé anon public) |

3. Clique sur **"Save"**
4. Va dans **"Deployments"** et clique sur **"Redeploy"**

### Étape 6 : C'est prêt ! 🎉

Ton application est accessible à : `https://rdv-ecole-martel.vercel.app` (ou le nom que tu as choisi)

---

## 📱 Utilisation

### Premier accès (Admin)

1. Ouvre l'application dans ton navigateur
2. Entre le code : **`ADMIN`**
3. Tu arrives sur le tableau de bord admin

### Créer les codes enseignants

Dans l'admin :
1. Clique sur **"+ Nouveau code"**
2. Sélectionne **"Enseignant"**
3. Entre :
   - Code : `DUPONT` (ce que l'enseignant tapera)
   - Nom affiché : `M. Dupont`
   - Classe : `CM2`
4. Clique sur **"Créer"**

**Répète pour chaque enseignant.**

### Créer les codes parents (par classe)

1. Clique sur **"+ Nouveau code"**
2. Sélectionne **"Parent (par classe)"**
3. Entre :
   - Code : `CM2` (tous les parents CM2 utiliseront ce code)
   - Nom affiché : `Parents CM2`
   - Classe : `CM2`
4. Clique sur **"Créer"**

**Répète pour chaque classe : CM1, CE2, CE1, CP, etc.**

---

## 📋 Codes par défaut (créés automatiquement)

Le script SQL crée automatiquement ces codes :

| Code | Profil | Classe |
|------|--------|--------|
| `ADMIN` | Administration | - |
| `DUPONT` | Enseignant | CM2 |
| `MARTIN` | Enseignant | CM1 |
| `BERNARD` | Enseignant | CE2 |
| `PETIT` | Enseignant | CE1 |
| `DURAND` | Enseignant | CP |
| `CM2` | Parents | CM2 |
| `CM1` | Parents | CM1 |
| `CE2` | Parents | CE2 |
| `CE1` | Parents | CE1 |
| `CP` | Parents | CP |

**Tu peux les modifier/supprimer depuis l'interface admin.**

---

## 🔗 Partager avec les utilisateurs

### Pour les parents

Envoie-leur par email ou mot dans le cahier :

```
📱 Rendez-vous École Martel

Pour prendre rendez-vous avec l'enseignant :
1. Allez sur : https://rdv-ecole-martel.vercel.app
2. Entrez le code de la classe : CM2
3. Choisissez un créneau disponible

Simple et rapide !
```

### Pour les enseignants

```
📱 Application RDV École

Votre code personnel : DUPONT

Connectez-vous sur : https://rdv-ecole-martel.vercel.app
- Créez vos créneaux de rendez-vous
- Consultez vos réservations
- Organisez des sondages de réunion
```

---

## ❓ FAQ

### Les données sont-elles sécurisées ?
Oui, elles sont stockées sur Supabase (infrastructure sécurisée). Seules les personnes avec un code valide peuvent accéder à l'application.

### Puis-je changer le nom de l'école ?
Oui ! Modifie le fichier `src/pages/index.js` et cherche "École Martel".

### Un parent peut-il réserver plusieurs fois ?
Oui, il peut annuler et re-réserver autant qu'il veut.

### Comment réinitialiser tout en début d'année ?
Dans Supabase > SQL Editor, exécute :
```sql
DELETE FROM appointments;
DELETE FROM meeting_responses;
DELETE FROM meeting_slots;
DELETE FROM meetings;
```
(Cela garde les codes d'accès)

---

## 🛠️ Développement local

```bash
# Installer les dépendances
npm install

# Créer le fichier .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx" >> .env.local

# Lancer en local
npm run dev

# Ouvrir http://localhost:3000
```

---

## 📁 Structure du projet

```
rdv-ecole-martel/
├── src/
│   ├── pages/
│   │   ├── index.js      # Page de connexion
│   │   ├── parent.js     # Interface parents
│   │   ├── teacher.js    # Interface enseignants
│   │   ├── admin.js      # Interface admin
│   │   └── _app.js       # Configuration globale
│   ├── components/
│   │   └── Header.js     # En-tête réutilisable
│   ├── lib/
│   │   ├── supabase.js   # Connexion base de données
│   │   └── utils.js      # Fonctions utilitaires
│   └── styles/
│       └── globals.css   # Styles CSS
├── database.sql          # Script création tables
├── package.json
└── README.md
```

---

*Application créée pour l'École Martel - 2024*
