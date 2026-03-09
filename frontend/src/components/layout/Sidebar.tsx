import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { icon: '⊞', label: 'Dashboard',       to: '/',           end: true  },
  { icon: '◈', label: 'Trace Explorer',  to: '/traces',     end: false },
  { icon: '⬡', label: 'Experiments',    to: '/experiments', end: false },
  { icon: '≡', label: 'Datasets',        to: '/datasets',   end: false },
  { icon: '◎', label: 'Evaluation',      to: '/evaluation', end: false },
  { icon: '⊛', label: 'System Insights', to: '/insights',   end: false },
] as const;

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.dot} aria-hidden />
        <span className={styles.name}>AgentScope</span>
        <span className={styles.studioLabel}>Studio</span>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.link}${isActive ? ' ' + styles.active : ''}`
            }
          >
            <span className={styles.icon} aria-hidden>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.version}>v0.1.0</span>
      </div>
    </aside>
  );
}
