export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[76px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
    </div>
  )
}
