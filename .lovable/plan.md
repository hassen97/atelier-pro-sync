
# Ameliorations Demandees

## Probleme 1: Creation de client depuis la page Reparation
**Situation actuelle**: Le formulaire de reparation permet uniquement de selectionner un client existant. Si le client n'existe pas, l'utilisateur doit quitter la page, aller dans "Clients", creer le client, puis revenir.

**Solution proposee**: Ajouter un bouton "+" a cote du selecteur de client qui ouvre un mini-formulaire rapide (nom + telephone minimum) directement dans le dialogue de reparation.

## Probleme 2: Changement de mot de passe
**Situation actuelle**: Aucune fonctionnalite de changement de mot de passe n'existe. L'onglet "Utilisateurs" dans les parametres affiche "Fonctionnalite bientot disponible".

**Solution proposee**: Ajouter une section "Mon compte" dans l'onglet Securite des parametres avec la possibilite de changer son mot de passe.

---

## Implementation Technique

### Partie 1: Creation rapide de client

**Fichier**: `src/components/repairs/RepairDialog.tsx`

Modifications:
1. Importer `useCreateCustomer` depuis `useCustomers`
2. Ajouter un state pour controler l'affichage du mini-formulaire client
3. Ajouter un bouton "+" (icone `UserPlus`) a cote du selecteur
4. Creer un mini-formulaire inline avec:
   - Champ "Nom" (requis)
   - Champ "Telephone" (optionnel mais recommande)
   - Boutons "Creer" et "Annuler"
5. Apres creation, selectionner automatiquement le nouveau client

Structure UI proposee:
```text
+------------------------------------------+
| Client                          [+ Ajouter]|
| [Selecteur client existant ▼]              |
+------------------------------------------+

Quand on clique sur "+ Ajouter":
+------------------------------------------+
| Nouveau client rapide                      |
| Nom *: [________________]                  |
| Tel:   [________________]                  |
| [Annuler]              [Creer et utiliser] |
+------------------------------------------+
```

### Partie 2: Changement de mot de passe

**Fichier**: `src/pages/Settings.tsx`

Modifications:
1. Ajouter un nouveau state pour les champs de mot de passe
2. Ajouter une section "Mon compte" dans l'onglet Securite avec:
   - Champ "Nouveau mot de passe"
   - Champ "Confirmer le mot de passe"
   - Bouton "Modifier le mot de passe"
3. Utiliser `supabase.auth.updateUser({ password: newPassword })` pour la mise a jour

**Fichier**: `src/contexts/AuthContext.tsx`

Ajouter une fonction `updatePassword` au contexte:
```typescript
const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error };
};
```

---

## Resume des fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/repairs/RepairDialog.tsx` | Ajout formulaire rapide client |
| `src/pages/Settings.tsx` | Section changement mot de passe |
| `src/contexts/AuthContext.tsx` | Fonction `updatePassword` |

## Comportement attendu

**Creation client rapide**:
- L'utilisateur clique sur "+" a cote du selecteur
- Un mini-formulaire s'affiche (nom + tel)
- Le client est cree et automatiquement selectionne
- Le formulaire de reparation reste ouvert avec toutes les donnees saisies

**Changement mot de passe**:
- L'utilisateur va dans Parametres > Securite
- Il saisit son nouveau mot de passe deux fois
- Un message de confirmation s'affiche apres modification
