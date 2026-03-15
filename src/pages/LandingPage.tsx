import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Package, Wrench, Truck, RotateCcw,
  Menu, X, ChevronRight, Check, Smartphone,
  Shield, BarChart3, Users
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const } },
};

const features = [
  {
    icon: Package,
    title: "Inventaire Intelligent",
    desc: "Gestion de stock avec codes-barres, alertes de seuil, importation Excel et suivi en temps réel.",
  },
  {
    icon: Wrench,
    title: "Suivi de Réparations",
    desc: "Tickets numérotés, suivi client par lien, historique de statut et reçus PDF automatiques.",
  },
  {
    icon: Truck,
    title: "Comptabilité Fournisseur",
    desc: "Soldes fournisseurs, achats liés au stock, transactions et preuves de paiement.",
  },
  {
    icon: RotateCcw,
    title: "Retours & RMA",
    desc: "Retours produits, scan rapide, tickets garantie et suivi des pièces défectueuses.",
  },
];

const pricingPlans = [
  {
    name: "Débutant",
    price: "Gratuit",
    period: "",
    desc: "Pour les petits ateliers qui démarrent",
    features: ["1 utilisateur", "Réparations illimitées", "Inventaire de base", "Suivi client"],
    cta: "Commencer gratuitement",
    highlight: false,
    soon: false,
  },
  {
    name: "Pro",
    price: "49 DT",
    period: "/mois",
    desc: "Pour les ateliers en croissance",
    features: ["5 utilisateurs", "Tout de Débutant", "Gestion fournisseurs", "Statistiques avancées", "Support prioritaire"],
    cta: "Prochainement",
    highlight: true,
    soon: true,
  },
  {
    name: "Entreprise",
    price: "99 DT",
    period: "/mois",
    desc: "Pour les multi-boutiques",
    features: ["Utilisateurs illimités", "Tout de Pro", "Multi-boutiques", "API & intégrations", "Support dédié"],
    cta: "Prochainement",
    highlight: false,
    soon: true,
  },
];

const stats = [
  { value: "500+", label: "Ateliers actifs" },
  { value: "50K+", label: "Réparations suivies" },
  { value: "99.9%", label: "Disponibilité" },
  { value: "4.8/5", label: "Satisfaction client" },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  const ctaLink = user ? "/" : "/auth";
  const ctaLabel = user ? "Accéder au Dashboard" : "Essayer Gratuitement";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/landing" className="flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">RepairPro</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Tarifs
            </a>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link to={ctaLink}>
              <Button size="sm">{ctaLabel}</Button>
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-border px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground py-2">
                Fonctionnalités
              </a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground py-2">
                Tarifs
              </a>
              <Link to="/auth" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">Connexion</Button>
              </Link>
              <Link to={ctaLink} onClick={() => setMenuOpen(false)}>
                <Button className="w-full">{ctaLabel}</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-sidebar-background py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 80%, hsl(var(--accent)) 0%, transparent 50%)"
        }} />
        <motion.div
          className="relative mx-auto max-w-4xl px-4 text-center sm:px-6"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <Badge className="mb-6 bg-primary text-primary-foreground border-primary/50">
              🚀 Nouveau — Suivi client par lien en temps réel
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl font-extrabold tracking-tight text-sidebar-foreground sm:text-5xl lg:text-6xl">
            Le Logiciel Tout-en-Un pour les{" "}
            <span className="text-sidebar-primary">Pros de la Réparation Mobile</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base text-sidebar-foreground/80 sm:text-lg">
            Gérez votre inventaire, suivez vos réparations, facturez vos clients et pilotez votre activité
            — le tout depuis une seule plateforme pensée pour les ateliers en Tunisie et en Afrique.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link to={ctaLink}>
              <Button size="lg" className="w-full sm:w-auto text-base px-8">
                {ctaLabel} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base border-sidebar-foreground/30 text-sidebar-foreground hover:bg-sidebar-foreground/10">
                Découvrir les fonctionnalités
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-card py-8">
        <motion.div
          className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-2xl font-bold text-primary sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            className="text-center"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tout ce qu'il faut pour gérer votre atelier
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Des outils professionnels conçus pour simplifier votre quotidien.
            </p>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={scaleIn} whileHover={{ y: -6, transition: { duration: 0.2 } }}>
                <Card className="group h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Extra value props */}
      <section className="border-y border-border bg-muted/50 py-16 sm:py-20">
        <motion.div
          className="mx-auto max-w-5xl px-4 sm:px-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Shield, title: "Sécurisé", desc: "Données chiffrées, accès par rôle et sauvegarde automatique." },
              { icon: BarChart3, title: "Analytique", desc: "Tableaux de bord, statistiques de ventes et marges en temps réel." },
              { icon: Users, title: "Multi-équipe", desc: "Gérez vos employés, assignez des tâches et contrôlez les accès." },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <item.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <motion.div
            className="text-center"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Des tarifs simples et transparents
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Commencez gratuitement, évoluez quand vous êtes prêt.
            </p>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-6 sm:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {pricingPlans.map((plan) => (
              <motion.div key={plan.name} variants={scaleIn} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <Card
                  className={`relative flex h-full flex-col ${plan.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}
                >
                  {plan.soon && (
                    <Badge className="absolute -top-3 right-4 bg-accent text-accent-foreground">
                      Prochainement
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.desc}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-2.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      {plan.soon ? (
                        <Button variant="outline" className="w-full" disabled>
                          {plan.cta}
                        </Button>
                      ) : (
                        <Link to={ctaLink}>
                          <Button className="w-full">{plan.cta}</Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sidebar-background py-16 sm:py-20">
        <motion.div
          className="mx-auto max-w-3xl px-4 text-center sm:px-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-bold text-sidebar-foreground sm:text-3xl">
            Prêt à digitaliser votre atelier ?
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-xl text-sidebar-foreground/80">
            Rejoignez des centaines d'ateliers qui utilisent RepairPro pour gérer leur activité au quotidien.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link to={ctaLink}>
              <Button size="lg" className="mt-8 px-8 text-base">
                {ctaLabel} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">RepairPro</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RepairPro. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
