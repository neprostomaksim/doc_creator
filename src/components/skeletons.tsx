export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      <div className="skeleton mb-4 h-8 w-40" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton mb-2 h-4 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="skeleton mb-6 h-8 w-40" />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton mb-2 h-7 w-12" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 w-32" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
