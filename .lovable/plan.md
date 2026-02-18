
# Categories dynamiques, integration formulaires et panier flexible

## Vue d'ensemble

Ce plan couvre 4 axes : (1) systeme de categories dynamiques avec gestion dans les parametres, (2) integration dans les formulaires reparation et stock, (3) prix editables dans le panier POS, (4) categories par defaut pre-remplies.

---

## Etape 1 : Hook useCategories

Creer `src/hooks/useCategories.ts` pour gerer les operations CRUD sur la table `categories` existante.

La table `categories` a deja les colonnes : `id`, `name`, `type` ('product' ou 'repair'), `user_id`, `created_at`. Les RLS sont en place.

Le hook exposera :
- `useCategories(type?)` - lister les categories filtrees par type
- `useCreateCategory()` - creer une categorie
- `useDeleteCategory()` - supprimer une categorie
- `useSeedDefaultCategories()` - inserer les categories par defaut si aucune n'existe

Categories par defaut repair : Ecran/Affichage, Batterie, Port de charge, Degats des eaux, Carte mere, Chassis/Vitre, Logiciel, Camera/FaceID

Categories par defaut stock : Ecrans, Batteries, Petites pieces, Consommables, Accessoires

---

## Etape 2 : Section "Gerer les categories" dans Settings

Ajouter un nouvel onglet "Categories" dans la page `src/pages/Settings.tsx`.

Interface :
- Deux sous-sections : "Categories de reparation" et "Categories de stock"
- Liste des categories avec bouton supprimer (rouge) pour chacune
- Champ + bouton pour ajouter une nouvelle categorie
- Bouton "Reinitialiser par defaut" pour re-inserer les categories initiales
- Dialog de confirmation avant suppression

---

## Etape 3 : Integration dans le formulaire RepairDialog

Modifier `src/components/repairs/RepairDialog.tsx` :
- Ajouter un champ "Categorie de reparation" utilisant le composant Combobox existant
- Charger les categories de type 'repair' via `useCategories('repair')`
- Ajouter `repair_category_id` au schema du formulaire (optionnel)

Migration DB necessaire :
```sql
ALTER TABLE repairs ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
```

Quand une categorie est supprimee, `ON DELETE SET NULL` garantit que les reparations existantes ne cassent pas (category_id devient null = "Non classe").

---

## Etape 4 : Integration dans le formulaire ProductDialog

Modifier `src/components/inventory/ProductDialog.tsx` :
- Ajouter un champ "Categorie" utilisant le Combobox
- Charger les categories de type 'product' via `useCategories('product')`
- Le champ `category_id` existe deja sur la table `products`
- Passer le `category_id` lors de la creation/mise a jour

Modifier `src/hooks/useProducts.ts` pour accepter `category_id` dans les mutations create/update.

---

## Etape 5 : Panier flexible avec prix editables (POS)

Modifier `src/pages/POS.tsx` :

Interface CartItem mise a jour :
```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;        // prix editable
  originalPrice: number; // prix catalogue (pour reference)
  quantity: number;
  maxStock: number;
}
```

Dans chaque ligne du panier, remplacer l'affichage statique du prix par un champ Input de type number :
- Valeur par defaut = prix du catalogue (`sell_price`)
- Editable manuellement pour remises/ajustements
- Recalcul automatique du sous-total, TVA et total en temps reel
- Afficher l'ecart par rapport au prix catalogue si modifie (ex: badge "Remise")

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/hooks/useCategories.ts` | Hook CRUD categories + seed par defaut |

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/Settings.tsx` | Ajouter onglet "Categories" avec gestion complete |
| `src/components/repairs/RepairDialog.tsx` | Ajouter Combobox categorie reparation |
| `src/components/inventory/ProductDialog.tsx` | Ajouter Combobox categorie stock |
| `src/hooks/useProducts.ts` | Accepter `category_id` dans create/update |
| `src/pages/POS.tsx` | Prix editables dans le panier |
| `src/pages/Inventory.tsx` | Utiliser categories dynamiques pour le filtre |

## Migration DB

```sql
ALTER TABLE repairs ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
```

---

## Details techniques

### Hook useCategories

```typescript
export function useCategories(type?: 'product' | 'repair') {
  // Fetch categories filtered by type, ordered by name
}

export function useCreateCategory() {
  // Insert with user_id, invalidate ["categories"]
}

export function useDeleteCategory() {
  // Delete by id, invalidate ["categories"]
  // ON DELETE SET NULL protege les references existantes
}

export function useSeedDefaultCategories() {
  // Verifie si des categories existent pour l'utilisateur
  // Si non, insere les categories par defaut (repair + product)
}
```

### Prix editable dans le panier

```tsx
// Dans chaque ligne du panier
<Input
  type="number"
  step="0.001"
  value={item.price}
  onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
  className="w-20 h-7 text-xs text-right font-mono-numbers"
/>

// Indicateur de remise si prix modifie
{item.price < item.originalPrice && (
  <Badge variant="secondary" className="text-[10px]">
    -{((1 - item.price / item.originalPrice) * 100).toFixed(0)}%
  </Badge>
)}
```

### Onglet Categories dans Settings

```text
┌─────────────────────────────────────────────────────┐
│  Categories de reparation                           │
│  ┌─────────────────────────────────────────────┐    │
│  │ Ecran/Affichage              [Supprimer 🔴] │    │
│  │ Batterie                     [Supprimer 🔴] │    │
│  │ Port de charge               [Supprimer 🔴] │    │
│  │ ...                                         │    │
│  └─────────────────────────────────────────────┘    │
│  [________Nouvelle categorie________] [+ Ajouter]  │
│                                                     │
│  Categories de stock                                │
│  ┌─────────────────────────────────────────────┐    │
│  │ Ecrans                       [Supprimer 🔴] │    │
│  │ Batteries                    [Supprimer 🔴] │    │
│  │ ...                                         │    │
│  └─────────────────────────────────────────────┘    │
│  [________Nouvelle categorie________] [+ Ajouter]  │
│                                                     │
│  [Reinitialiser les categories par defaut]          │
└─────────────────────────────────────────────────────┘
```

### Protection a la suppression

- `ON DELETE SET NULL` sur la FK `repairs.category_id`
- La FK `products.category_id` existe deja (verifier qu'elle a aussi `ON DELETE SET NULL`)
- Dialog de confirmation avec le nom de la categorie avant suppression
- Bouton supprimer en rouge (`text-destructive`)
