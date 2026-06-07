export function ContentPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="w-full px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground whitespace-pre-line">
        {body}
      </div>
    </div>
  );
}
