

# Centre de Commandement Ultra Super Admin

## Vue d'ensemble

Transformation complète de la page `/admin` en un centre de commandement professionnel avec design Glassmorphism sombre, systeme d'annonces/changelog, hub de feedback, gestion strategique des boutiques avec Kill Switch, et chiffre d'affaires agrege.

---

## 1. Base de donnees - Nouvelles tables

### Table `platform_announcements` (Notes de mise a jour)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant |
| title | text | Titre de la mise a jour |
| new_features | text | Nouvelles fonctionnalites (Markdown) |
| changes_fixes | text | Changements et corrections (Markdown) |
| published_at | timestamptz | Date de publication |
| created_by | uuid | ID du platform_admin |

- RLS : SELECT pour tous les utilisateurs authentifies, INSERT/UPDATE/DELETE uniquement pour `platform_admin` via `has_role()`

### Table `announcement_reads` (Suivi "lu" par utilisateur)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant |
| user_id | uuid | Utilisateur qui a lu |
| announcement_id | uuid FK | Annonce lue |
| read_at | timestamptz | Date de lecture |

- Contrainte UNIQUE sur (user_id, announcement_id)
- RLS : L'utilisateur ne peut voir/inserer que ses propres lectures

### Table `platform_feedback` (Bug reports et suggestions)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant |
| user_id | uuid | Auteur du feedback |
| shop_name | text | Nom de la boutique |
| type | text | 'bug' ou 'suggestion' |
| message | text | Contenu du feedback |
| status | text | 'new', 'in_progress', 'resolved', 'dismissed' |
| created_at | timestamptz | Date de creation |

- RLS : SELECT pour platform_admin (tous) + l'auteur (ses propres feedbacks). INSERT pour tout utilisateur authentifie.

