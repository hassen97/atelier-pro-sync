

# Notifications navigateur (Browser Notifications)

## Objectif

Ajouter le support des notifications natives du navigateur. Quand vous activez cette option et autorisez les notifications, les alertes (stock faible, reparations terminees) apparaitront comme des notifications systeme sur votre tablette/PC, meme si l'onglet n'est pas au premier plan.

---

## Ce qui change

### 1. Nouveau parametre "Notifications navigateur" dans les reglages

Dans la section Notifications de l'onglet General (Settings), un nouveau switch sera ajoute :

```text
┌─────────────────────────────────────────────────────┐
│  Notifications                                       │
│                                                      │
│  Alertes stock faible           [Switch]             │
│  Rappels paiements              [Switch]             │
│                                                      │
│  ── Separateur ──                                    │
│                                                      │
│  Notifications navigateur       [Switch]             │
│  "Recevoir les alertes sur votre appareil"           │
│  Statut: Autorise / Bloque / Non demande            │
└─────────────────────────────────────────────────────┘
```

- Au clic sur le switch, si la permission n'a pas ete demandee, le navigateur affichera la boite de dialogue d'autorisation
- Si l'utilisateur refuse, le switch revient a off avec un message explicatif
- Un badge indique le statut actuel (Autorise / Bloque / Non demande)

### 2. Mise a jour du hook useNotificationSettings

Ajouter un champ `browserNotifications: boolean` aux parametres :

```typescript
export interface NotificationSettings {
  lowStockAlerts: boolean;
  paymentReminders: boolean;
  browserNotifications: boolean;  // nouveau
}
```

Ajouter une fonction `requestBrowserPermission()` qui :
- Appelle `Notification.requestPermission()`
- Met a jour le parametre selon le resultat
- Retourne le statut de la permission

### 3. Envoi des notifications navigateur

Modifier `NotificationsContext.tsx` pour envoyer une notification native a chaque fois qu'une notification in-app est creee :

```typescript
// Dans NotificationsProvider, apres chaque addNotification :
if (notifSettings.browserNotifications && Notification.permission === "granted") {
  new Notification(title, {
    body: description,
    icon: "/favicon.png",
    badge: "/favicon.png",
  });
}
```

Cela sera encapsule dans une fonction helper `sendBrowserNotification(title, body)` pour eviter la duplication.

---

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useNotificationSettings.ts` | Ajouter `browserNotifications` + fonction `requestBrowserPermission` |
| `src/contexts/NotificationsContext.tsx` | Envoyer notification native quand une notification est ajoutee |
| `src/pages/Settings.tsx` | Ajouter switch + badge statut permission dans la section Notifications |

---

## Details techniques

### Gestion des permissions navigateur

```typescript
async function requestBrowserPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  
  const result = await Notification.requestPermission();
  return result === "granted";
}
```

### Affichage du statut

```typescript
function getPermissionStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
```

Le badge affichera :
- Vert "Autorise" si `granted`
- Rouge "Bloque" si `denied` (avec indication d'aller dans les parametres du navigateur)
- Gris "Non demande" si `default`
- Gris "Non supporte" si l'API n'est pas disponible

### Notification native

Chaque notification in-app declenchera aussi une notification systeme si :
1. Le parametre `browserNotifications` est active
2. La permission du navigateur est `granted`

L'icone utilisera `/favicon.png` deja present dans le projet.

---

## Comportement attendu

1. L'utilisateur va dans Parametres > General > Notifications
2. Il active "Notifications navigateur"
3. Le navigateur demande l'autorisation
4. Si autorise : le badge passe en vert, les futures alertes (stock faible, reparation terminee) apparaissent comme notifications systeme
5. Si refuse : le switch revient a off, un message indique de modifier dans les parametres du navigateur
6. Les notifications apparaissent sur la tablette/PC meme si l'onglet est en arriere-plan

