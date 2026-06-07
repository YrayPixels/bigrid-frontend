export default function StorefrontNotFound() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Store not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This storefront does not exist or has not been published yet.
      </p>
    </div>
  );
}
