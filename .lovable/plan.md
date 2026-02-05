
# Confirmation de paiement lors du changement de statut

## Objectif

Ajouter une popup de confirmation lorsqu'une reparation passe au statut "Termine" ou "Livre" pour:
1. Demander si la reparation est entierement payee
2. Si non payee entierement, ajouter le reste en dette pour le client

---

## Logique metier

### Flux actuel
```
Changement statut → Mise a jour status uniquement → Pas de gestion du paiement
```

### Nouveau flux
```
Changement vers "Termine" ou "Livre"
    ↓
Popup de confirmation
    ↓
┌─────────────────────────────────────────┐
│  Reparation: Samsung Galaxy S24         │
│  Total: 150.000 DT                      │
│  Deja paye: 50.000 DT                   │
│  Reste: 100.000 DT                      │
│                                         │
│  [ ] Entierement paye (100.000 DT)      │
│  [ ] Paiement partiel: [____] DT        │
│                                         │
│  [Annuler]  [Confirmer]                 │
└─────────────────────────────────────────┘
    ↓
Si paiement complet → amount_paid = total_cost
Si paiement partiel → amount_paid += montant saisi
                    → customer.balance += reste non paye
```

---

## Implementation technique

### Etape 1: Creer le composant PaymentConfirmDialog

Nouveau fichier: `src/components/repairs/PaymentConfirmDialog.tsx`

Ce composant affichera:
- Resume de la reparation (appareil, client)
- Montants (total, paye, reste)
- Options de paiement:
  - Checkbox "Entierement paye"
  - Champ montant pour paiement partiel
- Avertissement si client non associe (dette impossible)

### Etape 2: Modifier la page Repairs.tsx

Intercepter les changements de statut vers "completed" ou "delivered":

```typescript
const handleStatusChange = (repair, newStatus) => {
  if (newStatus === "completed" || newStatus === "delivered") {
    // Ouvrir la popup de confirmation de paiement
    setPaymentConfirmRepair(repair);
    setPendingStatus(newStatus);
    setPaymentConfirmOpen(true);
  } else {
    // Changement direct pour les autres statuts
    updateStatus.mutate({ id: repair.id, status: newStatus });
  }
};
```

### Etape 3: Logique de confirmation du paiement

```typescript
const confirmPaymentAndStatus = async (paymentData) => {
  const repair = paymentConfirmRepair;
  const remaining = repair.total - repair.paid;
  
  // 1. Mettre a jour le montant paye
  await updateRepair.mutateAsync({
    id: repair.id,
    amount_paid: repair.paid + paymentData.amount,
    status: pendingStatus,
  });
  
  // 2. Si paiement incomplet et client existe, ajouter dette
  if (paymentData.amount < remaining && repair.customer_id) {
    const customer = customers.find(c => c.id === repair.customer_id);
    if (customer) {
      const debtAmount = remaining - paymentData.amount;
      await updateCustomer.mutateAsync({
        id: customer.id,
        balance: Number(customer.balance) + debtAmount,
      });
    }
  }
};
```

---

## Fichiers a modifier/creer

| Fichier | Action |
|---------|--------|
| `src/components/repairs/PaymentConfirmDialog.tsx` | **Creer** - Popup de confirmation paiement |
| `src/pages/Repairs.tsx` | **Modifier** - Integrer la popup et la logique |

---

## Interface de la popup

```
┌─────────────────────────────────────────────────────┐
│         Confirmer le paiement                       │
│─────────────────────────────────────────────────────│
│                                                     │
│  📱 Samsung Galaxy S24 Ultra                        │
│  👤 Ahmed Ben Ali                                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Total reparation      150.000 DT              │  │
│  │ Deja paye              50.000 DT              │  │
│  │ ─────────────────────────────────             │  │
│  │ Reste a payer         100.000 DT              │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Comment souhaitez-vous proceder ?                  │
│                                                     │
│  ○ Marquer comme entierement paye                   │
│    Le client paie les 100.000 DT restants          │
│                                                     │
│  ○ Paiement partiel ou aucun paiement              │
│    Montant recu: [________] DT                     │
│    → Le reste (XX.XXX DT) sera ajoute aux dettes   │
│                                                     │
│  ⚠️ Pas de client associe - la dette ne peut       │
│     pas etre enregistree (si applicable)           │
│                                                     │
│         [Annuler]        [Confirmer et changer]    │
└─────────────────────────────────────────────────────┘
```

---

## Cas particuliers geres

1. **Client non associe**: 
   - Afficher un avertissement
   - Permettre quand meme le changement de statut
   - La dette ne sera pas enregistree (pas de customer_id)

2. **Deja entierement paye**:
   - Ne pas afficher la popup si `amount_paid >= total_cost`
   - Changer directement le statut

3. **Statut "pending" ou "in_progress"**:
   - Pas de popup, changement direct

4. **Annulation**:
   - Fermer la popup sans changer le statut

---

## Avantages

- **Tracabilite**: Chaque changement de statut est documente avec le paiement
- **Gestion des dettes**: Les impayss sont automatiquement ajoutes au solde client
- **Flexibilite**: Possibilite de paiement partiel
- **Securite**: Confirmation requise avant finalisation
