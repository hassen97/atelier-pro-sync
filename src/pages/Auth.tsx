import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wrench, Lock, User, AlertCircle, CheckCircle, AtSign, Globe, Phone, Mail, MessageCircle, Store, UserCog } from "lucide-react";
import { countries, currencies, getCurrencyForCountry } from "@/data/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();

  const [loginRole, setLoginRole] = useState<"owner" | "employee">("owner");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerCountry, setRegisterCountry] = useState("TN");
  const [registerCurrency, setRegisterCurrency] = useState("TND");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [useSameWhatsapp, setUseSameWhatsapp] = useState(true);
  const [registerWhatsapp, setRegisterWhatsapp] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Cooldown timer
  useEffect(() => {
    if (signupCooldown <= 0) return;
    const timer = setInterval(() => {
      setSignupCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [signupCooldown]);

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

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname || "/";
    navigate(from, { replace: true });
    return null;
  }

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return "Le nom d'utilisateur doit contenir au moins 3 caractères";
    if (username.length > 20) return "Le nom d'utilisateur ne peut pas dépasser 20 caractères";
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(loginUsername, loginPassword);

    if (error) {
      const msg = error.message || "";
      if (msg === "Invalid login credentials") {
        setError("Nom d'utilisateur ou mot de passe incorrect");
      } else if (msg.includes("banned") || msg.includes("User is banned")) {
        setError("Votre compte est en attente de validation par l'administrateur. Vous serez contacté une fois approuvé.");
      } else {
        setError(msg);
      }
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_locked")
          .eq("user_id", sessionData.session.user.id)
          .single();

        if (profile?.is_locked) {
          await supabase.auth.signOut();
          setError("Votre compte est en attente de validation par l'administrateur. Vous serez contacté une fois approuvé.");
          setLoading(false);
          return;
        }
      }
      const from = (location.state as { from?: Location })?.from?.pathname || "/";
      navigate(from, { replace: true });
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side cooldown check
    if (signupCooldown > 0) {
      setError(`Veuillez patienter ${signupCooldown}s avant de réessayer.`);
      return;
    }

    const usernameError = validateUsername(registerUsername);
    if (usernameError) { setError(usernameError); return; }
    if (!registerPhone.trim()) { setError("Le numéro de téléphone est obligatoire"); return; }
    if (registerPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
    if (registerPassword.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }

    setLoading(true);

    // Get captcha token if hCaptcha is configured
    let tokenForGuard = captchaToken;
    if (HCAPTCHA_SITE_KEY && !tokenForGuard) {
      try {
        const result = await captchaRef.current?.execute({ async: true });
        tokenForGuard = result?.response || null;
      } catch {
        setError("Vérification CAPTCHA échouée. Veuillez réessayer.");
        setLoading(false);
        return;
      }
    }

    // Server-side rate limiting + uniqueness pre-check
    try {
      const guardRes = await supabase.functions.invoke("signup-guard", {
        body: { username: registerUsername, phone: registerPhone.trim(), captchaToken: tokenForGuard },
      });

      if (guardRes.error) {
        console.error("[Auth] signup-guard invocation error:", guardRes.error);
        // Don't block signup if the guard itself fails
      } else if (guardRes.data && !guardRes.data.allowed) {
        const reason = guardRes.data.reason;
        if (reason === "rate_limited") {
          setError("Trop de tentatives d'inscription. Veuillez réessayer dans une heure.");
        } else if (reason === "username_taken") {
          setError("Ce nom d'utilisateur est déjà pris.");
        } else if (reason === "phone_taken") {
          setError("Ce numéro de téléphone est déjà utilisé.");
        } else if (reason === "captcha_failed" || reason === "captcha_required") {
          setError("Vérification CAPTCHA échouée. Veuillez réessayer.");
        } else {
          setError(reason || "Inscription refusée.");
        }
        setLoading(false);
        setSignupCooldown(30);
        return;
      }
    } catch (guardErr) {
      console.error("[Auth] signup-guard fetch error:", guardErr);
      // Fail open
    }

    const whatsappPhone = useSameWhatsapp ? registerPhone.trim() : (registerWhatsapp.trim() || registerPhone.trim());

    const { error } = await signUp(
      registerUsername, registerPassword, registerFullName,
      registerCountry, registerCurrency,
      registerPhone.trim(), whatsappPhone,
      registerEmail.trim() || undefined
    );

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Ce nom d'utilisateur est déjà pris");
      } else {
        setError(error.message);
      }
    } else {
      setSuccess("Votre compte a été créé avec succès ! Il est en attente de validation par l'administrateur.");
      await supabase.auth.signOut();
      setRegisterUsername(""); setRegisterPassword(""); setRegisterFullName("");
      setRegisterCountry("TN"); setRegisterCurrency("TND"); setConfirmPassword("");
      setRegisterPhone(""); setUseSameWhatsapp(true); setRegisterWhatsapp(""); setRegisterEmail("");
    }

    setLoading(false);
    setSignupCooldown(30);
  };

  const activeTab = loginRole === "employee" ? "login" : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Animated grid background */}
      <div className="absolute inset-0 auth-grid-bg opacity-40" />
      {/* Radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[hsla(217,91%,50%,0.08)] blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-gradient-primary p-4 mb-4 auth-glow">
            <Wrench className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">RepairPro Tunisie</h1>
          <p className="text-slate-400 mt-1 text-sm">Gestion d'atelier moderne</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setLoginRole("owner")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
              loginRole === "owner"
                ? "border-[hsla(217,91%,60%,0.6)] bg-[hsla(217,91%,50%,0.12)] shadow-[0_0_20px_hsla(217,91%,60%,0.15)]"
                : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
            }`}
          >
            <Store className={`h-6 w-6 ${loginRole === "owner" ? "text-[hsl(217,91%,65%)]" : "text-slate-400"}`} />
            <span className={`text-sm font-medium ${loginRole === "owner" ? "text-white" : "text-slate-400"}`}>
              Propriétaire
            </span>
          </button>
          <button
            type="button"
            onClick={() => setLoginRole("employee")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
              loginRole === "employee"
                ? "border-[hsla(217,91%,60%,0.6)] bg-[hsla(217,91%,50%,0.12)] shadow-[0_0_20px_hsla(217,91%,60%,0.15)]"
                : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
            }`}
          >
            <UserCog className={`h-6 w-6 ${loginRole === "employee" ? "text-[hsl(217,91%,65%)]" : "text-slate-400"}`} />
            <span className={`text-sm font-medium ${loginRole === "employee" ? "text-white" : "text-slate-400"}`}>
              Employé
            </span>
          </button>
        </div>

        {/* Auth Card */}
        <div className="auth-card rounded-2xl p-6">
          <Tabs defaultValue="login" value={activeTab} className="w-full">
            {loginRole === "owner" && (
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10">
                <TabsTrigger value="login" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
                  Inscription
                </TabsTrigger>
              </TabsList>
            )}

            {loginRole === "employee" && (
              <h2 className="text-lg font-semibold text-white mb-4">Connexion Employé</h2>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4 border-red-500/30 bg-red-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <AlertDescription className="text-emerald-300">{success}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-slate-300 text-sm">Nom d'utilisateur</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="ahmed123"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="pl-10 auth-input"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-300 text-sm">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 auth-input"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-[0_0_20px_hsla(217,91%,50%,0.25)] hover:shadow-[0_0_30px_hsla(217,91%,50%,0.4)] transition-shadow"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>
                  ) : (
                    "Se connecter"
                  )}
                </Button>

                <div className="text-center">
                  <Link to="/reset-password" className="text-sm text-[hsl(217,91%,65%)] hover:text-[hsl(217,91%,75%)] transition-colors">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-slate-300 text-sm">Nom d'utilisateur</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="register-username" type="text" placeholder="ahmed123" value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                  </div>
                  <p className="text-xs text-slate-500">3-20 caractères, lettres, chiffres et underscores</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-slate-300 text-sm">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="register-name" type="text" placeholder="Ahmed Ben Ali" value={registerFullName}
                      onChange={(e) => setRegisterFullName(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="register-country" className="text-slate-300 text-sm">Pays</Label>
                    <Select value={registerCountry} onValueChange={(val) => {
                      setRegisterCountry(val);
                      const curr = getCurrencyForCountry(val);
                      if (curr) setRegisterCurrency(curr.code);
                    }} disabled={loading}>
                      <SelectTrigger id="register-country" className="auth-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-currency" className="text-slate-300 text-sm">Devise</Label>
                    <Select value={registerCurrency} onValueChange={setRegisterCurrency} disabled={loading}>
                      <SelectTrigger id="register-currency" className="auth-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-phone" className="text-slate-300 text-sm">Numéro de téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="register-phone" type="tel" placeholder="+216 XX XXX XXX" value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="same-whatsapp" checked={useSameWhatsapp}
                    onCheckedChange={(checked) => setUseSameWhatsapp(!!checked)} disabled={loading} />
                  <Label htmlFor="same-whatsapp" className="text-sm cursor-pointer text-slate-300">
                    Utiliser ce numéro pour WhatsApp
                  </Label>
                </div>

                {!useSameWhatsapp && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="register-whatsapp" className="text-slate-300 text-sm">Numéro WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input id="register-whatsapp" type="tel" placeholder="+216 XX XXX XXX" value={registerWhatsapp}
                        onChange={(e) => setRegisterWhatsapp(e.target.value)} className="pl-10 auth-input" disabled={loading} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-300 text-sm">Email (optionnel)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="register-email" type="email" placeholder="exemple@email.com" value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)} className="pl-10 auth-input" disabled={loading} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-300 text-sm">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="register-password" type="password" placeholder="••••••••" value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)} className="pl-10 auth-input" required minLength={8} disabled={loading} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-300 text-sm">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                  </div>
                </div>

                {HCAPTCHA_SITE_KEY && (
                  <div className="flex justify-center">
                    <HCaptcha
                      ref={captchaRef}
                      sitekey={HCAPTCHA_SITE_KEY}
                      size="invisible"
                      onVerify={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken(null)}
                    />
                  </div>
                )}

                <Button type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-[0_0_20px_hsla(217,91%,50%,0.25)] hover:shadow-[0_0_30px_hsla(217,91%,50%,0.4)] transition-shadow"
                  disabled={loading || signupCooldown > 0}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
                  ) : signupCooldown > 0 ? (
                    `Patienter ${signupCooldown}s`
                  ) : (
                    "Créer un compte"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* WhatsApp Contact */}
        {adminWhatsapp && (
          <div className="mt-4">
            <a
              href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter l'admin via WhatsApp
            </a>
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          © 2024 RepairPro Tunisie. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
