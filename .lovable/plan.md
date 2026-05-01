## Objectif
Retirer aussi **Description du problème** et **Notes internes** du formulaire de création de réparation. Les deux restent visibles et éditables en mode édition.

## Changements (`src/components/repairs/RepairDialog.tsx`)

1. **Schéma Zod** — rendre `problem_description` optionnel pour autoriser la création vide :
   ```ts
   problem_description: z.string().optional().default(""),
   ```
   (`notes` est déjà optionnel.)

2. **Champ "Description du problème"** (lignes ~570-585) — wrapper dans `{isEditing && (...)}`. À la création, la valeur par défaut `""` est envoyée.

3. **Champ "Notes internes"** (lignes ~739-755) — wrapper dans `{isEditing && (...)}`.

## Hors scope
- Mode édition inchangé : les deux champs restent visibles et éditables.
- Aucun changement de base de données ni de hook.
