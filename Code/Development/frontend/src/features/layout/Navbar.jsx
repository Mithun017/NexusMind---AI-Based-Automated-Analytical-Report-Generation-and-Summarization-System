import React, { useEffect, useState } from 'react';
import { Menu, Database, Server } from 'lucide-react';
import { checkHealth } from '../../api/upload';
import styles from './Navbar.module.css';

export default function Navbar({ onToggleSidebar, title = 'Analytical Intelligence' }) {
  const [health, setHealth] = useState({ mongo: 'unknown', neo4j: 'unknown' });

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
          <Menu size={22} />
        </button>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.healthBadge}>
          <Database size={13} />
          <span>Mongo:</span>
          <div
            className={`${styles.healthDot} ${
              health.mongo === 'ok' ? styles.dotGreen : styles.dotRed
            }`}
          />
        </div>

        <div className={styles.healthBadge}>
          <Server size={13} />
          <span>Neo4j:</span>
          <div
            className={`${styles.healthDot} ${
              health.neo4j === 'ok' ? styles.dotGreen : styles.dotRed
            }`}
          />
        </div>
      </div>
    </header>
  );
}
