"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken, getStoredBusinessId } from "@/lib/storage";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Tag, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type PromoCode = {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number | null;
  valid_from: string | null;
  valid_to: string | null;
  status: "active" | "inactive";
  currently_valid: boolean;
  created_at: string;
};

type PromoStats = {
  total_count: number;
  active_count: number;
  total_redemptions: number;
};

const emptyForm = {
  code: "",
  discount_type: "percentage" as const,
  discount_value: "10",
  usage_limit: "",
  per_customer_limit: "",
  valid_from: "",
  valid_to: "",
  status: "active" as const,
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDiscount(p: PromoCode) {
  return p.discount_type === "percentage"
    ? `${p.discount_value}%`
    : `₦${Number(p.discount_value).toLocaleString()}`;
}

function effectiveStatus(p: PromoCode) {
  if (p.status === "inactive") return { label: "Inactive", variant: "secondary" as const };
  if (!p.currently_valid) {
    if (p.usage_limit != null && p.usage_count >= p.usage_limit) {
      return { label: "Limit reached", variant: "outline" as const };
    }
    return { label: "Expired", variant: "outline" as const };
  }
  return { label: "Active", variant: "default" as const };
}

export default function PromosPage() {
  const router = useRouter();
  const { businessId, user } = useAuth();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canView =
    user?.role === "admin" || user?.permissions?.promos?.view === true;
  const canCreate =
    user?.role === "admin" || user?.permissions?.promos?.create === true;
  const canEdit =
    user?.role === "admin" || user?.permissions?.promos?.edit === true;

  useEffect(() => {
    if (user && user.role !== "admin" && user.permissions) {
      if (!user.permissions.promos?.view) {
        router.push("/dashboard/business");
      }
    }
  }, [user, router]);

  const resolvedBusinessId = businessId || getStoredBusinessId() || "";

  const headers = useCallback(() => {
    const token = getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Business-Id": resolvedBusinessId,
    };
  }, [resolvedBusinessId]);

  const loadPromos = useCallback(async (signal?: AbortSignal) => {
    if (!resolvedBusinessId || !canView) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${resolvedBusinessId}/promo_codes`,
        { headers: headers(), signal },
      );
      let data: { error?: string; errors?: string[]; promo_codes?: PromoCode[]; stats?: PromoStats } = {};
      try {
        data = await res.json();
      } catch {
        if (!signal?.aborted) {
          toast.error("Failed to load promo codes", { id: "promo-load-error" });
        }
        return;
      }
      if (!res.ok) {
        if (!signal?.aborted) {
          const message =
            data.error ||
            data.errors?.join(", ") ||
            (res.status === 403 ? "You don't have permission to view promo codes" : "Failed to load promo codes");
          toast.error(message, { id: "promo-load-error" });
        }
        return;
      }
      setPromos(data.promo_codes || []);
      setStats(data.stats || null);
    } catch (err) {
      if (!signal?.aborted && err instanceof Error && err.name !== "AbortError") {
        toast.error("Unable to load promo codes", { id: "promo-load-error" });
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [resolvedBusinessId, canView, headers]);

  useEffect(() => {
    if (!canView || !resolvedBusinessId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    loadPromos(controller.signal);
    return () => controller.abort();
  }, [loadPromos, canView, resolvedBusinessId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditing(p);
    setForm({
      code: p.code,
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      usage_limit: p.usage_limit != null ? String(p.usage_limit) : "",
      per_customer_limit: p.per_customer_limit != null ? String(p.per_customer_limit) : "",
      valid_from: p.valid_from ? p.valid_from.split("T")[0] : "",
      valid_to: p.valid_to ? p.valid_to.split("T")[0] : "",
      status: p.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedBusinessId) return;

    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      status: form.status,
    };
    if (form.usage_limit) payload.usage_limit = parseInt(form.usage_limit, 10);
    if (form.per_customer_limit) payload.per_customer_limit = parseInt(form.per_customer_limit, 10);
    if (form.valid_from) payload.valid_from = form.valid_from;
    if (form.valid_to) payload.valid_to = form.valid_to;

    setSaving(true);
    try {
      const url = editing
        ? `${API_URL}/api/v1/user_businesses/${resolvedBusinessId}/promo_codes/${editing.id}`
        : `${API_URL}/api/v1/user_businesses/${resolvedBusinessId}/promo_codes`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify({ promo_code: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.errors?.join(", ") || data.error || "Failed to save promo code");
        return;
      }
      toast.success(editing ? "Promo code updated" : "Promo code created");
      setDialogOpen(false);
      loadPromos();
    } catch {
      toast.error("Unable to save promo code");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: PromoCode) => {
    if (!resolvedBusinessId) return;
    const newStatus = p.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${resolvedBusinessId}/promo_codes/${p.id}`,
        {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({ promo_code: { status: newStatus } }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.errors?.join(", ") || "Failed to update status");
        return;
      }
      toast.success(`Promo ${newStatus === "active" ? "activated" : "deactivated"}`);
      loadPromos();
    } catch {
      toast.error("Unable to update status");
    }
  };

  if (user && user.role !== "admin" && !user.permissions?.promos?.view) {
    return (
      <DashboardLayout activeTab="promos">
        <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center">
          <Tag className="mb-3 h-8 w-8 text-slate-300" />
          <h2 className="text-sm font-semibold text-slate-800">Access restricted</h2>
          <p className="mt-1 text-xs text-slate-500">
            You don&apos;t have permission to view promo codes.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="promos">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Promo codes</h1>
            <p className="text-xs text-slate-500">
              Discount codes guests can apply when booking on Shettar
            </p>
          </div>
          {canCreate && (
            <Button size="sm" onClick={openCreate} className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create promo
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid shrink-0 grid-cols-3 gap-2">
            {[
              { label: "Total codes", value: stats.total_count },
              { label: "Active now", value: stats.active_count },
              { label: "Redemptions", value: stats.total_redemptions },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Your promo codes</h2>
                <p className="text-[11px] text-slate-500">Unique across Shettar · applied at checkout</p>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : promos.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                <Tag className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No promo codes yet</p>
                <p className="mt-1 text-xs">Create your first code to offer discounts.</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur-sm">
                  <tr className="border-b border-slate-100 text-left text-slate-400">
                    <th className="px-3 py-2.5 font-semibold">Code</th>
                    <th className="px-3 py-2.5 font-semibold">Discount</th>
                    <th className="px-3 py-2.5 font-semibold">Validity</th>
                    <th className="px-3 py-2.5 font-semibold">Usage</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => {
                    const st = effectiveStatus(p);
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">{p.code}</td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">{formatDiscount(p)}</td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {p.valid_from || p.valid_to
                            ? `${formatDate(p.valid_from)} → ${formatDate(p.valid_to)}`
                            : "No date limit"}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {p.usage_count}
                          {p.usage_limit != null ? ` / ${p.usage_limit}` : " / ∞"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={st.variant} className="rounded-md px-1.5 py-0 text-[10px]">
                            {st.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {canEdit ? (
                            <div className="flex justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleStatus(p)}
                                title={p.status === "active" ? "Deactivate" : "Activate"}
                              >
                                {p.status === "active" ? (
                                  <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl border-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Edit promo code" : "Create promo code"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editing
                ? "Update discount rules and limits. The code string cannot be changed."
                : "Guests can apply this code when booking your property."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs">Code</Label>
              <Input
                id="code"
                className="h-9 rounded-lg border-slate-200 font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={!!editing}
                placeholder="SUMMER20"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <select
                  className={cn(
                    "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm",
                  )}
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discount_type: e.target.value as "percentage" | "fixed_amount",
                    })
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed amount (₦)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-9 rounded-lg border-slate-200"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Usage limit</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  className="h-9 rounded-lg border-slate-200"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Per customer</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  className="h-9 rounded-lg border-slate-200"
                  value={form.per_customer_limit}
                  onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valid from</Label>
                <Input
                  type="date"
                  className="h-9 rounded-lg border-slate-200"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valid to</Label>
                <Input
                  type="date"
                  className="h-9 rounded-lg border-slate-200"
                  value={form.valid_to}
                  onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="h-8 rounded-lg bg-indigo-600 text-xs hover:bg-indigo-700">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
