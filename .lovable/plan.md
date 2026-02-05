
# Correction du probleme de synchronisation des parametres TVA

## Probleme identifie

Le Settings.tsx cree sa propre instance de `useShopSettings()` (ligne 37) au lieu d'utiliser le contexte global `useShopSettingsContext()`. Cela cree deux sources de verite separees:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ SITUATION ACTUELLE (problematique)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Settings.tsx ──────► useShopSettings() ──────► Instance A         │
│                               │                     ▲               │
│                               │                     │ Sauvegarde    │
│                               │                     │ (OK)          │
│                               │                     ▼               │
│                               ▼                 DATABASE            │
│                                                     ▲               │
│   POS.tsx ────► useShopSettingsContext() ──► Instance B             │
│                               │                     │ Lecture       │
│                               │                     │ (desync!)     │
│                               ▼                     │               │
│                   ShopSettingsProvider              │               │
│                                                     ▼               │
│                        Pas de mise a jour apres sauvegarde!         │
└─────────────────────────────────────────────────────────────────────┘
```

## Solution

Faire en sorte que Settings.tsx utilise le meme contexte que les autres pages:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ SOLUTION CORRIGEE                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Settings.tsx ─────┐                                               │
│                     │                                               │
│   POS.tsx ──────────┼──► useShopSettingsContext() ──► Instance      │
│                     │           │                       unique      │
│   Autres pages ─────┘           │                         │         │
│                                 │                         │         │
│                                 ▼                         ▼         │
│                     ShopSettingsProvider ◄────────► DATABASE        │
│                                                                     │
│             Toutes les pages partagent le meme etat!                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modification requise

### Fichier: `src/pages/Settings.tsx`

**Ligne 29** - Changer l'import:
```typescript
// Avant
import { useShopSettings } from "@/hooks/useShopSettings";

// Apres
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
```

**Ligne 37** - Utiliser le contexte:
```typescript
// Avant
const { settings, loading, saving, saveSettings } = useShopSettings();

// Apres
const { settings, loading, saving, saveSettings } = useShopSettingsContext();
```

---

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/Settings.tsx` | **Modifier** - Utiliser le contexte au lieu du hook direct |

---

## Comportement apres correction

1. L'utilisateur modifie le taux TVA dans Settings
2. Le bouton "Enregistrer" sauvegarde dans la base de donnees
3. L'etat du contexte est immediatement mis a jour
4. POS et toutes les autres pages voient instantanement les nouveaux parametres
5. **Plus besoin de recharger la page ou creer un nouveau compte**

---

## Details techniques

Le probleme etait que `useShopSettings()` cree un nouvel etat React a chaque appel. En utilisant `useShopSettingsContext()`, toutes les pages partagent le meme etat via React Context, garantissant la synchronisation immediate.
