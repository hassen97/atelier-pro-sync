

# Ajout de l'export Excel pour la sauvegarde

## Contexte

Le systeme de sauvegarde actuel propose deux formats d'export:
- **JSON**: Format technique, difficile a lire pour un utilisateur non-technique
- **SQL**: Format base de donnees, encore plus technique

L'ajout d'un export **Excel (.xlsx)** est une excellente idee car:
- Format familier pour la plupart des utilisateurs
- Facile a ouvrir et consulter
- Permet de filtrer/trier les donnees dans Excel
- Utile pour la comptabilite ou le partage avec un comptable

---

## Implementation technique

### Etape 1: Installer la bibliotheque xlsx

Ajouter la dependance `xlsx` (SheetJS) qui permet de creer des fichiers Excel en JavaScript:

```bash
npm install xlsx
```

### Etape 2: Ajouter la fonction exportExcel dans useBackup.ts

```typescript
import * as XLSX from "xlsx";

const exportExcel = useCallback(async () => {
  const data = await fetchAllData();
  if (!data) {
    toast.error("Erreur lors de la recuperation des donnees");
    return;
  }

  // Creer un nouveau classeur Excel
  const workbook = XLSX.utils.book_new();

  // Ajouter chaque table comme une feuille separee
  const addSheet = (name: string, rows: any[]) => {
    if (rows.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }
  };

  addSheet("Produits", data.products);
  addSheet("Clients", data.customers);
  addSheet("Reparations", data.repairs);
  addSheet("Ventes", data.sales);
  addSheet("Depenses", data.expenses);
  addSheet("Fournisseurs", data.suppliers);
  addSheet("Factures", data.invoices);
  addSheet("Categories", data.categories);

  // Telecharger le fichier
  XLSX.writeFile(workbook, `backup_${new Date().toISOString().split("T")[0]}.xlsx`);
  toast.success("Sauvegarde Excel telechargee");
}, [fetchAllData]);
```

### Etape 3: Ajouter le bouton dans Settings.tsx

Dans la section "Sauvegarde locale", ajouter un nouveau bouton:

```tsx
<Button variant="outline" className="w-full" onClick={exportExcel}>
  <Download className="h-4 w-4 mr-2" />
  Telecharger sauvegarde (Excel)
</Button>
```

---

## Structure du fichier Excel

Le fichier Excel contiendra plusieurs feuilles (onglets):

| Feuille | Contenu |
|---------|---------|
| Produits | Liste des produits avec prix, stock, etc. |
| Clients | Liste des clients avec coordonnees |
| Reparations | Historique des reparations |
| Ventes | Historique des ventes |
| Depenses | Liste des depenses |
| Fournisseurs | Liste des fournisseurs |
| Factures | Liste des factures |
| Categories | Categories de produits |

---

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `package.json` | Ajouter dependance `xlsx` |
| `src/hooks/useBackup.ts` | Ajouter fonction `exportExcel` |
| `src/pages/Settings.tsx` | Ajouter bouton d'export Excel |

---

## Avantages de cette solution

- **Simple a utiliser**: Un clic pour telecharger toutes les donnees
- **Format universel**: Excel est installe sur la plupart des ordinateurs
- **Multi-feuilles**: Chaque type de donnee dans un onglet separe
- **Compatible comptabilite**: Facile a partager avec un comptable ou pour des archives

