import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  UploadCloud,
  LayoutDashboard,
  History,
  Share2,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const navSections = [
    {
      title: 'Core Studio',
      shortTitle: 'CORE',
      items: [
        { to: '/', label: 'New Analysis', icon: UploadCloud, end: true, badge: 'Studio' },
        { to: '/dashboard', label: 'Analysis Dashboard', icon: LayoutDashboard },
        { to: '/history', label: 'Analysis History', icon: History },
      ],
    },
    {
      title: 'Advanced Analytics',
      shortTitle: 'ADVA',
      items: [
        { to: '/graph', label: 'Knowledge Graph', icon: Share2, badge: 'Neo4j' },
        { to: '/diagnostics', label: 'ML Diagnostics', icon: AlertTriangle, badge: 'iForest' },
      ],
    },
    {
      title: 'Intelligence & System',
      shortTitle: 'INTEL',
      items: [
        { to: '/models', label: 'AI Model Hub', icon: Cpu, badge: 'LLM' },
      ],
    },
  ];

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${
        isCollapsed ? styles.sidebarCollapsed : ''
      }`}
    >
      <div
        className={styles.brand}
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        title={isCollapsed ? 'Click to Expand Sidebar' : 'Click to Collapse Sidebar'}
      >
        <div className={styles.logoIcon}>
          <img src="/logo.svg" alt="NexusMind Logo" width="36" height="36" />
        </div>
        {!isCollapsed && (
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>NexusMind</span>
            <span className={styles.brandSubtitle}>ANALYTICAL INTELLIGENCE</span>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={styles.sectionGroup}>
            <div className={styles.sectionHeader}>
              <span>{isCollapsed ? section.shortTitle : section.title}</span>
            </div>
            <div className={styles.sectionItems}>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    data-tooltip={item.label}
                    className={({ isActive }) =>
                      `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={styles.navItemMain}>
                      <IconComponent size={19} className={styles.navIcon} />
                      {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
