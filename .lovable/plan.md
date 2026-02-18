

# Gestion des Employes - Equipe et Permissions

## Vue d'ensemble

Transformer l'onglet "Utilisateurs" en un systeme complet de gestion d'equipe. Vous (le proprietaire) pourrez inviter vos 3 travailleurs par leur nom d'utilisateur, definir quelles pages chacun peut voir, et leur assigner des taches.

---

## Architecture

Actuellement, chaque utilisateur a ses propres donnees isolees. Le changement principal : vos employes pourront acceder aux donnees de VOTRE boutique (pas les leurs), avec des restrictions par page.

```text
┌──────────────────────────────────────────────────────────┐
│  PROPRIETAIRE (vous) - super_admin                       │
│  ├── Toutes les donnees de la boutique                   │
│  ├── Acces a toutes les pages                            │
│  └── Gestion de l'equipe                                 │
│                                                          │
│  EMPLOYE 1 (ex: "ahmed")                                 │
│  ├── Voit les donnees du proprietaire                    │
│  ├── Acces: POS, Reparations, Stock seulement            │
│  └── Taches assignees par le proprietaire                │
│                                                          │
│  EMPLOYE 2 (ex: "sami")                                  │
│  ├── Voit les donnees du proprietaire                    │
│  ├── Acces: POS seulement                                │
│  └── Taches assignees par le proprietaire                │
└──────────────────────────────────────────────────────────┘
```

---

## Etape 1 : Nouvelles tables en base de donnees

### Table `team_members`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Cle primaire |
| owner_id | uuid | L'ID du proprietaire (vous) |
| member_user_id | uuid | L'ID de l'employe invite |
| role | app_role | Role (employee, manager, admin) |
| allowed_pages | text[] | Pages autorisees (ex: ['/pos', '/repairs']) |
| status | text | 'active' ou 'removed' |
| created_at | timestamptz | Date d'ajout |

### Table `team_tasks`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Cle primaire |
| owner_id | uuid | Proprietaire qui cree la tache |
| assigned_to | uuid | Employe assigne |
| title | text | Titre de la tache |
| description | text | Details (optionnel) |
| status | text | 'pending', 'in_progress', 'done' |
| due_date | date | Date limite (optionnel) |
| created_at | timestamptz | Date de creation |

### Mise a jour du role du proprietaire

Mettre a jour votre role dans `user_roles` de `employee` a `super_admin` pour que vous puissiez gerer l'equipe.

---

## Etape 2 : Politiques RLS pour le partage de donnees

Ajouter sur CHAQUE table de donnees (products, repairs, sales, customers, suppliers, expenses, invoices, categories, sale_items, repair_parts) une politique supplementaire :

```sql
-- Permettre aux membres d'equipe actifs d'acceder aux donnees du proprietaire
CREATE POLICY "Team members can access owner data"
ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = products.user_id
      AND member_user_id = auth.uid()
      AND status = 'active'
  )
);
```

Une fonction `security definer` sera creee pour verifier l'appartenance a une equipe et eviter les recursions :

```sql
CREATE FUNCTION public.is_team_member(_owner_id uuid, _member_id uuid)
RETURNS boolean ...
```

---

## Etape 3 : Hook useTeam

Creer `src/hooks/useTeam.ts` :

- `useTeamMembers()` - lister les membres de l'equipe (pour le proprietaire)
- `useAddTeamMember()` - inviter un employe par nom d'utilisateur
- `useRemoveTeamMember()` - retirer un employe
- `useUpdateMemberPermissions()` - modifier les pages autorisees / role
- `useMyTeamInfo()` - pour un employe, savoir s'il fait partie d'une equipe et quelles pages sont autorisees
- `useTeamTasks()` - lister les taches (filtrees par employe ou toutes pour le proprietaire)
- `useCreateTask()` / `useUpdateTask()` / `useDeleteTask()` - CRUD taches

---

## Etape 4 : Interface "Utilisateurs" dans les parametres

Remplacer le placeholder actuel par une interface complete :

