
# Inventaire Scanner-First : Plan Complet

## Résumé des 6 fonctionnalités

1. **Architecture multi-codes-barres** : champ `sku` devient un tableau de texte `barcodes text[]`
2. **Barre de scan globale intelligente** : auto-focus, popover "Quick Add", sons, animation pulse
3. **Tiroir latéral produit** : Sheet au lieu du Dialog, tags SKU multi-codes, marge réactive
4. **Générateur de déclinaisons (Matrix Builder)** : combinaisons modèles × attributs, saisie clavier
5. **Générateur de SKU interne + impression étiquette thermique** : JsBarcode, format 50×30mm
6. **UX Zéro-Souris** : retour focus automatique après chaque action

---

## 1. Migration base de données

### Colonne `barcodes text[]` sur `products`

La colonne `sku` existante sera conservée pour la compatibilité, mais on ajoute une nouvelle colonne `barcodes text[]` (nullable, default `'{}'`). Les données `sku` existantes seront migrées vers `barcodes[0]`.

```text
ALTER TABLE products 
  ADD COLUMN barcodes text[] NOT NULL DEFAULT '{}';

UPDATE products 
  SET barcodes = ARRAY[sku] 
  WHERE sku IS NOT NULL AND sku <> '';
```

Le trigger `log_product_activity` sera mis à jour pour inclure les barcodes dans les détails.

---

## 2. Mise à jour des types TypeScript

### `src/hooks/useProducts.ts`
- Ajouter `barcodes: string[]` dans les types `Product`, `ProductInsert`, `ProductUpdate`
- La recherche par scan doit maintenant utiliser `barcodes @> ARRAY[code]` (opérateur "contains")
- Conserver `sku` pour rétro-compatibilité

---

## 3. Nouveau composant : Barre de Scan Globale

### `src/components/inventory/SmartScanBar.tsx` (nouveau)

