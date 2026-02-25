

# Controle d'acces a l'inventaire et historique d'activites

## Ce qui change pour l'utilisateur

### 1. Verrouillage de l'inventaire pour les employes
Le proprietaire de la boutique pourra activer un mode "Inventaire protege" dans les parametres. Quand ce mode est actif :
- Les employes ne pourront **ni ajouter, ni modifier, ni supprimer** de produits
- Le proprietaire pourra generer un **code temporaire** (valable quelques heures) pour autoriser ponctuellement un employe a modifier l'inventaire
- L'employe devra entrer ce code via un dialogue avant de pouvoir effectuer des modifications

### 2. Historique d'activites de la boutique
Un nouvel onglet "Historique" sera accessible depuis la page Inventaire (sous forme de tabs) ou depuis la sidebar. Il affichera un journal chronologique de toutes les activites :
- Ventes effectuees (produit, quantite, montant, date)
- Modifications d'inventaire (ajout/suppression de produit, ajustement de stock)
- Qui a effectue chaque action (proprietaire ou employe)

## Fonctionnement

**Verrouillage inventaire :**
- Dans Parametres > Boutique, un switch "Proteger l'inventaire" apparait
- Quand active, un bouton "Generer un code temporaire" apparait
- Le code est un code a 6 chiffres, stocke en base avec une expiration (ex: 4 heures)
- Sur la page Inventaire, les employes voient les boutons de modification desactives avec un cadenas
- Un bouton "Deverrouiller" leur permet d'entrer le code temporaire pour obtenir l'acces

**Historique :**
- Une nouvelle table `activity_log` enregistre les evenements
- Des triggers sur les tables `products`, `sales`, `sale_items` inserent automatiquement dans cette table
- La page affiche les entrees avec filtres par type et par date

## Details techniques

### 1. Migration base de donnees

**Table `inventory_access_codes` :**
```text
id          uuid     PK default gen_random_uuid()
user_id     uuid     NOT NULL (le proprietaire)
code        text     NOT NULL
expires_at  timestamptz NOT NULL
used_by     uuid     NULL
used_at     timestamptz NULL
created_at  timestamptz default now()
```
RLS : proprietaire peut tout gerer, employes (via is_team_member) peuvent SELECT pour verifier un code.

**Table `activity_log` :**
```text
id          uuid     PK default gen_random_uuid()
user_id     uuid     NOT NULL (proprietaire de la boutique)
actor_id    uuid     NULL (qui a fait l'action)
action      text     NOT NULL (ex: 'product_created', 'product_updated', 'stock_adjusted', 'product_deleted', 'sale_completed')
entity_type text     NOT NULL (ex: 'product', 'sale')
entity_id   uuid     NULL
details     jsonb    NULL (infos complementaires)
created_at  timestamptz default now()
```
RLS : proprietaire et equipe peuvent SELECT. Insertion via triggers (SECURITY DEFINER).

**Colonne `inventory_locked` sur `shop_settings` :**
- Type `boolean`, default `false`

**Triggers :**
- Trigger sur `products` (INSERT/UPDATE/DELETE) pour logger dans `activity_log`
- Trigger sur `sales` (INSERT) pour logger les ventes

### 2. Nouveau hook: `src/hooks/useInventoryAccess.ts`
- `useInventoryLocked()` : lit `shop_settings.inventory_locked`
- `useGenerateAccessCode()` : mutation pour creer un code temporaire (6 chiffres, expire dans 4h)
- `useVerifyAccessCode()` : mutation pour verifier un code saisi par un employe
- `useIsInventoryUnlocked()` : state local + verification si l'utilisateur est proprietaire OU a un code valide

### 3. Nouveau hook: `src/hooks/useActivityLog.ts`
- `useActivityLog()` : query pour recuperer les activites avec pagination et filtres (type, date)
- Joint les profils pour afficher le nom de l'acteur

### 4. Fichier: `src/pages/Inventory.tsx`
- Ajouter des Tabs : "Stock" (contenu actuel) et "Historique"
- Dans l'onglet Stock : si `inventoryLocked` et utilisateur est employe sans code valide, desactiver les boutons (Nouveau produit, Modifier, Supprimer, Ajuster stock)
- Afficher un bouton "Deverrouiller" avec icone cadenas qui ouvre un dialogue de saisie de code
- Dans l'onglet Historique : afficher la liste des activites avec badges par type

### 5. Nouveau composant: `src/components/inventory/InventoryUnlockDialog.tsx`
- Dialogue avec un input pour saisir le code a 6 chiffres
- Appel a `useVerifyAccessCode` pour valider
- Si valide, stocke le deveouillage en state (session React, pas localStorage pour la securite)

### 6. Nouveau composant: `src/components/inventory/ActivityLogTab.tsx`
- Liste des activites avec icones par type
- Filtres par type d'action et par plage de dates
- Affiche : date/heure, acteur, action, details

### 7. Fichier: `src/pages/Settings.tsx`
- Dans la section Boutique, ajouter :
  - Switch "Proteger l'inventaire (employes)"
  - Bouton "Generer un code temporaire" (visible quand le switch est active)
  - Affichage du code genere avec son expiration

### 8. Fichier: `src/hooks/useShopSettings.ts`
- Ajouter `inventory_locked: boolean` a l'interface `ShopSettings`

