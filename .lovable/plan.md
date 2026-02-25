

# Paiement partiel et dette client dans le POS

## Ce qui change pour l'utilisateur
Quand vous cliquez sur "Carte" ou "Especes" dans le POS, au lieu de facturer automatiquement le montant total, une fenetre de confirmation s'ouvrira pour vous permettre de :
- Voir le total a payer
- Saisir le montant reellement paye (pre-rempli avec le total)
- Voir en temps reel le montant restant qui sera enregistre comme dette
- Un client **doit** etre selectionne si le paiement est partiel (sinon on ne sait pas a qui attribuer la dette)

## Fonctionnement
1. Cliquez sur Carte ou Especes
2. Une boite de dialogue s'ouvre avec le recapitulatif
3. Modifiez le montant paye si necessaire
4. Si montant paye < total : le reste est automatiquement ajoute a la balance (dette) du client
5. Confirmez -> la vente est enregistree avec `amount_paid` partiel, le `customer.balance` est mis a jour

## Details techniques

### Fichier: `src/pages/POS.tsx`

**Nouveau state:**
- `paymentDialogOpen` (boolean) - controle l'ouverture du dialogue de paiement
- `pendingPaymentMethod` (string) - stocke la methode de paiement selectionnee (card/cash)
- `amountPaid` (string) - montant saisi par l'utilisateur

**Modification du flux de paiement:**
- Les boutons Carte/Especes ouvrent maintenant le dialogue au lieu d'appeler `handlePayment` directement
- `handlePayment` est modifie pour utiliser `amountPaid` au lieu du total
- Si `amountPaid < total` et qu'un client est selectionne, la balance du client est mise a jour via `useUpdateCustomer`
- Si paiement partiel sans client selectionne, afficher une erreur demandant de selectionner un client

**Nouveau composant dans le meme fichier - Dialog de paiement:**
- Affiche le total, un champ pour le montant paye (pre-rempli avec le total)
- Calcul en temps reel du reste a payer
- Badge d'avertissement si paiement partiel
- Bouton de confirmation

**Modifications dans `handlePayment`:**
- Accepte le montant paye comme parametre au lieu de toujours utiliser le total
- Pour les ventes produits: `amount_paid` = montant saisi (au lieu de `total`)
- Si reste > 0 : met a jour `customer.balance` += reste via `useUpdateCustomer`
- Le recu PDF affiche le montant paye et le reste

### Imports supplementaires dans POS.tsx
- `useUpdateCustomer` depuis `@/hooks/useCustomers`
- Composants `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` depuis `@/components/ui/dialog`
- `Label` depuis `@/components/ui/label`

### Invalidation de cache
- Ajouter invalidation de `customers` dans le flux de paiement quand la balance est mise a jour

