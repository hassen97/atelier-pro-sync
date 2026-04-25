# Rappels de complétion de la boutique

Objectif : pousser les ~30 propriétaires existants (et tous les futurs) qui n'ont pas terminé `onboarding_completed = true` à finaliser la configuration de leur atelier — via l'app **et** par email.

## Ce qui sera ajouté

### 1. Rappel in-app (combiné)

- **Modal au premier login du jour** sur `/dashboard` si la config est incomplète. Fermable (`localStorage` clé du jour). Bouton « Compléter ma boutique » → `/onboarding/setup`.
- **Bannière persistante** en haut du dashboard tant que `onboarding_completed = false`, non fermable, avec bouton d'action.
- Aujourd'hui, `ProtectedRoute` redirige déjà vers `/onboarding/setup` si non complété — mais l'utilisateur peut quitter en cours de route, donc le rappel reste utile au retour.

### 2. Email manuel (rattrapage existants)

Bouton **« Envoyer rappel à tous les comptes incomplets »** dans **Admin → Paramètres** :

- Liste les `super_admin` avec `onboarding_completed = false` ET email valide.
- Affiche le compteur (ex : « 27 propriétaires concernés »).
- Confirmation avant envoi.
- Anti-doublon : champ `last_onboarding_reminder_sent_at` sur `shop_settings` — n'envoie pas si rappel < 3 jours.

### 3. Email automatique (futurs inscrits)

- Cron quotidien (`pg_cron` à 10h) qui envoie un email aux comptes :
  - `super_admin`, email présent, `onboarding_completed = false`
  - inscrits depuis ≥ 2 jours (premier rappel) ou ≥ 7 jours (deuxième rappel)
  - dernier rappel envoyé > 3 jours
- Limite : max 2 rappels par compte (champ `onboarding_reminders_sent` int).

### 4. Email template

Nouveau template React Email **« Terminez la configuration de votre boutique »** :

- Branding RepairPro (cohérent avec les templates auth existants).
- Texte court : « Votre compte est actif mais votre atelier n'est pas configuré. Ajoutez votre logo, contact et horaires en 2 minutes pour que vos clients voient une page de suivi professionnelle. »
- CTA → `https://www.getheavencoin.com/onboarding/setup`.
- Lien désinscription standard.

## Détails techniques

**Migration DB**

```sql
ALTER TABLE shop_settings 
  ADD COLUMN last_onboarding_reminder_sent_at timestamptz,
  ADD COLUMN onboarding_reminders_sent int NOT NULL DEFAULT 0;
```

**Nouvelle Edge Function : `send-onboarding-reminder**`

- POST `{ mode: "manual" | "auto" }`
- `manual` : auth platform_admin requis, traite tous les éligibles immédiatement.
- `auto` : appelée par cron avec service role, applique la règle J+2 / J+7.
- Pour chaque destinataire :
  - Crée un `email_unsubscribe_tokens`.
  - `enqueue_email` dans `transactional_emails` avec template `onboarding-reminder`.
  - Met à jour `last_onboarding_reminder_sent_at` + incrémente `onboarding_reminders_sent`.
  - Log dans `email_send_log`.
- Retourne `{ queued: N, skipped: M }`.

**Cron** (via SQL insert tool, pas migration) :

```sql
SELECT cron.schedule(
  'onboarding-reminder-daily', '0 10 * * *',
  $$ SELECT net.http_post(
    url := 'https://rgikflkocotkljbajzrb.supabase.co/functions/v1/send-onboarding-reminder',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_KEY>"}'::jsonb,
    body := '{"mode":"auto"}'::jsonb
  ); $$
);
```

**Template email** : `supabase/functions/_shared/email-templates/onboarding-reminder.tsx` + dispatch dans `process-email-queue` (label `onboarding-reminder`).

**UI** :

- `src/components/onboarding/OnboardingReminderBanner.tsx` — bannière dashboard.
- `src/components/onboarding/OnboardingReminderModal.tsx` — modal au login (clé `onboarding-reminder-dismissed-YYYY-MM-DD`).
- Intégration dans `src/pages/Dashboard.tsx` (montés conditionnellement si `super_admin` + `!onboarding_completed`).
- `src/components/admin/AdminSettingsView.tsx` — nouvelle carte « Rappels de configuration » avec compteur live + bouton d'envoi.

## Fichiers touchés

- `supabase/migrations/<new>.sql` (2 colonnes)
- `supabase/functions/send-onboarding-reminder/index.ts` (nouveau)
- `supabase/functions/_shared/email-templates/onboarding-reminder.tsx` (nouveau)
- `supabase/functions/process-email-queue/index.ts` (ajout du label)
- `src/components/onboarding/OnboardingReminderBanner.tsx` (nouveau)
- `src/components/onboarding/OnboardingReminderModal.tsx` (nouveau)
- `src/pages/Dashboard.tsx` (montage conditionnel)
- `src/components/admin/AdminSettingsView.tsx` (carte admin + bouton)
- Insert SQL pour le cron `pg_cron`

## Hors périmètre

- Pas de rappel SMS/WhatsApp (peut être ajouté plus tard).
- Pas de rappel pour les comptes sans email enregistré (~5 comptes) — ils verront seulement le rappel in-app.