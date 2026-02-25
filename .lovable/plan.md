
# Ajout de l'heure sur le recu et texte de garantie personnalisable

## Ce qui change pour l'utilisateur

1. **Heure sur le recu** : Le recu affichera desormais la date ET l'heure (ex: "25/02/2026 07:55") au lieu de seulement la date.

2. **Texte de garantie personnalisable** : Un nouveau champ dans les parametres de la boutique permettra de modifier le texte de garantie/conditions qui apparait en bas du recu. Le texte par defaut restera celui actuel mais sera entierement modifiable.

## Fonctionnement

- Dans **Parametres > Boutique**, un nouveau champ texte (textarea) "Texte de garantie / conditions du recu" apparaitra
- Le texte saisi sera sauvegarde dans la base de donnees et utilise dans tous les recus generes
- Si le champ est vide, le texte par defaut sera utilise

## Details techniques

### 1. Migration base de donnees
Ajouter une colonne `receipt_terms` (type `text`, nullable, defaut `null`) a la table `shop_settings`.

### 2. Fichier: `src/hooks/useShopSettings.ts`
- Ajouter `receipt_terms: string | null` a l'interface `ShopSettings`
- Ajouter `receipt_terms: null` aux `defaultSettings`

### 3. Fichier: `src/pages/Settings.tsx`
- Ajouter un champ `Textarea` dans la section boutique pour editer `receipt_terms`
- Label: "Conditions / Garantie (recu)"
- Placeholder avec le texte par defaut

### 4. Fichier: `src/lib/receiptPdf.ts`
- **Heure**: Ajouter une ligne "Heure" apres la ligne "Date" dans la section ID/date, en utilisant `data.time` (nouveau champ optionnel)
- **Texte de garantie**: Remplacer le tableau `terms` en dur par `settings.receipt_terms`. Si present, decouper le texte par lignes (`split('\n')`). Sinon, utiliser le texte par defaut actuel.
- Ajouter `time?: string` a l'interface `ReceiptData`

### 5. Fichier: `src/pages/POS.tsx`
- Passer `time: new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })` dans les appels a `generateThermalReceipt`

### 6. Fichier: `src/components/repairs/RepairReceiptDialog.tsx`
- Passer `time` de la meme maniere dans l'appel a `generateThermalReceipt`
