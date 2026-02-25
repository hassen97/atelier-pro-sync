

# Fix: Creation de comptes employes

## Problemes identifies

### 1. Methode d'authentification inexistante dans l'Edge Function
La fonction `create-employee` utilise `anonClient.auth.getClaims(token)` qui **n'existe pas** dans le client Supabase JS v2. Cela provoque une erreur a chaque appel, rendant la creation d'employes totalement impossible.

**Correction** : Remplacer par `anonClient.auth.getUser(token)` qui est la methode correcte pour valider un token et recuperer l'ID utilisateur.

### 2. Validation du mot de passe incoherente
Le formulaire frontend accepte les mots de passe de **6 caracteres minimum**, mais le schema Zod dans l'Edge Function exige **8 caracteres minimum**. Un employe peut donc remplir le formulaire sans erreur visible, mais la creation echoue cote serveur.

**Correction** : Aligner le frontend sur la regle du backend (8 caracteres minimum).

## Details techniques

### Fichier: `supabase/functions/create-employee/index.ts`
- Remplacer `getClaims(token)` par `getUser(token)` (lignes 39-48)
- Adapter l'extraction de l'ID utilisateur : `claimsData.claims.sub` devient `userData.user.id`

### Fichier: `src/components/settings/AddMemberDialog.tsx`
- Changer la validation du mot de passe de `password.length >= 6` a `password.length >= 8`
- Mettre a jour le placeholder "Min 6 caracteres" en "Min 8 caracteres"

