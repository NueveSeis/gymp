export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-20" />
      <div className="skeleton h-24" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="skeleton h-32" />
      ))}
    </div>
  )
}
