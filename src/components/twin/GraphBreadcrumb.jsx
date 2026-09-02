import { ChevronRight, ArrowLeft } from 'lucide-react'

export default function GraphBreadcrumb({ crumbs, onBack }) {
  if (!crumbs?.length) return null

  return (
    <div className="graph-breadcrumb">
      <button className="breadcrumb-back" onClick={onBack} aria-label="Back to full ecosystem">
        <ArrowLeft size={12} />
      </button>
      {crumbs.map((crumb, i) => (
        <span key={`${crumb}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {i > 0 && <ChevronRight size={11} className="breadcrumb-chevron" />}
          <span className={`breadcrumb-crumb ${i === crumbs.length - 1 ? '' : 'muted'}`}>{crumb}</span>
        </span>
      ))}
    </div>
  )
}
