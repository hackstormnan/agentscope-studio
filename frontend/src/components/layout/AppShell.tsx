import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import styles from './AppShell.module.css';

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
