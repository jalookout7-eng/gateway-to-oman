"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories?includeInactive=1", {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not load categories.");
        return;
      }
      const data = (await res.json()) as { categories: Category[] };
      setCategories(data.categories);
    } catch {
      setError("Network error loading categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not create category.");
      return;
    }
    setNewName("");
    fetchCategories();
  }

  async function handleUpdate(cat: Category, patch: Partial<Category>) {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not update category.");
      return;
    }
    setError("");
    fetchCategories();
  }

  async function handleDelete(cat: Category) {
    if (
      !window.confirm(
        `Delete "${cat.name}" permanently?\n\nIf any listings use this category the delete will be blocked — deactivate it instead.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not delete category.");
      return;
    }
    setError("");
    fetchCategories();
  }

  const sorted = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Listing categories shown in the marketplace filter and the listing form. Deactivate to hide
        from dropdowns without breaking existing listings.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <ul className="space-y-2">
          {sorted.length === 0 && (
            <li className="text-xs text-gray-400 italic">No categories yet — add one below.</li>
          )}
          {sorted.map((cat) => (
            <li
              key={cat.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                cat.active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"
              }`}
            >
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />

              <input
                type="text"
                defaultValue={cat.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== cat.name) handleUpdate(cat, { name: v });
                }}
                className="text-sm flex-1 min-w-0 px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 bg-transparent"
                aria-label="Category name"
              />

              <code className="text-xs text-gray-400 hidden sm:inline">{cat.slug}</code>

              <input
                type="number"
                defaultValue={cat.sort_order}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v !== cat.sort_order)
                    handleUpdate(cat, { sort_order: v });
                }}
                className="w-16 text-xs px-2 py-1 rounded border border-gray-200"
                aria-label="Sort order"
                title="Sort order"
              />

              <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cat.active}
                  onChange={(e) => handleUpdate(cat, { active: e.target.checked })}
                  className="cursor-pointer"
                />
                active
              </label>

              <button
                onClick={() => handleDelete(cat)}
                aria-label={`Delete ${cat.name}`}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="Add a new category…"
          className="text-sm flex-1 px-3 py-1.5 rounded border border-gray-200 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || adding}
          className="text-sm px-3 py-1.5 gold-gradient text-white rounded font-medium hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
