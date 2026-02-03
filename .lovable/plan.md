
# Ajout de l'autocompletion Marque/Modele de telephone

## Objectif

Remplacer le champ unique "Modele appareil" par deux champs separes avec autocompletion:
1. **Marque** (Apple, Samsung, Xiaomi, etc.)
2. **Modele** (filtre automatiquement selon la marque selectionnee)

---

## Implementation technique

### 1. Creer un fichier de donnees avec les marques et modeles

Fichier: `src/data/phoneModels.ts`

Ce fichier contiendra une liste comprehensive de:
- **~30 marques** de telephones (Apple, Samsung, Xiaomi, Huawei, OnePlus, Oppo, Vivo, Realme, Google, Motorola, Nokia, Sony, LG, Honor, Tecno, Infinix, Itel, ZTE, Alcatel, etc.)
- **Centaines de modeles** pour chaque marque

Structure:
```typescript
export const PHONE_BRANDS = [
  { value: "apple", label: "Apple" },
  { value: "samsung", label: "Samsung" },
  // ...
];

export const PHONE_MODELS: Record<string, string[]> = {
  apple: [
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
    // ... tous les modeles iPhone
  ],
  samsung: [
    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23",
    "Galaxy Z Fold 5", "Galaxy Z Flip 5",
    "Galaxy A54", "Galaxy A34", "Galaxy A24",
    // ... tous les modeles Samsung
  ],
  // ... autres marques
};
```

### 2. Creer un composant Combobox reutilisable

Utiliser le composant `Command` (cmdk) deja installe pour creer un Combobox avec:
- Recherche/filtrage en temps reel
- Navigation clavier
- Selection ou saisie libre (pour les modeles non listes)

### 3. Modifier le formulaire de reparation

**Avant:**
```
[ Modele appareil * ] [ IMEI ]
```

**Apres:**
```
[ Marque telephone ] [ Modele telephone * ] [ IMEI ]
```

**Comportement:**
1. L'utilisateur tape dans le champ "Marque" → autocompletion des marques
2. Une fois la marque selectionnee, le champ "Modele" filtre les modeles de cette marque
3. L'utilisateur peut aussi taper un modele personnalise s'il n'est pas dans la liste
4. Le champ `device_model` sera rempli avec "Marque Modele" (ex: "Apple iPhone 15 Pro")

### 4. Modifications de la base de donnees

**Option A (recommandee):** Garder le champ `device_model` existant
- Concatener marque + modele lors de l'enregistrement
- Pas de migration necessaire
- Compatible avec les donnees existantes

**Option B:** Ajouter des colonnes separees
- Ajouter `device_brand` et `device_model_name`
- Necessite une migration
- Plus structure mais plus complexe

---

## Fichiers a modifier/creer

| Fichier | Action |
|---------|--------|
| `src/data/phoneModels.ts` | **Creer** - Liste des marques et modeles |
| `src/components/ui/combobox.tsx` | **Creer** - Composant Combobox reutilisable |
| `src/components/repairs/RepairDialog.tsx` | **Modifier** - Remplacer le champ device_model par 2 Combobox |

---

## Liste des marques incluses

La liste inclura les marques les plus courantes:

**Marques premium:** Apple, Samsung, Google, OnePlus, Sony
**Marques chinoises:** Xiaomi, Huawei, Honor, Oppo, Vivo, Realme, ZTE, Meizu
**Marques africaines populaires:** Tecno, Infinix, Itel
**Autres:** Motorola, Nokia, LG, Alcatel, Asus, BlackBerry, HTC, Lenovo

Chaque marque aura ses modeles des 5 dernieres annees (2020-2025).

---

## Apercu de l'interface

```
+--------------------------------------------------+
| Marque telephone                                  |
| [Samsung                              ▼]         |
|  ┌─────────────────────────────────────┐         |
|  │ 🔍 Rechercher...                    │         |
|  │ ─────────────────────────────────── │         |
|  │ Apple                               │         |
|  │ Samsung ✓                           │         |
|  │ Xiaomi                              │         |
|  │ Huawei                              │         |
|  └─────────────────────────────────────┘         |
+--------------------------------------------------+
| Modele telephone *                               |
| [Galaxy S24 Ultra                     ▼]         |
|  ┌─────────────────────────────────────┐         |
|  │ 🔍 Rechercher modele Samsung...     │         |
|  │ ─────────────────────────────────── │         |
|  │ Galaxy S24 Ultra                    │         |
|  │ Galaxy S24+                         │         |
|  │ Galaxy S24                          │         |
|  │ Galaxy Z Fold 5                     │         |
|  └─────────────────────────────────────┘         |
+--------------------------------------------------+
```

---

## Avantages

- **Rapidite de saisie**: Autocompletion accelere la saisie
- **Standardisation**: Les noms de modeles sont coherents
- **Flexibilite**: Possibilite de saisir un modele personnalise
- **Filtrage intelligent**: Les modeles sont filtres par marque
- **Base de donnees complete**: Centaines de modeles inclus
