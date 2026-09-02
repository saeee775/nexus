export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <div className="brand">
          <span className="brand-mark">
            <span className="status-dot" />
            NEXUS
          </span>
          <span className="brand-subtitle">Business Dependency Intelligence</span>
        </div>
      </div>

      <div className="header-right">
        <div className="live-badge">
          <span className="live-dot" />
          <span className="live-badge-text">Digital Twin Live</span>
        </div>
      </div>
    </header>
  )
}
