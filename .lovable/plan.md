
# Permettre au proprietaire de creer le compte de l'employe

## Objectif

Le proprietaire pourra creer directement le compte d'un employe depuis **Parametres > Gestion de l'equipe**, en renseignant le nom, le username et le mot de passe. L'employe n'aura plus besoin de s'inscrire lui-meme -- il se connecte directement avec les identifiants fournis par son patron.

## Comment ca marche

1. Le proprietaire clique sur "Inviter un employe"
2. Il choisit entre **rechercher un utilisateur existant** ou **creer un nouveau compte**
3. S'il cree un compte : il entre le nom complet, le username et le mot de passe
4. Le systeme cree le compte, l'ajoute automatiquement a l'equipe avec les permissions choisies
5. Le proprietaire communique les identifiants a l'employe

## Details techniques

### 1. Nouvelle fonction backend (Edge Function)

Creer `supabase/functions/create-employee/index.ts` :

- Recoit : `fullName`, `username`, `password`, `role`, `allowedPages`
- Verifie que l'appelant est authentifie et a le role `super_admin`
- Utilise l'API admin Supabase (`supabase.auth.admin.createUser`) pour creer le compte avec l'email interne `username@repairpro.local`
- Le trigger `handle_new_user` cree automatiquement le profil, le role `super_admin` et les parametres boutique
- Corrige le role en `employee` dans `user_roles` (car le trigger met `super_admin` par defaut)
- Insere une ligne dans `team_members` pour lier l'employe au proprietaire
- Retourne le user ID cree

### 2. Modification du dialog d'ajout (AddMemberDialog.tsx)

- Ajouter un toggle/tabs pour basculer entre "Rechercher" et "Creer un compte"
- Mode "Creer un compte" : formulaire avec champs nom complet, username, mot de passe, confirmation mot de passe
- Validation identique a la page d'inscription (3-20 caracteres alphanumeriques, mot de passe >= 6 caracteres)
- Appel a la fonction backend au lieu de l'insertion directe dans `team_members`

### 3. Fichiers modifies

| Fichier | Modification |
|---|---|
| `supabase/functions/create-employee/index.ts` | Nouvelle fonction backend pour creer un compte employe |
| `src/components/settings/AddMemberDialog.tsx` | Ajout du formulaire de creation de compte + appel a la fonction |
| `src/hooks/useTeam.ts` | Nouveau hook `useCreateEmployee` pour appeler la fonction backend |

### 4. Securite

- La fonction backend verifie le role `super_admin` de l'appelant cote serveur (pas cote client)
- Le mot de passe est transmis via HTTPS et jamais stocke cote client
- L'employe cree n'a pas acces aux parametres boutique ni aux donnees d'autres proprietaires grace au RLS
