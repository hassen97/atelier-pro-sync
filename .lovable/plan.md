

# Raccourcis clavier pour le POS

## Ce qui change
Trois raccourcis clavier seront actifs sur la page POS pour accelerer l'encaissement :

- **F1** : Paiement rapide (equivalent du bouton eclair)
- **F2** : Paiement par carte (ouvre le dialogue)
- **F3** : Paiement en especes (ouvre le dialogue)

Les raccourcis seront affiches sous forme de petits badges sur les boutons correspondants pour que l'equipe les apprenne facilement.

## Fonctionnement
- Les raccourcis fonctionnent uniquement quand le panier contient des articles et qu'aucun paiement n'est en cours
- Ils sont desactives quand le dialogue de paiement est ouvert (pour eviter les conflits avec la saisie)
- `e.preventDefault()` empeche le comportement par defaut du navigateur (ex: F1 ouvre normalement l'aide)

## Details techniques

### Fichier: `src/pages/POS.tsx`

**Ajout d'un `useEffect` avec un ecouteur `keydown`:**
- Ecoute les touches `F1`, `F2`, `F3` sur le document
- `F1` appelle `handleQuickPayment()`
- `F2` appelle `openPaymentDialog("card")`
- `F3` appelle `openPaymentDialog("cash")`
- Conditions de garde : ignore si `cart.length === 0`, `createSale.isPending`, ou `paymentDialogOpen`
- Cleanup avec `removeEventListener` au demontage

**Import supplementaire:**
- `useEffect` depuis `react` (deja present dans la ligne d'imports, juste a ajouter)

**Modification UI des boutons:**
- Ajouter un petit `<kbd>` ou texte secondaire sur chaque bouton indiquant le raccourci :
  - Bouton Paiement rapide : affiche "F1"
  - Bouton Carte : affiche "F2"
  - Bouton Especes : affiche "F3"

