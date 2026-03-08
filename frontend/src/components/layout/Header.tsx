import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.dot} aria-hidden />
          <span className={styles.name}>AgentScope Studio</span>
        </div>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.link}${isActive ? ' ' + styles.active : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/traces"
            className={({ isActive }) =>
              `${styles.link}${isActive ? ' ' + styles.active : ''}`
            }
          >
            Traces
          </NavLink>
          <NavLink
            to="/experiments"
            className={({ isActive }) =>
              `${styles.link}${isActive ? ' ' + styles.active : ''}`
            }
          >
            Experiments
          </NavLink>
        </nav>
        <div className={styles.right}>
          <span className={styles.version}>v0.1.0</span>
        </div>
      </div>
    </header>
  );
}
