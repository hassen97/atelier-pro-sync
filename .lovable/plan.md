

# Corriger l'inscription bloquée sur Chrome et iPhone

## Probleme identifie

1. **Session perimee dans Chrome** : Le localStorage contient un ancien refresh token invalide. Au chargement de la page, `getSession()` echoue avec "Refresh Token Not Found", ce qui peut laisser le client Supabase dans un etat instable ou les appels signUp/signIn se bloquent ensuite.

2. **iPhone de l'ami** : Les changements (approche hybride) n'ont pas encore ete publies. L'URL publiee utilise encore l'ancien code avec uniquement les appels REST directs.

3. **Detection d'erreur trop large** : `isNetworkError` contient `message.includes("fetch")` et `message.includes("network")` qui pourraient capturer des erreurs non-reseau et declencher le fallback inutilement.

## Plan de correction

### Fichier : `src/contexts/AuthContext.tsx`

**A. Nettoyage de session perimee au demarrage**
- Dans le `useEffect` d'initialisation, si `getSession()` echoue ou retourne une session invalide, appeler `supabase.auth.signOut()` pour nettoyer le localStorage
- Cela garantit un etat propre avant tout signup/signin

**B. Resserrer la detection d'erreur reseau**
- Retirer `message.includes("fetch")` (deja couvert par "Failed to fetch")
- Retirer `message.includes("network")` (deja couvert par "NetworkError")
- Ces patterns trop larges risquent de masquer de vraies erreurs

**C. Ajouter des logs de diagnostic temporaires**
- Ajouter `console.log` dans signUp et signIn pour tracer exactement ou le processus se bloque
- Ajouter un log quand `isNetworkError` est detectee pour confirmer le type d'erreur
- Ces logs aideront a diagnostiquer si le probleme persiste

### Apres implementation

- **Publier l'application** pour que l'ami sur iPhone (et tout le monde) utilise le nouveau code
- Tester sur Chrome apres avoir vide le cache ou en navigation privee

---

### Details techniques

**Nettoyage de session :**
```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }
  );

  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error || !session) {
      // Clear stale auth data to prevent interference
      supabase.auth.signOut();
    }
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  });

  return () => subscription.unsubscribe();
}, []);
```

**isNetworkError corrige :**
```typescript
function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const message = (err as Error).message || "";
  const name = (err as Error).name || "";
  return name === "AbortError" ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Load failed") ||
    message.includes("aborted");
}
```

**Logs de diagnostic dans signUp :**
```typescript
console.log("[Auth] signUp: attempting with Supabase client...");
// ... apres succes ou erreur:
console.log("[Auth] signUp: client result", { error: error?.message });
console.log("[Auth] signUp: falling back to REST...");
```

