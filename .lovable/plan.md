
# Garantie et Produits Retournes - Fonctionnalite Complete

## Probleme actuel
- Le bouton "Garantie / Retour" sur le Dashboard ouvre uniquement le formulaire de creation d'un ticket, mais ne permet pas de consulter les tickets existants.
- Le composant `DefectivePartsList` (pieces defectueuses/retournees) existe dans le code mais n'est utilise nulle part dans l'application.
- Il manque une vue complete pour gerer les garanties et les produits retournes.

## Solution proposee
Creer une page dediee `/warranty` accessible depuis le bouton "Garantie / Retour" du Dashboard et depuis la sidebar. Cette page affichera :
1. La liste des tickets de garantie existants avec leur statut
2. La liste des pieces defectueuses/retournees (composant `DefectivePartsList` deja pret)
3. Le bouton pour creer un nouveau ticket (ouvre le `WarrantyDialog` existant)

## Ce que l'utilisateur verra
- En cliquant sur "Garantie / Retour" sur le Dashboard, il sera redirige vers la page `/warranty`
- La page affiche deux sections : tickets de garantie (en haut) et pieces defectueuses (en bas)
- Chaque ticket montre : client, appareil original, raison du retour, cout, statut, date
- Un bouton "Nouveau ticket" ouvre le dialogue de creation existant
- Un lien dans la sidebar pour acceder a la page directement

## Details techniques

### 1. Nouveau fichier: `src/pages/Warranty.tsx`
- Page complete avec `PageHeader`
- Utilise `useWarrantyTickets()` et affiche les tickets dans des cartes
- Integre le composant `DefectivePartsList` existant
- Integre le `WarrantyDialog` existant pour la creation
- Chaque ticket affiche les infos de la reparation originale (via la relation `original_repair`)

### 2. Fichier: `src/pages/Dashboard.tsx`
- Changer le bouton "Garantie / Retour" pour naviguer vers `/warranty` au lieu d'ouvrir le dialogue directement
- Supprimer l'import et l'etat du `WarrantyDialog` (deplace dans la page Warranty)

### 3. Fichier: `src/App.tsx`
- Ajouter la route `/warranty` pointant vers la nouvelle page

### 4. Fichier: `src/components/layout/AppSidebar.tsx`
- Ajouter un lien "Garantie" dans la navigation avec l'icone `Shield`
