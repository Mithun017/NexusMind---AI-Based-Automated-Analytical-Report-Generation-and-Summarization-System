import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import HistoryList from '../history/HistoryList';
import { getHistory } from '../../api/history';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getHistory(page, 20);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to retrieve analysis history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analysis History & Past Runs</h1>
      </div>

      {loading ? (
        <div className={styles.loadingWrapper}>
          <Loader2 size={32} className={styles.spinner} />
          <div>Loading historical analytical runs...</div>
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>{error}</div>
      ) : (
        <HistoryList
          items={data.items}
          total={data.total}
          page={data.page}
          pages={data.pages}
          onPageChange={fetchHistory}
        />
      )}
    </div>
  );
}
