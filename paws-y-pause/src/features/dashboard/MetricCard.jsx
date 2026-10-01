export default function MetricCard({ label, value, detail, icon }) {
  return <article className="metric-card"><span className="metric-icon" aria-hidden="true">{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>
}
