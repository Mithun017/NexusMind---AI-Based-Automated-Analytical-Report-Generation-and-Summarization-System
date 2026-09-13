import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import FloatingChatWidget from '../chat/FloatingChatWidget';
import styles from './Layout.module.css';

export default function Layout({ children, pageTitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('nexusmind_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexusmind_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen((prev) => !prev);
    } else {
      toggleCollapse();
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.layout}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      
      {/* Mobile backdrop */}
      <div
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ''}`}
        onClick={closeSidebar}
      />

      <div
        className={`${styles.mainWrapper} ${
          isCollapsed ? styles.mainWrapperCollapsed : ''
        }`}
      >
        <Navbar onToggleSidebar={handleToggleSidebar} title={pageTitle} />
        <main className={styles.content}>{children}</main>
      </div>

      {/* Persistent Floating AI Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
}
