export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-32 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-4 bg-gray-200 rounded w-4/6" />
      <div className="h-4 bg-gray-200 rounded w-3/6" />
    </div>
  );
}
