"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getAuthToken } from "@/lib/storage";
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

  const headers = useCallback(() => {
    const token = getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Business-Id": businessId || "",
    };
  }, [businessId]);

  const loadPromos = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/promo_codes`, {
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load promo codes");
        return;
      }
      setPromos(data.promo_codes || []);
      setStats(data.stats || null);
    } catch {
      toast.error("Unable to load promo codes");
    } finally {
      setLoading(false);
    }
  }, [businessId, headers]);

  useEffect(() => {
    if (canView) loadPromos();
  }, [loadPromos, canView]);

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
    if (!businessId) return;

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
        ? `${API_URL}/api/v1/user_businesses/${businessId}/promo_codes/${editing.id}`
        : `${API_URL}/api/v1/user_businesses/${businessId}/promo_codes`;
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
    if (!businessId) return;
    const newStatus = p.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/promo_codes/${p.id}`,
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Tag className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Access restricted</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You don&apos;t have permission to view promo codes.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="promos">
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Promo codes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create discount codes guests can apply when booking your property on Shettar.
            </p>
          </div>
          {canCreate && (
            <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create promo
            </Button>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total codes", value: stats.total_count },
              { label: "Active now", value: stats.active_count },
              { label: "Redemptions", value: stats.total_redemptions },
            ].map((s) => (
              <Card key={s.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{s.label}</CardDescription>
                  <CardTitle className="text-3xl">{s.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Your promo codes
            </CardTitle>
            <CardDescription>
              Codes are unique across Shettar. Guests enter them at checkout on your listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : promos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No promo codes yet</p>
                <p className="text-sm mt-1">Create your first code to offer discounts to guests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Code</th>
                      <th className="pb-3 font-medium">Discount</th>
                      <th className="pb-3 font-medium">Validity</th>
                      <th className="pb-3 font-medium">Usage</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {promos.map((p) => {
                      const st = effectiveStatus(p);
                      return (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="py-3 font-mono font-semibold">{p.code}</td>
                          <td className="py-3">{formatDiscount(p)}</td>
                          <td className="py-3 text-muted-foreground">
                            {p.valid_from || p.valid_to
                              ? `${formatDate(p.valid_from)} → ${formatDate(p.valid_to)}`
                              : "No date limit"}
                          </td>
                          <td className="py-3">
                            {p.usage_count}
                            {p.usage_limit != null ? ` / ${p.usage_limit}` : " / ∞"}
                          </td>
                          <td className="py-3">
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </td>
                          <td className="py-3 text-right">
                            {canEdit ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleStatus(p)}
                                  title={p.status === "active" ? "Deactivate" : "Activate"}
                                >
                                  {p.status === "active" ? (
                                    <ToggleRight className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <ToggleLeft className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit promo code" : "Create promo code"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update discount rules and limits. The code string cannot be changed."
                : "Guests can apply this code when booking your property."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                className="font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={!!editing}
                placeholder="SUMMER20"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
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
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usage limit</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Per customer</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.per_customer_limit}
                  onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valid from</Label>
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid to</Label>
                <Input
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
