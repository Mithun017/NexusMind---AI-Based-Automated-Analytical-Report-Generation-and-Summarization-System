import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Database, Server, Plus, BookOpen, Activity } from 'lucide-react';
import { checkHealth } from '../../api/upload';
import styles from './Navbar.module.css';

const ROUTE_MAP = {
  '/': { title: 'Analysis Studio', section: 'Core Studio' },
  '/dashboard': { title: 'Analysis Dashboard', section: 'Core Studio' },
  '/history': { title: 'Historical Archive', section: 'Core Studio' },
  '/graph': { title: 'Knowledge Graph Explorer', section: 'Advanced Analytics' },
  '/diagnostics': { title: 'ML Anomaly & Diagnostics', section: 'Advanced Analytics' },
  '/models': { title: 'AI Model Hub & Router', section: 'Intelligence & System' },
};

export default function Navbar({ onToggleSidebar }) {
  const location = useLocation();
  const [health, setHealth] = useState({ mongo: 'unknown', neo4j: 'unknown' });

  // Compute dynamic title & section based on pathname
  let pageInfo = ROUTE_MAP[location.pathname];
  if (!pageInfo) {
    if (location.pathname.startsWith('/dashboard/')) {
      pageInfo = { title: 'Sample Analysis Studio', section: 'Dashboard' };
    } else if (location.pathname.startsWith('/report/')) {
      pageInfo = { title: 'Report Viewer & Validation', section: 'Reports' };
    } else if (location.pathname.startsWith('/graph/')) {
      pageInfo = { title: 'Sample Entity Network', section: 'Knowledge Graph' };
    } else if (location.pathname.startsWith('/diagnostics/')) {
      pageInfo = { title: 'Sample Diagnostics', section: 'ML Diagnostics' };
    } else {
      pageInfo = { title: 'NexusMind Intelligence', section: 'Platform' };
    }
  }

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await checkHealth();
        if (isMounted) setHealth(data);
      } catch (err) {
        if (isMounted) setHealth({ mongo: 'error', neo4j: 'error' });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        <button
          className={styles.menuBtn}
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
        <div className={styles.breadcrumbWrapper}>
          <span className={styles.sectionName}>{pageInfo.section}</span>
          <span className={styles.slash}>/</span>
          <h1 className={styles.pageTitle}>{pageInfo.title}</h1>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.quickLinks}>
          <Link to="/" className={styles.quickBtnPrimary}>
            <Plus size={14} />
            <span>New Analysis</span>
          </Link>
          <Link to="/docs" className={styles.quickBtnIcon} title="Pipeline Documentation">
            <BookOpen size={16} />
          </Link>
        </div>

        <div className={styles.healthGroup}>
          <div className={styles.healthBadge} title="MongoDB Analytical Store Status">
            <Database size={13} />
            <span>Mongo</span>
            <div
              className={`${styles.healthDot} ${
                health.mongo === 'ok' ? styles.dotGreen : styles.dotRed
              }`}
            />
          </div>

          <div className={styles.healthBadge} title="Neo4j Knowledge Graph Engine Status">
            <Server size={13} />
            <span>Neo4j</span>
            <div
              className={`${styles.healthDot} ${
                health.neo4j === 'ok' ? styles.dotGreen : styles.dotRed
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
