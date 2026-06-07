export default function AdminProductsPage() {
  return (
    <div className="w-full px-6 py-10">
      <header>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Catalog</span>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Products</h1>
        <p className="mt-2 w-full text-sm text-ink-soft">
          Product management is coming soon. You will be able to add items, set prices, and manage
          inventory from here.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-ink-soft">
          No products yet. This section is a placeholder for the MVP.
        </p>
      </div>
    </div>
  );
}
