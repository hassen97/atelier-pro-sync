
# Integration API ipsw.me pour les modeles Apple

## Objectif

Implementer une approche hybride pour la recuperation des modeles de telephones:
- **Apple**: Utiliser l'API publique ipsw.me pour obtenir une liste toujours a jour des appareils Apple
- **Autres marques**: Conserver la liste statique actuelle (Samsung, Xiaomi, etc.)

---

## Architecture technique

### API ipsw.me

L'API publique `https://api.ipsw.me/v4/devices` retourne tous les appareils Apple avec leurs details:
- Nom du modele (iPhone 15 Pro Max, iPad Pro 12.9", etc.)
- Identifiant unique
- Type d'appareil (iPhone, iPad, iPod, Apple TV, Apple Watch)

Nous filtrerons uniquement les **iPhones** pour rester coherent avec le contexte reparation.

---

## Implementation

### Etape 1: Creer un hook pour recuperer les modeles Apple

Nouveau fichier: `src/hooks/useAppleDevices.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

interface AppleDevice {
  name: string;
  identifier: string;
  boardconfig: string;
  platform: string;
  cpid: number;
  bdid: number;
}

export function useAppleDevices() {
  return useQuery({
    queryKey: ["apple-devices"],
    queryFn: async () => {
      const response = await fetch("https://api.ipsw.me/v4/devices");
      if (!response.ok) throw new Error("Failed to fetch Apple devices");
      const devices: AppleDevice[] = await response.json();
      
      // Filtrer uniquement les iPhones et enlever les doublons
      const iphones = devices
        .filter(d => d.name.startsWith("iPhone"))
        .map(d => d.name)
        .filter((name, index, self) => self.indexOf(name) === index)
        .sort((a, b) => {
          // Tri par numero de version (iPhone 16 avant iPhone 15, etc.)
          const numA = parseInt(a.match(/iPhone (\d+)/)?.[1] || "0");
          const numB = parseInt(b.match(/iPhone (\d+)/)?.[1] || "0");
          return numB - numA;
        });
      
      return iphones;
    },
    staleTime: 24 * 60 * 60 * 1000, // Cache 24h
    gcTime: 7 * 24 * 60 * 60 * 1000, // Garde en cache 7 jours
  });
}
```

### Etape 2: Modifier le fichier phoneModels.ts

Supprimer la liste statique Apple et ajouter un flag pour indiquer les marques avec API:

```typescript
// Marquer Apple comme utilisant une API externe
export const BRANDS_WITH_API = ["apple"] as const;

// Garder la liste statique pour les autres marques
export const PHONE_MODELS: Record<string, string[]> = {
  // Apple est retire - sera charge via API
  samsung: [...],
  xiaomi: [...],
  // ... autres marques inchangees
};
```

### Etape 3: Modifier RepairDialog.tsx

Integrer le hook pour charger dynamiquement les modeles Apple:

```typescript
import { useAppleDevices } from "@/hooks/useAppleDevices";

// Dans le composant
const { data: appleDevices = [], isLoading: isLoadingApple } = useAppleDevices();

// Logique pour obtenir les modeles selon la marque
const availableModels = useMemo(() => {
  if (selectedBrand === "apple") {
    return appleDevices.map(model => ({ value: model, label: model }));
  }
  // Utiliser la liste statique pour les autres marques
  const models = PHONE_MODELS[selectedBrand] || [];
  return models.map(model => ({ value: model, label: model }));
}, [selectedBrand, appleDevices]);
```

---

## Fichiers a modifier/creer

| Fichier | Action |
|---------|--------|
| `src/hooks/useAppleDevices.ts` | **Creer** - Hook pour l'API ipsw.me |
| `src/data/phoneModels.ts` | **Modifier** - Retirer liste Apple statique |
| `src/components/repairs/RepairDialog.tsx` | **Modifier** - Integrer le hook Apple |

---

## Avantages de cette approche

- **Liste Apple toujours a jour**: Nouveaux modeles automatiquement disponibles
- **Performance**: Cache de 24h pour eviter les appels API repetitifs
- **Fallback**: Si l'API est indisponible, affiche un champ texte libre
- **Pas de changement pour les autres marques**: Samsung, Xiaomi, etc. gardent leur liste statique fiable

---

## Gestion des erreurs

Si l'API ipsw.me est indisponible:
1. Afficher un indicateur de chargement pendant la tentative
2. En cas d'echec, permettre la saisie manuelle du modele
3. Afficher un message discret d'erreur dans la console

---

## Donnees retournees par l'API

Exemple de reponse de l'API ipsw.me pour les iPhones:
- iPhone 16 Pro Max
- iPhone 16 Pro
- iPhone 16 Plus
- iPhone 16
- iPhone 15 Pro Max
- iPhone 15 Pro
- iPhone SE (3rd generation)
- ... (tous les modeles depuis iPhone 2G)

La liste complete inclut environ 50+ modeles d'iPhone.
