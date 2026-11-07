import React from 'react';

export default function ErrorPage({ tab, onRefresh, onHome }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--webview-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'OpenSauceOne, sans-serif',
      padding: 40
    }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize: 48, color: 'var(--text-3)', marginBottom: 24 }} />
      
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
        This page couldn't be reached
      </h2>
      
      <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>
        {tab.failedUrl}
      </p>
      
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 32 }}>
        Error {tab.errorCode}: {tab.errorDescription}
      </p>
      
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onRefresh}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Try Again
        </button>
        <button
          onClick={onHome}
          style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            border: '1px solid var(--border)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
