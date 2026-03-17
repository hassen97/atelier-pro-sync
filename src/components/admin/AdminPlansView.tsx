import { useState } from "react";
import { useAdminPlans, useUpdatePlan, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Pencil, Star, Save, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const emptyPlan: Partial<SubscriptionPlan> = {
  name: "",
  price: 0,
  currency: "DT",
  period: "/mois",
  description: "",
  features: [],
  highlight: false,
  sort_order: 0,
  is_active: true,
};

export function AdminPlansView() {
  const { data, isLoading } = useAdminPlans();
  const updatePlan = useUpdatePlan();
  const qc = useQueryClient();
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [editFeatures, setEditFeatures] = useState("");
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>(emptyPlan);
  const [newFeatures, setNewFeatures] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditPlan(plan);
    setEditFeatures(plan.features.join("\n"));
  };

  const handleSave = () => {
    if (!editPlan) return;
    const features = editFeatures.split("\n").filter((f) => f.trim());
    updatePlan.mutate(
      {
        id: editPlan.id,
        name: editPlan.name,
        price: editPlan.price,
        currency: editPlan.currency,
        period: editPlan.period,
        description: editPlan.description,
        features: features as any,
        highlight: editPlan.highlight,
        is_active: editPlan.is_active,
      },
      { onSuccess: () => setEditPlan(null) }
    );
  };

  const handleCreate = async () => {
    if (!newPlan.name?.trim()) return;
    setSaving(true);
    const features = newFeatures.split("\n").filter((f) => f.trim());
    const { error } = await supabase
      .from("subscription_plans")
      .insert({
        name: newPlan.name!,
        price: newPlan.price ?? 0,
        currency: newPlan.currency ?? "DT",
        period: newPlan.period ?? "/mois",
        description: newPlan.description ?? null,
        features: features as any,
        highlight: newPlan.highlight ?? false,
        sort_order: newPlan.sort_order ?? 0,
        is_active: newPlan.is_active ?? true,
      });
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la création");
    } else {
      toast.success("Plan créé");
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["public-subscription-plans"] });
      setCreating(false);
      setNewPlan(emptyPlan);
      setNewFeatures("");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error("Impossible de supprimer ce plan");
    } else {
      toast.success("Plan supprimé");
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["public-subscription-plans"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  const plans = data?.plans || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Tarifs & Plans</h2>
        <Button
          onClick={() => { setCreating(true); setNewPlan(emptyPlan); setNewFeatures(""); }}
          className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouveau plan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="admin-glass-card rounded-xl p-5 relative">
            {plan.highlight && (
              <Badge className="absolute -top-2 right-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-[10px]">
                <Star className="h-3 w-3 mr-1" /> Populaire
              </Badge>
            )}
            <div className="mb-4">
              <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
              <p className="text-slate-400 text-sm">{plan.description}</p>
              <div className="mt-3">
                <span className="text-3xl font-bold text-[#00D4FF] font-mono-numbers">
                  {plan.price === 0 ? "Gratuit" : `${plan.price} ${plan.currency}`}
                </span>
                {plan.period && <span className="text-slate-500 text-sm ml-1">{plan.period}</span>}
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm text-slate-400">• {f}</li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Actif</span>
                <span className={`w-2 h-2 rounded-full ${plan.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-white h-7 px-2"
                  onClick={() => handleEdit(plan)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-red-400 h-7 px-2"
                  disabled={deletingId === plan.id}
                  onClick={() => handleDelete(plan.id)}
                >
                  {deletingId === plan.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={(v) => !v && setCreating(false)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Créer un nouveau plan</DialogTitle>
          </DialogHeader>
          <PlanForm
            plan={newPlan}
            setPlan={setNewPlan}
            features={newFeatures}
            setFeatures={setNewFeatures}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)} className="text-slate-400">Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !newPlan.name?.trim()}
              className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer le plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPlan} onOpenChange={() => setEditPlan(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Modifier le plan : {editPlan?.name}</DialogTitle>
          </DialogHeader>
          {editPlan && (
            <PlanForm
              plan={editPlan}
              setPlan={(v) => setEditPlan(v as SubscriptionPlan)}
              features={editFeatures}
              setFeatures={setEditFeatures}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditPlan(null)} className="text-slate-400">Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={updatePlan.isPending}
              className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
            >
              {updatePlan.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  plan,
  setPlan,
  features,
  setFeatures,
}: {
  plan: Partial<SubscriptionPlan>;
  setPlan: (v: Partial<SubscriptionPlan>) => void;
  features: string;
  setFeatures: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Nom</Label>
          <Input
            value={plan.name ?? ""}
            onChange={(e) => setPlan({ ...plan, name: e.target.value })}
            className="bg-white/5 border-white/10 text-white"
            placeholder="Pro, Starter..."
          />
        </div>
        <div>
          <Label className="text-slate-300">Prix</Label>
          <Input
            type="number"
            value={plan.price ?? 0}
            onChange={(e) => setPlan({ ...plan, price: Number(e.target.value) })}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Devise</Label>
          <Input
            value={plan.currency ?? "DT"}
            onChange={(e) => setPlan({ ...plan, currency: e.target.value })}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div>
          <Label className="text-slate-300">Période</Label>
          <Input
            value={plan.period ?? "/mois"}
            onChange={(e) => setPlan({ ...plan, period: e.target.value })}
            className="bg-white/5 border-white/10 text-white"
            placeholder="/mois"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Description</Label>
          <Input
            value={plan.description ?? ""}
            onChange={(e) => setPlan({ ...plan, description: e.target.value })}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div>
          <Label className="text-slate-300">Ordre d'affichage</Label>
          <Input
            type="number"
            value={plan.sort_order ?? 0}
            onChange={(e) => setPlan({ ...plan, sort_order: Number(e.target.value) })}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>
      <div>
        <Label className="text-slate-300">Fonctionnalités (une par ligne)</Label>
        <Textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          className="bg-white/5 border-white/10 text-white min-h-[120px]"
          placeholder="Gestion des stocks&#10;Module réparations&#10;Support prioritaire"
        />
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={plan.highlight ?? false}
            onCheckedChange={(v) => setPlan({ ...plan, highlight: v })}
          />
          <Label className="text-slate-300">Plan populaire</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={plan.is_active ?? true}
            onCheckedChange={(v) => setPlan({ ...plan, is_active: v })}
          />
          <Label className="text-slate-300">Actif</Label>
        </div>
      </div>
    </div>
  );
}
