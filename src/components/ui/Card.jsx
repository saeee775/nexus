/**
 * Base elevated surface used throughout NEXUS. Kept intentionally minimal —
 * most visual character comes from spacing, typography, and border color,
 * not heavy card chrome.
 */
export default function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  )
}
