import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import styles from './Layout.module.css';

export default function Layout({ children, pageTitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Mobile backdrop */}
      <div
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ''}`}
        onClick={closeSidebar}
      />

      <div className={styles.mainWrapper}>
        <Navbar onToggleSidebar={toggleSidebar} title={pageTitle} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