### Modification table `profiles`
- Ajout colonne `is_locked boolean DEFAULT false` pour le Kill Switch (verrouillage d'acces)

---

## 2. Edge Function - Mise a jour `admin-manage-users`

Ajout de nouvelles actions dans la fonction existante :

- **`lock`** : Met a jour `is_locked = true` sur le profil d'un utilisateur + desactive le compte via `auth.admin.updateUserById({ ban_duration: "876000h" })`
- **`unlock`** : Inverse l'operation (reactive le compte)
- **`get-revenue`** : Calcule le chiffre d'affaires global agrege depuis la table `sales` (somme de `total_amount` par proprietaire)
- **`get-activity`** : Retourne les dernieres reparations/ventes de toutes les boutiques pour l'"Activite recente"

---

## 3. Design UI - Glassmorphism Sombre

### Nouvelles classes CSS dans `index.css`
```text
.admin-glass       -> backdrop-blur-xl bg-slate-900/60 border border-white/10
.admin-glass-card  -> backdrop-blur-lg bg-slate-800/50 border border-white/5
.admin-neon-blue   -> text-[#00D4FF] / shadow-[0_0_20px_rgba(0,212,255,0.3)]
.admin-neon-green  -> text-[#10B981] / shadow-[0_0_20px_rgba(16,185,129,0.3)]
```

Le fond de la page admin sera force en mode sombre avec un arriere-plan degrade sombre independant du theme global de l'application.

---

## 4. Architecture des composants

### Layout principal : `AdminDashboard.tsx` (refonte complete)

```text
+------------------+----------------------------------------+
|                  |                                        |
|  Sidebar Admin   |   Zone principale (grille Bento)       |
|                  |                                        |
|  - Dashboard     |   [Stats]  [Stats]  [Stats]  [Stats]  |
|  - Boutiques     |   [Activite recente    ] [Feedback    ]|
|  - Annonces      |   [                    ] [inbox       ]|
|  - Feedback      |   [Liste boutiques / Annonces / ...]  |
|  - Deconnexion   |                                        |
+------------------+----------------------------------------+
```

### Nouveaux composants

| Composant | Role |
|-----------|------|
| `AdminSidebar.tsx` | Barre laterale avec navigation par section |
| `AdminOverview.tsx` | Vue dashboard avec stats Bento + activite recente |
| `AdminShopsView.tsx` | Liste des boutiques avec actions (reset, lock, delete) |
| `AdminAnnouncementsView.tsx` | CRUD des annonces/notes de mise a jour |
| `AdminFeedbackInbox.tsx` | Boite de reception des feedbacks tries par type/date |
| `AdminStatCard.tsx` | Carte stat glassmorphism avec icone neon |
| `AdminActivityFeed.tsx` | Liste des dernieres actions (reparations, ventes) |
| `AnnouncementFormDialog.tsx` | Formulaire de creation/edition d'annonce |

### Composants cote boutique (proprietaires)

| Composant | Role |
|-----------|------|
| `WhatsNewModal.tsx` | Modal "Quoi de neuf ?" affichee a la premiere connexion apres une mise a jour |
| `FeedbackButton.tsx` | Bouton flottant ou dans le menu "Signaler un bug / Suggerer" |
| `FeedbackDialog.tsx` | Formulaire d'envoi de feedback (type, message) |

---

## 5. Hooks personnalises

| Hook | Role |
|------|------|
| `useAdminOverview` | Recupere stats globales + chiffre d'affaires agrege + activite recente |
| `useAnnouncements` | CRUD des annonces (admin) |
| `useLatestAnnouncement` | Recupere la derniere annonce non lue (cote boutique) |
| `useFeedback` | Envoi de feedback (boutique) + listing (admin) |
| `useLockOwner` | Mutation pour verrouiller/deverrouiller un compte |

---

## 6. Integration cote boutique

### Modal "Quoi de neuf ?"
- Au chargement du `MainLayout`, le hook `useLatestAnnouncement` verifie si une annonce non lue existe
- Si oui, affiche la modal avec les nouvelles fonctionnalites et corrections
- Quand l'utilisateur ferme la modal, un enregistrement est insere dans `announcement_reads`

### Bouton "Signaler un bug / Suggerer"
- Ajoute dans `AppSidebar.tsx` en bas, avant les parametres
- Ouvre un dialog avec : type (Bug/Suggestion), message texte
- Le nom de la boutique est auto-rempli depuis `shop_settings.shop_name`

---

## 7. Kill Switch (Verrouillage d'acces)

- Bouton "Verrouiller" dans la liste des boutiques (icone cadenas)
- Appel a l'edge function action `lock` qui :
  1. Met `profiles.is_locked = true`
  2. Ban l'utilisateur via l'API admin Supabase
- Un utilisateur banni ne peut plus se connecter
- Bouton "Deverrouiller" pour inverser
- Indicateur visuel (badge rouge "Verrouille") dans la liste

---

## 8. Securite

- La protection existante dans `ProtectedRoute.tsx` est deja en place (redirection si non platform_admin)
- Les nouvelles tables utilisent des politiques RLS strictes
- Toutes les actions admin passent par l'edge function qui verifie le role `platform_admin` via le service role key
- La verification du verrouillage (`is_locked`) sera ajoutee dans `ProtectedRoute` pour bloquer les utilisateurs verrouilles

---

## 9. Sequence d'implementation

1. Migration SQL : creer les 3 tables + colonne `is_locked` + politiques RLS
2. Mettre a jour l'edge function `admin-manage-users` (lock, unlock, revenue, activity)
3. Ajouter les classes CSS glassmorphism dans `index.css`
4. Creer les composants admin (sidebar, overview, shops, annonces, feedback)
5. Refondre `AdminDashboard.tsx` avec la nouvelle architecture
6. Creer les hooks (`useAdminOverview`, `useAnnouncements`, `useFeedback`, etc.)
7. Ajouter les composants cote boutique (`WhatsNewModal`, `FeedbackButton`, `FeedbackDialog`)
8. Integrer dans `MainLayout` et `AppSidebar`
9. Ajouter la verification `is_locked` dans `ProtectedRoute`

