import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  UploadCloud,
  LayoutDashboard,
  History,
  Share2,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  BookOpen,
  Layers,
  Sparkles
} from 'lucide-react';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose }) {
  const navSections = [
    {
      title: 'Core Studio',
      items: [
        { to: '/', label: 'New Analysis', icon: UploadCloud, end: true, badge: 'Studio' },
        { to: '/dashboard', label: 'Analysis Dashboard', icon: LayoutDashboard },
        { to: '/history', label: 'Analysis History', icon: History },
      ],
    },
    {
      title: 'Advanced Analytics',
      items: [
        { to: '/graph', label: 'Knowledge Graph', icon: Share2, badge: 'Neo4j' },
        { to: '/diagnostics', label: 'ML Diagnostics', icon: AlertTriangle, badge: 'iForest' },
      ],
    },
    {
      title: 'Intelligence & System',
      items: [
        { to: '/models', label: 'AI Model Hub', icon: Cpu, badge: 'LLM' },
        { to: '/audit', label: 'Audit & Compliance', icon: ShieldCheck, badge: '21 CFR' },
        { to: '/docs', label: 'Pipeline Docs & API', icon: BookOpen },
      ],
    },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}>
        <div className={styles.logoIcon}>
          <img src="/logo.svg" alt="NexusMind Logo" width="36" height="36" />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandTitle}>NexusMind</span>
          <span className={styles.brandSubtitle}>ANALYTICAL INTELLIGENCE</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={styles.sectionGroup}>
            <div className={styles.sectionHeader}>
              <span>{section.title}</span>
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
                    className={({ isActive }) =>
                      `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                    }
                  >
                    <div className={styles.navItemMain}>
                      <IconComponent size={18} className={styles.navIcon} />
                      <span className={styles.navLabel}>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={styles.navBadge}>{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.aiBadgeCard}>
          <div className={styles.aiBadgeHeader}>
            <Sparkles size={14} className={styles.aiSparkleIcon} />
            <span>Hybrid Analytical Core</span>
          </div>
          <p className={styles.aiBadgeDesc}>
            Deterministic Engine + Isolation Forest + LLaMA 3.3 70B
          </p>
        </div>

        <div className={styles.statusFooter}>
          <div className={styles.statusIndicator}>
            <div className={styles.statusDot}></div>
            <span>System Operational</span>
          </div>
          <span className={styles.versionTag}>v1.2.0</span>
        </div>
      </div>
    </aside>
  );
}
