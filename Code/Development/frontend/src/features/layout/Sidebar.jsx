import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, History, FileText, Activity, Layers } from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <Layers size={20} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>NexusMind</span>
            <span className={styles.brandSubtitle}>Analytical Intelligence</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <UploadCloud size={20} />
            <span>New Analysis</span>
          </NavLink>

          <NavLink
            to="/history"
            onClick={onClose}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <History size={20} />
            <span>Analysis History</span>
          </NavLink>
        </nav>

        <div className={styles.footer}>
          <span>Pipeline Engine: v1.0.0</span>
          <div className={styles.statusIndicator}>
            <div className={styles.statusDot}></div>
            <span>System Operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}
