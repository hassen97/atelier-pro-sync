import { useState } from "react";
import { useAdminPlans, useUpdatePlan, SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Pencil, Star, Save } from "lucide-react";

export function AdminPlansView() {
  const { data, isLoading } = useAdminPlans();
  const updatePlan = useUpdatePlan();
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [editFeatures, setEditFeatures] = useState("");

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditPlan(plan);
    setEditFeatures(plan.features.join("\n"));
  };

  const handleSave = () => {
    if (!editPlan) return;
    const features = editFeatures.split("\n").filter(f => f.trim());
    updatePlan.mutate({
      id: editPlan.id,
      name: editPlan.name,
      price: editPlan.price,
      currency: editPlan.currency,
      period: editPlan.period,
      description: editPlan.description,
      features: features as any,
      highlight: editPlan.highlight,
      is_active: editPlan.is_active,
    }, {
      onSuccess: () => setEditPlan(null),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" /></div>;
  }

  const plans = data?.plans || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-white">Tarifs & Plans</h2>

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
              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => handleEdit(plan)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editPlan} onOpenChange={() => setEditPlan(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Modifier le plan : {editPlan?.name}</DialogTitle>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Nom</Label>
                  <Input value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Prix</Label>
                  <Input type="number" value={editPlan.price} onChange={e => setEditPlan({ ...editPlan, price: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Devise</Label>
                  <Input value={editPlan.currency} onChange={e => setEditPlan({ ...editPlan, currency: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-slate-300">Période</Label>
                  <Input value={editPlan.period} onChange={e => setEditPlan({ ...editPlan, period: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="/mois" />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Description</Label>
                <Input value={editPlan.description || ""} onChange={e => setEditPlan({ ...editPlan, description: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-slate-300">Fonctionnalités (une par ligne)</Label>
                <Textarea value={editFeatures} onChange={e => setEditFeatures(e.target.value)} className="bg-white/5 border-white/10 text-white min-h-[120px]" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editPlan.highlight} onCheckedChange={v => setEditPlan({ ...editPlan, highlight: v })} />
                  <Label className="text-slate-300">Plan populaire</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editPlan.is_active} onCheckedChange={v => setEditPlan({ ...editPlan, is_active: v })} />
                  <Label className="text-slate-300">Actif</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditPlan(null)} className="text-slate-400">Annuler</Button>
            <Button onClick={handleSave} disabled={updatePlan.isPending} className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30">
              {updatePlan.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