**Comportement :**
- `autoFocus` + `ref` pour reprendre le focus après chaque action
- `onKeyDown` sur `Enter` : déclenche la logique de scan
- Si code **connu** (trouvé dans `barcodes[]` d'un produit) :
  - `updateStock.mutate({ id, quantity: stock + 1 })`
  - Jouer un son "beep succès" (Audio API, fichier `public/sounds/beep-success.mp3`)
  - Ouvrir un `Popover` ancré à la barre avec le nom du produit et le nouveau stock
  - Signaler l'ID du produit via `onProductScanned(id)` pour l'animation pulse
- Si code **inconnu** :
  - Jouer un son "alerte" (Audio API, fichier `public/sounds/beep-error.mp3`)
  - Ouvrir le tiroir "Nouveau produit" avec le code pré-rempli dans les tags
  - Signaler via `onUnknownBarcode(code)`

**Sons :** Générés en JavaScript via `AudioContext` (oscillateur) — pas besoin de fichiers MP3 externes.

---

## 4. Nouveau composant : Tiroir Produit (Sheet)

### `src/components/inventory/ProductSheet.tsx` (nouveau)

Remplace `ProductDialog.tsx` pour les nouvelles interactions. L'ancien `ProductDialog` reste pour les cas d'édition depuis le tableau.

**Caractéristiques :**
- `Sheet` (tiroir droite) depuis `@/components/ui/sheet`
- Champ SKU remplacé par un **tag input** : liste de chips + input pour ajouter un code. Les tags sont stockés dans `form.watch("barcodes")` (array).
  - Appuyer sur `Enter` dans l'input ajoute le code comme tag
  - Cliquer le ×  sur un tag le supprime
  - Scanning depuis la barre avec tiroir ouvert → ajouter automatiquement le code scanné aux tags
- **Marge réactive** : `useWatch` sur `cost_price` et `sell_price` → formule `((sell - cost) / sell) * 100`
- Bouton **"Générer SKU Interne"** : génère `SHOP-{timestamp_court}`, l'ajoute aux tags
- Bouton **"🖨️ Imprimer l'étiquette"** : ouvre le dialog d'impression thermique

---

## 5. Nouveau composant : Impression Étiquette Thermique

### `src/components/inventory/LabelPrintDialog.tsx` (nouveau)

**Logique :**
- Import dynamique de `jsbarcode` (lazy loading comme jsPDF pour les performances)
- Canvas caché pour générer le code-barres via `JsBarcode(canvas, barcode)`
- Vue d'impression CSS `@media print` avec `@page { size: 50mm 30mm }`
- Contenu : Nom boutique (depuis `ShopSettingsContext`), Nom produit, Barcode image, Prix en DT
- `window.print()` déclenché au clic

---

## 6. Nouveau composant : Générateur de Déclinaisons

### `src/components/inventory/VariationMatrixDialog.tsx` (nouveau)

**Flux utilisateur :**
1. L'utilisateur entre plusieurs "Modèles" (tags) et plusieurs "Attributs" (tags)
2. Cliquer "Générer" crée un tableau N×M de combinaisons (ex: iPhone 13 + Noir, iPhone 13 + Bleu, iPhone 14 + Noir…)
3. Chaque ligne a : Nom (auto-généré), input Barcode, Prix d'achat, Prix de vente
4. Keyboard flow : `Enter` dans la colonne Barcode → focus sur la ligne suivante via `ref` array
5. Bouton "Enregistrer tout" → `createProduct.mutateAsync` pour chaque ligne

---

## 7. Animation "Pulse Néon Bleu"

### `src/index.css` 
Ajouter une keyframe :
```css
@keyframes neon-pulse {
  0%   { box-shadow: 0 0 0 0 hsl(217 91% 50% / 0.6); background-color: hsl(217 91% 50% / 0.1); }
  50%  { box-shadow: 0 0 16px 4px hsl(217 91% 50% / 0.3); background-color: hsl(217 91% 50% / 0.15); }
  100% { box-shadow: 0 0 0 0 transparent; background-color: transparent; }
}
.animate-neon-pulse { animation: neon-pulse 1.2s ease-out; }
```

Dans `Inventory.tsx`, maintenir un state `pulsedProductId`. Quand un scan réussit, mettre l'ID du produit et placer cette ligne en premier dans `filteredInventory`, appliquer `animate-neon-pulse` pendant 1.2s.

---

## 8. Mise à jour de `src/pages/Inventory.tsx`

- Remplacer le `Input` "Scanner +1 stock" par le composant `SmartScanBar` auto-focus
- Ajouter le bouton **"⚡ Générateur de déclinaisons"** à côté de "Nouveau produit"
- Ouvrir `ProductSheet` (tiroir) pour les nouvelles créations, garder `ProductDialog` pour l'édition depuis le tableau (ou unifier selon la complexité)
- Gérer `pulsedProductId` pour l'animation : trier la ligne pulsée en tête, l'animer, réinitialiser après 1.2s
- Retour focus sur `SmartScanBar` après `setDialogOpen(false)` / sauvegarde réussie

---

## 9. Mise à jour de `src/hooks/useProducts.ts`

- Ajouter `barcodes` dans le type et les requêtes
- Ajouter une fonction `findProductByBarcode(code: string)` qui cherche dans `barcodes @> ARRAY[code]` côté Supabase (ou filtre côté client sur les données déjà chargées)
- Mettre à jour `useCreateProduct` et `useUpdateProduct` pour inclure `barcodes`

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/...sql` | Migration `barcodes text[]` |
| `src/hooks/useProducts.ts` | Ajouter `barcodes`, `findProductByBarcode` |
| `src/components/inventory/SmartScanBar.tsx` | Nouveau — barre de scan globale |
| `src/components/inventory/ProductSheet.tsx` | Nouveau — tiroir produit avec tags SKU |
| `src/components/inventory/LabelPrintDialog.tsx` | Nouveau — impression thermique 50×30mm |
| `src/components/inventory/VariationMatrixDialog.tsx` | Nouveau — générateur de déclinaisons |
| `src/pages/Inventory.tsx` | Mise à jour — intégration de tous les composants, animation pulse |
| `src/index.css` | Ajout animation `neon-pulse` |

---

## Notes techniques importantes

- **JsBarcode** : installé via `npm install jsbarcode` (à ajouter en dépendance), import dynamique pour éviter le blocage au chargement
- **Sons** : générés via `AudioContext` (Web Audio API, aucun fichier externe) — ton aigu court pour succès, ton grave pour erreur
- **Rétro-compatibilité** : la colonne `sku` est conservée dans la DB (non supprimée), le code utilise `barcodes[]` en priorité, `sku` en fallback pour les anciens enregistrements
- **Marge formule** : dans le tiroir, la formule est `((sell - cost) / sell) * 100` (sur le prix de vente, comme demandé) — différente de l'ancienne formule `(sell - cost) / cost * 100` (sur le coût). L'ancienne reste dans le tableau pour la cohérence.
