import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

/**
 * Ledger page - Deprecated
 * This page now redirects to the Cashflow page which provides
 * comprehensive financial management.
 */
export const Ledger = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Cashflow page
    navigate('/cashflow', { replace: true });
  }, [navigate]);

  return (
    <div className="page-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '400px',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄 Redirecting...</h1>
        <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
          The Ledger page has been integrated into the Cashflow system.
        </p>
        <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          You will be redirected automatically...
        </p>
      </div>
    </div>
  );
};