```text
┌─────────────────────────────────────────────────────────────┐
│  Gestion de l'equipe                                        │
│                                                             │
│  [Inviter un employe]                                       │
│  Nom d'utilisateur: [____________] [Rechercher]             │
│                                                             │
│  ── Membres de l'equipe ──                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────┐      │
│  │ Ahmed Ben Ali          Role: [Employe v]          │      │
│  │ @ahmed123                                         │      │
│  │                                                   │      │
│  │ Pages autorisees:                                 │      │
│  │ [x] Tableau de bord  [x] Point de Vente          │      │
│  │ [x] Reparations      [ ] Stock                    │      │
│  │ [ ] Clients           [ ] Fournisseurs            │      │
│  │ [ ] Depenses          [ ] Dettes Clients          │      │
│  │ [ ] Factures          [ ] Statistiques            │      │
│  │ [ ] Profit            [ ] Parametres              │      │
│  │                                                   │      │
│  │ [Enregistrer]                    [Retirer 🔴]     │      │
│  └───────────────────────────────────────────────────┘      │
│                                                             │
│  ── Taches ──                                               │
│                                                             │
│  [+ Nouvelle tache]                                         │
│  ┌───────────────────────────────────────────────────┐      │
│  │ Reparer iPhone 12 ecran      Assigne: Ahmed       │      │
│  │ Statut: [En cours v]         Echeance: 20/02      │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Etape 5 : Filtrage dynamique du Sidebar

Modifier `AppSidebar.tsx` :

- Creer un hook `useAllowedPages()` qui retourne les pages autorisees
- Si l'utilisateur est proprietaire (super_admin) ou n'est pas dans une equipe : toutes les pages
- Si l'utilisateur est membre d'une equipe : filtrer le menu `navigation` selon `allowed_pages`
- Le tableau de bord (/) est toujours accessible

---

## Etape 6 : Protection des routes

Modifier `ProtectedRoute.tsx` ou creer un nouveau composant `TeamRouteGuard` :

- Verifier si l'utilisateur a acces a la page actuelle
- Si non autorise, rediriger vers le tableau de bord avec un toast "Acces non autorise"

---

## Etape 7 : Vue employe - Mes taches

Les employes verront une section "Mes taches" sur leur tableau de bord :

- Liste des taches qui leur sont assignees
- Possibilite de changer le statut (En attente -> En cours -> Termine)
- Indicateur visuel pour les taches en retard

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/hooks/useTeam.ts` | Hook complet pour gestion equipe + taches |
| `src/components/settings/TeamManagement.tsx` | Interface gestion des membres |
| `src/components/settings/TaskManagement.tsx` | Interface gestion des taches |
| `src/components/settings/AddMemberDialog.tsx` | Dialog pour inviter un employe |
| `src/components/dashboard/MyTasks.tsx` | Widget taches pour le dashboard employe |

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/Settings.tsx` | Remplacer placeholder par TeamManagement + TaskManagement |
| `src/components/layout/AppSidebar.tsx` | Filtrer navigation selon permissions |
| `src/components/auth/ProtectedRoute.tsx` | Ajouter verification des pages autorisees |
| `src/pages/Dashboard.tsx` | Ajouter section "Mes taches" pour les employes |

## Migrations DB

1. Creer table `team_members` avec RLS
2. Creer table `team_tasks` avec RLS
3. Creer fonction `is_team_member()`
4. Ajouter politiques RLS sur toutes les tables de donnees existantes
5. Mettre a jour votre role en `super_admin`

---

## Details techniques

### Fonction is_team_member

```sql
CREATE OR REPLACE FUNCTION public.is_team_member(_owner_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = _owner_id
      AND member_user_id = _member_id
      AND status = 'active'
  )
$$;
```

### Politique RLS type (ajoutee a chaque table)

```sql
CREATE POLICY "Team members can access owner data"
ON public.products FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR is_team_member(user_id, auth.uid())
);
```

Les politiques existantes `auth.uid() = user_id` seront remplacees par cette version elargie qui inclut les membres d'equipe.

### Recherche d'employe par username

```typescript
const searchUser = async (username: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('user_id, username, full_name')
    .ilike('username', username)
    .limit(5);
  return data;
};
```

Note : une politique RLS SELECT limitee sera ajoutee sur `profiles` pour permettre la recherche par username (uniquement les champs username et full_name).

### Flux d'invitation

1. Le proprietaire tape le nom d'utilisateur
2. Recherche dans la table profiles
3. Affiche le resultat avec le nom complet
4. Le proprietaire selectionne les pages et le role
5. Insertion dans `team_members`
6. L'employe voit immediatement les donnees partagees a sa prochaine connexion

