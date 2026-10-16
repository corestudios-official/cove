// CP2-9 FIX: Removed Arabic time formatting (ar-SA locale) since Arabic language support was removed.
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function NewTab() {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language;
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language;
    return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100%',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      paddingTop: '40px'
    }}>
      <div style={{
        fontFamily: 'OpenSauceOne, sans-serif',
        fontWeight: 300,
        fontSize: 72,
        color: 'var(--text)',
        letterSpacing: '-2px',
        lineHeight: 1
      }}>
        {formatTime(time)}
      </div>
      <div style={{
        fontFamily: 'OpenSauceOne, sans-serif',
        fontWeight: 400,
        fontSize: '1rem',
        color: 'var(--text-muted)'
      }}>
        {formatDate(time)}
      </div>
    </div>
  );
}
