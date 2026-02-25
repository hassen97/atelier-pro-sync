

# Paiement rapide pour clients de passage

## Ce qui change
Un nouveau bouton "Paiement rapide" sera ajoute a cote des boutons Carte et Especes. En un clic, il encaisse le montant total sans ouvrir de dialogue de confirmation et sans avoir besoin de selectionner un client. Ideal pour les ventes rapides aux clients de passage.

## Fonctionnement
1. Ajoutez des produits au panier
2. Cliquez sur le bouton "Paiement rapide" (avec une icone eclair)
3. La vente est immediatement enregistree au montant total, en especes, sans client associe
4. Le recu est genere automatiquement
5. Le panier est vide

Pas de dialogue, pas de selection de client - un seul clic suffit.

## Details techniques

### Fichier: `src/pages/POS.tsx`

**Nouvelle fonction `handleQuickPayment`:**
- Appelle directement la logique de paiement avec `payment_method: "cash"`, `amount_paid: total`, `customer_id: null`
- Genere le recu thermique
- Vide le panier
- Ne necessite aucune selection de client

**Modification de l'UI du panier (section boutons de paiement):**
- Ajouter un bouton "Paiement rapide" pleine largeur au-dessus de la grille Carte/Especes
- Style distinct avec icone `Zap` (eclair) de lucide-react
- Desactive si le panier est vide ou si une vente est en cours

**Import supplementaire:**
- `Zap` depuis `lucide-react`

La grille de boutons passera de:
```text
[  Carte  ] [ Especes ]
```
a:
```text
[     Paiement rapide (eclair)     ]
[  Carte  ] [ Especes ]
```

