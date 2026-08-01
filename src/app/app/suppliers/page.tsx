"use client";

import React, { useState, useEffect } from "react";
import { Plus, Loader2, Building2, Trash2, Pencil, X, Check, Upload } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

interface Supplier {
  id: string;
  name: string;
  code: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", contact_person: "", phone: "", email: "" });
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/suppliers");
        const data = await res.json();
        if (!cancelled) setSuppliers(data.suppliers || []);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (editId) {
      await fetch(`/api/suppliers/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", code: "", contact_person: "", phone: "", email: "" });
    fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    fetchSuppliers();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/suppliers/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ imported: 0, skipped: 0, errors: [data.error || "Import failed"] });
      } else {
        setImportResult(data);
      }
      fetchSuppliers();
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Network error"] });
    }
    setImportLoading(false);
    e.target.value = "";
  };

  const startEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      code: s.code || "",
      contact_person: s.contact_person || "",
      phone: s.phone || "",
      email: s.email || "",
    });
    setEditId(s.id);
    setShowForm(true);
  };

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} supplier${suppliers.length !== 1 ? "s" : ""} in analytics database`}
      />

      <div className="mb-6 flex justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-white bg-gray-4 hover:bg-gray-5 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Import CSV
        </button>
        <button
          onClick={() => {
            setEditId(null);
            setForm({ name: "", code: "", contact_person: "", phone: "", email: "" });
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-white bg-teal hover:bg-teal/80 transition-colors cursor-pointer"
        >
          <Plus size={14} />
          New Supplier
        </button>
      </div>

      {showForm && (
        <div className="pm-dash-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-[14px] font-semibold">{editId ? "Edit Supplier" : "New Supplier"}</span>
            <button onClick={() => setShowForm(false)} className="cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-5 block mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-5 block mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-5 block mb-1">Contact Person</label>
              <input
                value={form.contact_person}
                onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                className="w-full bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-5 block mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-5 block mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-2 text-[13px]"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-white bg-teal hover:bg-teal/80 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Check size={14} />
            {editId ? "Update" : "Create"}
          </button>
        </div>
      )}

      {importResult && (
        <div className={`pm-dash-card p-4 mb-6 ${importResult.errors.length > 0 && importResult.imported === 0 ? "border-red/30" : "border-teal/30"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium">
              Import complete: {importResult.imported} imported, {importResult.skipped} skipped
            </span>
            <button onClick={() => setImportResult(null)} className="cursor-pointer"><X size={14} /></button>
          </div>
          {importResult.errors.length > 0 && (
            <div className="text-[11px] text-red mt-2 space-y-0.5">
              {importResult.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="pm-dash-card p-8 text-center">
          <Building2 size={24} className="mx-auto mb-3 text-gray-5" />
          <div className="text-[13px] text-gray-5">No suppliers found in analytics database</div>
        </div>
      ) : (
        <div className="pm-dash-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--ws-border,#e5e5e5)]">
                <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-5 px-4 py-3">Name</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-5 px-4 py-3 hidden sm:table-cell">Code</th>
                <th className="text-left text-[10px] font-mono uppercase tracking-wider text-gray-5 px-4 py-3 hidden md:table-cell">Contact</th>
                <th className="text-right text-[10px] font-mono uppercase tracking-wider text-gray-5 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-[var(--ws-border,#e5e5e5)] last:border-0 hover:bg-[var(--ws-bg)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium">{s.name}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-[11px] font-mono text-gray-5">{s.code || "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-[11px] text-gray-5">
                      {s.contact_person && <div>{s.contact_person}</div>}
                      {s.phone && <div className="font-mono">{s.phone}</div>}
                      {!s.contact_person && !s.phone && <span>—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="cursor-pointer p-1 hover:text-teal transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="cursor-pointer p-1 hover:text-red transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}