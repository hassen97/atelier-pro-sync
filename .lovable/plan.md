# Notifier la liste d'attente + cadeau d'essai Pro 3 jours

39 emails sont actuellement enregistrés dans la table `waitlist`. On va leur envoyer un email "Bonne nouvelle, RepairPro est ouvert", et leur offrir automatiquement **3 jours d'essai du plan Pro** dès leur inscription.

## Ce que voit l'utilisateur final

1. Reçoit un email "🎉 Votre place est confirmée — 3 jours d'essai Pro offerts"
2. Clique sur le bouton → arrive sur la page d'inscription pré-remplie avec son email
3. Crée son compte normalement (username + mot de passe + boutique)
4. Le système détecte que son email est dans la waitlist → **active automatiquement un abonnement Pro pendant 3 jours**
5. Voit une bannière de bienvenue "Votre cadeau : 3 jours Pro offerts (expire le …)"

## Ce que voit l'admin

Dans **Admin → Paramètres**, nouvelle carte :

- Compteur live : "39 inscrits sur la waitlist · 39 jamais notifiés"
- Bouton "Envoyer l'invitation à 39 personnes" (avec confirmation)
- Compteur après envoi : combien ont déjà créé un compte / combien ont activé leur trial

## Détails techniques

### Base de données
Sur la table `waitlist`, ajouter :
- `notified_at` (timestamptz) — date d'envoi de l'email d'invitation
- `signed_up_user_id` (uuid) — ID du compte créé une fois inscrit
- `trial_granted_at` (timestamptz) — date d'activation de l'essai Pro

### Edge function `notify-waitlist`
- Mode `manual` (déclenché par l'admin) — itère sur les entrées `notified_at IS NULL`
- Génère un token unique → URL d'inscription `/auth?invite={token}&email={email}`
- Enqueue dans `transactional_emails` via le système d'emails existant
- Marque `notified_at = now()`
- Anti-spam : ne renvoie jamais 2 fois à la même adresse

### Email
Nouveau template `waitlist-invitation.tsx` :
- Sujet : "🎉 Votre place est confirmée — 3 jours Pro offerts"
- Message : remerciement, annonce du lancement, mention du cadeau (3 jours Pro), bouton CTA "Créer mon compte maintenant"
- Lien de désabonnement standard

### Activation automatique du trial
Dans `handle_new_user` (trigger Supabase), après création de la boutique :
- Si l'email du nouvel utilisateur existe dans `waitlist` → créer une ligne dans `shop_subscriptions` avec :
  - `plan_id` = ID du plan "🔥 Pro"
  - `status = 'active'`
  - `started_at = now()`
  - `expires_at = now() + 3 days`
- Lier `waitlist.signed_up_user_id` et `waitlist.trial_granted_at`

### Bannière in-app
Composant `WaitlistTrialBanner` sur le Dashboard (visible uniquement pendant les 3 jours d'essai issus du cadeau) :
- "🎁 Cadeau de bienvenue : 3 jours Pro offerts — expire dans X heures"
- Bouton "Voir les plans" pour passer à un abonnement payant avant expiration

### Composant Admin
`WaitlistInvitationsAdminCard` placée au-dessus des autres cartes de rappel dans `AdminSettingsView.tsx` :
- 4 stats : total waitlist, jamais notifiés, déjà notifiés, ont créé leur compte
- Bouton manuel d'envoi avec dialogue de confirmation

## Fichiers créés / modifiés

- `supabase/migrations/...sql` — colonnes waitlist + trigger d'activation trial
- `supabase/functions/notify-waitlist/index.ts` — nouvelle edge function
- `supabase/functions/_shared/email-templates/waitlist-invitation.tsx` — template email
- `src/components/admin/WaitlistInvitationsAdminCard.tsx` — carte admin
- `src/components/dashboard/WaitlistTrialBanner.tsx` — bannière in-app
- `src/components/admin/AdminSettingsView.tsx` — intégration carte
- `src/pages/Dashboard.tsx` — intégration bannière
- `src/pages/Auth.tsx` — pré-remplissage email depuis `?email=` query param

## Hors scope

- Pas de cron automatique (envoi manuel uniquement, déclenché par l'admin)
- Pas de modification du système de paiement existant — le trial expire et bascule simplement en compte gratuit
