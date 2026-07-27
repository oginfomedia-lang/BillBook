export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-slate-200" style={{ width: `${60 + ((r + c) % 3) * 15}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-7 w-32 animate-pulse rounded bg-slate-200" />
    </div>
  );
}
