## Diagnostic — pourquoi les nouvelles inscriptions sont cassées

J'ai vérifié la base : la fonction PostgreSQL `handle_new_user()` existe (elle crée correctement profil + rôle `super_admin` + `shop_settings`), **mais le trigger qui devait l'attacher à `auth.users` n'existe plus**.

Requête exécutée :
```
SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%user%' OR tgname ILIKE '%handle%';
→ 0 lignes
```

**Conséquence** : à chaque nouvelle inscription, un utilisateur est créé dans `auth.users`, mais aucun profil/rôle/paramètre n'est inséré dans le schéma public. C'est exactement ce qui s'est passé pour `coolstoresbz` hier — d'où le 403 sur la création d'employé.

Comptes actuels : 338 profils / 338 rôles / 330 shop_settings → **8 boutiques** ont aussi un `shop_settings` manquant (mêmes symptômes potentiels que coolstoresbz).

## Plan — réparer le flux de signup

### 1. Recréer le trigger sur `auth.users`

Migration SQL qui attache `handle_new_user()` à l'événement `AFTER INSERT` sur `auth.users` :

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

La fonction `handle_new_user()` est déjà correcte et fait exactement ce qu'on veut :
- Crée la ligne `profiles` (avec `verification_status = 'pending_verification'`, `is_locked = true`)
- Insère le rôle `super_admin` dans `user_roles`
- Crée `shop_settings` avec `country` + `currency` issus du formulaire d'inscription, et `onboarding_completed = false` par défaut

→ Résultat : tout futur propriétaire qui s'inscrit aura automatiquement le rôle `super_admin`, sera placé en attente de validation (Kill Switch + vérification 48 h respectés), puis après validation suivra le funnel normal (onboarding setup → checkout → dashboard).

### 2. Sauvegarde de filet (optionnelle mais recommandée)

Ajouter un garde-fou côté `AuthContext.signUp` (côté client) : juste après le `supabase.auth.signUp` réussi, faire un `select` rapide sur `user_roles` pour le user créé ; si vide après ~1s, appeler une edge function `bootstrap-profile` (à créer) qui rejoue la logique de `handle_new_user()` via le service-role. Cela protège contre une éventuelle nouvelle disparition du trigger ou un échec silencieux.

Si vous trouvez ça trop défensif, on peut sauter cette étape — le trigger seul devrait suffire.

### 3. Nettoyage des 8 boutiques actuellement sans `shop_settings`

Identifier ces utilisateurs et leur insérer une ligne `shop_settings` par défaut (`shop_name = 'Mon Atelier'`, `country = 'TN'`, `currency = 'TND'`, `onboarding_completed = false`) pour qu'elles soient propres. Sans ça, à leur prochaine connexion elles iront sur `/onboarding/setup` mais pourraient avoir d'autres bizarreries.

### 4. Test end-to-end

Faire un signup test (par exemple `test_signup_check`) via l'UI, puis vérifier en SQL que profil + rôle `super_admin` + shop_settings sont bien créés. Supprimer le compte test après.

## Détails techniques

- **Migration uniquement** (pas de changement de code applicatif sauf si vous voulez l'étape 2 défensive).
- Le trigger doit être attaché sur `auth.users`, schéma protégé. Lovable Cloud autorise ce type d'attachement spécifique car la fonction `handle_new_user()` est dans `public` (pratique standard Supabase).
- `handle_new_user()` est déjà `SECURITY DEFINER`, donc elle a les droits nécessaires pour écrire dans `public`.
- Aucun impact sur les comptes existants (le trigger ne s'exécute qu'aux futurs `INSERT`).

## Hors scope

- Modifications à l'UI d'inscription `Auth.tsx` ou au funnel `ProtectedRoute.tsx` — déjà corrects.
- Modifications à la fonction `handle_new_user()` elle-même — son contenu est correct.

## Confirmez avant que je passe en mode build

1. **OK pour recréer le trigger** sur `auth.users` ? (étape 1, indispensable)
2. **Voulez-vous le filet de sécurité** côté client (étape 2) ? — Je recommande "non" sauf si vous voulez être ceinture + bretelles.
3. **OK pour réparer les 8 boutiques orphelines** sans `shop_settings` (étape 3) ?
