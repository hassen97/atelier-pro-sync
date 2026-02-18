

# Tableau de bord Ultra Super Admin

## Objectif

Creer un nouveau role **`platform_admin`** et un tableau de bord dedie pour vous (le proprietaire de la plateforme) permettant de :

- Voir la liste de tous les proprietaires de boutiques inscrits
- Voir les statistiques globales (nombre de boutiques, d'employes, de reparations...)
- Supprimer un proprietaire de boutique (et ses donnees)
- Reinitialiser le mot de passe d'un proprietaire
- Creer manuellement un nouveau compte proprietaire

Ce dashboard est completement separe de l'interface des proprietaires de boutiques et uniquement accessible par vous.

## Comment ca marche

1. Vous vous connectez avec votre compte plateforme
2. Le systeme detecte votre role `platform_admin` et affiche le dashboard admin au lieu du dashboard boutique
3. Vous voyez la liste de tous les proprietaires avec leurs infos (nom, username, date d'inscription, nombre d'employes)
4. Vous pouvez chercher, supprimer, reinitialiser le mot de passe ou creer un nouveau proprietaire

## Details techniques

### 1. Nouveau role dans l'enum `app_role`

Ajouter `platform_admin` a l'enum existant :

```sql
ALTER TYPE app_role ADD VALUE 'platform_admin';
```

Attribuer ce role a votre compte (une seule fois via migration).

### 2. Nouvelle Edge Function : `admin-manage-users`

Fonction backend securisee qui verifie que l'appelant a le role `platform_admin` avant d'executer toute action :

- **GET** : Liste tous les profils avec leur role, date d'inscription, et nombre de membres d'equipe
- **POST (action: delete)** : Supprime un utilisateur via `auth.admin.deleteUser`
- **POST (action: reset-password)** : Reinitialise le mot de passe via `auth.admin.updateUserById`
- **POST (action: create)** : Cree un nouveau compte proprietaire via `auth.admin.createUser`

### 3. Nouvelles pages et composants

| Fichier | Description |
|---|---|
| `src/pages/AdminDashboard.tsx` | Page principale avec statistiques globales et liste des proprietaires |
| `src/hooks/useAdmin.ts` | Hooks pour appeler la fonction backend (liste, suppression, reset, creation) |
| `src/components/admin/ShopOwnersList.tsx` | Tableau des proprietaires avec actions (supprimer, reset mot de passe) |
| `src/components/admin/AdminStats.tsx` | Cartes statistiques (total boutiques, employes, reparations) |
| `src/components/admin/CreateOwnerDialog.tsx` | Dialog pour creer un nouveau proprietaire |
| `src/components/admin/ResetPasswordDialog.tsx` | Dialog pour reinitialiser un mot de passe |

### 4. Routing et navigation

- Nouvelle route `/admin` protegee, accessible uniquement si `role === 'platform_admin'`
- Redirection automatique : si platform_admin se connecte, il est redirige vers `/admin` au lieu de `/`
- Sidebar adaptee : l'admin plateforme voit uniquement les liens admin, pas les liens boutique

### 5. Securite

- Le role `platform_admin` est verifie cote serveur dans la Edge Function (jamais cote client uniquement)
- L'Edge Function utilise `SUPABASE_SERVICE_ROLE_KEY` pour les operations admin
- Aucun proprietaire de boutique ne peut acceder a `/admin` -- la route redirige vers `/` si le role ne correspond pas
- Le role `platform_admin` ne peut pas etre attribue depuis l'interface -- uniquement via migration SQL directe

### 6. Fichiers modifies

| Fichier | Modification |
|---|---|
| Migration SQL | Ajouter `platform_admin` a l'enum, attribuer le role a votre compte |
| `supabase/functions/admin-manage-users/index.ts` | Nouvelle Edge Function pour gerer les utilisateurs |
| `supabase/config.toml` | Enregistrer la nouvelle fonction |
| `src/pages/AdminDashboard.tsx` | Nouvelle page admin |
| `src/hooks/useAdmin.ts` | Hooks pour les operations admin |
| `src/components/admin/ShopOwnersList.tsx` | Liste des proprietaires |
| `src/components/admin/AdminStats.tsx` | Statistiques globales |
| `src/components/admin/CreateOwnerDialog.tsx` | Creation de proprietaire |
| `src/components/admin/ResetPasswordDialog.tsx` | Reset mot de passe |
| `src/App.tsx` | Ajouter la route `/admin` |
| `src/hooks/useTeam.ts` | Ajouter hook `useIsPlatformAdmin` |
| `src/components/auth/ProtectedRoute.tsx` | Redirection admin vers `/admin` |

