import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft, Send, AtSign, CheckCircle, Phone, MessageCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");

  // Load admin WhatsApp number
  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "admin_whatsapp")
      .single()
      .then(({ data }) => {
        if (data && (data as any).value) setAdminWhatsapp((data as any).value);
      });
  }, []);

  // Check username existence with debounce
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) {
      setUsernameExists(null);
      return;
    }

    setChecking(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-username`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({ username: trimmed }),
          }
        );
        const data = await res.json();
        setUsernameExists(data.exists ?? null);
      } catch {
        setUsernameExists(null);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername && !trimmedPhone) {
      setError("Veuillez saisir un nom d'utilisateur ou un numéro de téléphone");
      return;
    }

    if (trimmedUsername && trimmedUsername.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères");
      return;
    }

    if (trimmedUsername && usernameExists === false) {
      setError("Ce nom d'utilisateur n'existe pas");
      return;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from("password_reset_requests" as any)
        .insert({ username: trimmedUsername || `phone:${trimmedPhone}`, phone: trimmedPhone || null } as any);

      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
            <Wrench className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-muted-foreground mt-1">Récupération de compte</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Demande de réinitialisation
            </CardTitle>
            <CardDescription>
              Saisissez votre nom d'utilisateur ou numéro de téléphone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {success ? (
              <div className="space-y-4">
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                    Votre demande a été envoyée avec succès. L'administrateur vous contactera 
                    par téléphone ou WhatsApp pour vous fournir un nouveau mot de passe.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-username">Nom d'utilisateur</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-username"
                      type="text"
                      placeholder="votre_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  {username.trim().length >= 3 && (
                    <p className={`text-xs ${checking ? "text-muted-foreground" : usernameExists ? "text-emerald-500" : "text-destructive"}`}>
                      {checking ? "Vérification..." : usernameExists ? "✓ Utilisateur trouvé" : "✗ Utilisateur introuvable"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-phone" className="text-muted-foreground text-sm">
                    Ou votre numéro de téléphone (optionnel)
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-phone"
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Alert className="border-primary/30 bg-primary/5">
                  <AlertDescription className="text-sm">
                    L'administrateur recevra votre demande et vous contactera via le numéro 
                    de téléphone ou WhatsApp associé à votre compte.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer une demande de réinitialisation
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la connexion
                </Button>
              </form>
            )}

            {/* Admin WhatsApp Contact */}
            {adminWhatsapp && (
              <div className="pt-2 border-t border-border/50">
                <a
                  href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contacter l'admin via WhatsApp
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2024 RepairPro Tunisie. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
