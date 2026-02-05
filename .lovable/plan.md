
# Correction du paramètre TVA et ajout de l'option de désactivation

## Problèmes identifiés

1. **TVA hardcodée**: Dans `src/pages/POS.tsx` ligne 93, la TVA est fixée à `0.19` au lieu d'utiliser le paramètre dynamique
2. **Pas d'option désactivation**: Aucun champ `tax_enabled` pour activer/désactiver la TVA

## Solution

### Etape 1: Ajouter le champ `tax_enabled` à la base de données

Migration SQL:
```sql
ALTER TABLE shop_settings 
ADD COLUMN tax_enabled boolean NOT NULL DEFAULT true;
```

### Etape 2: Mettre à jour le hook useShopSettings

Ajouter le champ `tax_enabled` dans l'interface et la logique:

```typescript
export interface ShopSettings {
  id?: string;
  shop_name: string;
  currency: string;
  tax_rate: number;
  tax_enabled: boolean;  // Nouveau champ
  stock_alert_threshold: number;
}
```

### Etape 3: Modifier la page Settings

Ajouter un Switch pour activer/désactiver la TVA à côté du champ taux:

```text
┌─────────────────────────────────────────────────────┐
│  Taux TVA (%)                                       │
│  ┌─────────────┐  Activer TVA [Switch]             │
│  │    19       │                                    │
│  └─────────────┘                                    │
│  Le taux ne s'applique que si la TVA est activée   │
└─────────────────────────────────────────────────────┘
```

### Etape 4: Mettre à jour la page POS

Remplacer le calcul hardcodé par l'utilisation des paramètres dynamiques:

```typescript
// Avant (hardcodé)
const tax = subtotal * 0.19;

// Après (dynamique)
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";

const { settings } = useShopSettingsContext();
const taxRate = settings.tax_enabled ? settings.tax_rate / 100 : 0;
const tax = subtotal * taxRate;
```

Affichage conditionnel dans le panier:
- Si TVA activée: afficher "TVA (X%)" avec le taux dynamique
- Si TVA désactivée: ne pas afficher la ligne TVA ou afficher "TVA (désactivée)"

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| Migration DB | **Créer** - Ajouter colonne `tax_enabled` |
| `src/hooks/useShopSettings.ts` | **Modifier** - Ajouter `tax_enabled` |
| `src/pages/Settings.tsx` | **Modifier** - Ajouter Switch TVA |
| `src/pages/POS.tsx` | **Modifier** - Utiliser paramètres dynamiques |

---

## Comportement attendu

### Dans les Paramètres:
- Switch "Activer TVA" à côté du champ taux
- Champ taux grisé si TVA désactivée
- Sauvegarde des deux paramètres ensemble

### Dans le POS:
- Si TVA activée: calcul avec le taux défini dans les paramètres
- Si TVA désactivée: pas de TVA appliquée, ligne masquée ou marquée "(désactivée)"
- Total = sous-total si TVA désactivée

---

## Détails techniques

### Interface mise à jour
```typescript
interface ShopSettings {
  id?: string;
  shop_name: string;
  currency: string;
  tax_rate: number;
  tax_enabled: boolean;
  stock_alert_threshold: number;
}
```

### Calcul TVA dynamique
```typescript
const { settings } = useShopSettingsContext();

const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
const taxRate = settings.tax_enabled ? settings.tax_rate / 100 : 0;
const tax = subtotal * taxRate;
const total = subtotal + tax;
```

### Affichage conditionnel
```tsx
{settings.tax_enabled && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">TVA ({settings.tax_rate}%)</span>
    <span className="font-mono-numbers">{formatCurrency(tax)}</span>
  </div>
)}
```
