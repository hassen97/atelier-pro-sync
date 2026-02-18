# Promouvoir les proprietaires de boutiques en Super Admin

## Objectif

Mettre a jour le role de tous les utilisateurs existants (276 comptes) de `employee` a `super_admin` pour qu'ils puissent gerer leur propre equipe, inviter des employes et assigner des taches -- exactement comme vous le faites deja.

## Ce qui change

### Migration de donnees

Une seule requete SQL met a jour tous les roles :

```sql
UPDATE user_roles SET role = 'super_admin' WHERE role = 'employee';
```

Cela transforme les 276 proprietaires de boutiques existants en super admins.

### Impact

- Chaque proprietaire verra la section **Gestion de l'equipe** dans Parametres > Utilisateurs
- Chaque proprietaire pourra inviter ses propres employes, definir leurs permissions et leur assigner des taches
- Les donnees restent isolees : chaque proprietaire ne voit que ses propres donnees grace au RLS (`user_id`)

### Nouveaux inscrits

Il y a un point important a regler : actuellement, le trigger `handle_new_user()` attribue le role `employee` a chaque nouvel inscrit. Il faut le modifier pour attribuer `super_admin` par defaut, car chaque nouvel inscrit est un proprietaire de boutique (pas un employe invite).

```sql
-- Dans handle_new_user(), changer :
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'employee');
-- En :
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'super_admin');
```

Un employe n'a pas besoin de s'inscrire seul -- c'est le proprietaire qui l'invite. Quand un employe s'inscrit, il devient proprietaire de sa propre boutique par defaut. C'est seulement quand un autre proprietaire l'ajoute a son equipe qu'il agit en tant qu'employe.

## Fichiers a modifier


| Modification  | Detail                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| Migration SQL | `UPDATE user_roles SET role = 'super_admin' WHERE role = 'employee'`                      |
| Migration SQL | Remplacer le trigger `handle_new_user()` pour inserer `super_admin` au lieu de `employee` |


## Aucun changement de code

Le code existant (`useIsOwner`, `useTeam`, sidebar, etc.) verifie deja `role === 'super_admin'` pour determiner si l'utilisateur est proprietaire. Aucune modification du code frontend n'est necessaire.