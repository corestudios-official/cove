// CP2-9 FIX: Removed Arabic (ar) from language selector, added Russian (ru).
// Korean (ko) and French (fr) were incorrectly removed and have been restored.
// Language list now: English, Malay, Chinese (Simplified), Korean, French, German, Japanese, Russian.
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings({ onNavigate, onOpenInNewTab, settings, setSettings, isDark, setTheme, searchEngine, setSearchEngine, language, setLanguage }) {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState('system');
  const [cleared, setCleared] = useState(false);
  const [version, setVersion] = useState('2.1.0');
  const [activeTab, setActiveTab] = useState('Appearance');
  const [updateStatus, setUpdateStatus] = useState('default'); // default, checking, up-to-date, update-found, error
  const [updateMessage, setUpdateMessage] = useState('');
  const [releaseUrl, setReleaseUrl] = useState('');
  const [showCookies, setShowCookies] = useState(false);
  const [cookies, setCookies] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [goalHours, setGoalHours] = useState(0);

  useEffect(() => {
    window.electronAPI.storeGet('theme').then(t => setThemeState(t || 'system'));
    window.electronAPI.getVersion().then(v => setVersion(v || '2.1.0'));
  }, []);

  // CP2-6 FIX: Digital Wellbeing display was not updating live because it only read
  // localStorage once on mount. Fixed by adding a 60-second interval to re-read
  // the wellbeing-sessions data so the screen time counter updates in real-time.
  useEffect(() => {
    const loadWellbeingData = async () => {
      const wellbeingSessions = await window.electronAPI.storeGet('wellbeing-sessions') || [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const filtered = wellbeingSessions.filter(s => new Date(s.date) >= cutoff);
      
      if (filtered.length !== wellbeingSessions.length) {
        await window.electronAPI.storeSet('wellbeing-sessions', filtered);
      }
      
      setSessions(filtered);
      
      const goalMinutes = await window.electronAPI.storeGet('wellbeing-goal');
      if (goalMinutes) {
        setGoalHours(goalMinutes / 60);
      }
    };
    
    loadWellbeingData();
    
    // Re-load data every 60 seconds to show live updates
    const intervalId = setInterval(loadWellbeingData, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleClearData = async () => {
    await window.electronAPI.storeSet('history', []);
    await window.electronAPI.storeSet('downloads', []);
    await window.electronAPI.storeSet('bookmarks', []);
    setCleared(true);
    setTimeout(() => setCleared(false), 2500);
  };

  const handleManageCookies = async () => {
    const cookieList = await window.electronAPI.getCookies();
    setCookies(cookieList);
    setShowCookies(true);
  };

  const handleClearCookies = async () => {
    await window.electronAPI.clearCookies();
    setCookies([]);
    setShowCookies(false);
  };

  const handleExportData = async () => {
    try {
      const result = await window.electronAPI.exportData();
      if (result.success) {
        alert('Data exported successfully to: ' + result.path);
      } else {
        console.log(result.message);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    try {
      const release = await window.electronAPI.checkForUpdates();
      const latestTag = release.tag_name;
      const latestVersion = latestTag.replace('v', '');
      const currentVersion = version;
      
      // Strip suffixes like "-beta" or " BETA" before comparison
      const latestClean = latestVersion.split('-')[0].split(' ')[0];
      const currentClean = currentVersion.split('-')[0].split(' ')[0];
      
      // Simple version comparison
      const latestParts = latestClean.split('.').map(Number);
      const currentParts = currentClean.split('.').map(Number);
      
      let isNewer = false;
      for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const latest = latestParts[i] || 0;
        const current = currentParts[i] || 0;
        if (latest > current) {
          isNewer = true;
          break;
        } else if (latest < current) {
          break;
        }
      }
      
      if (isNewer) {
        setUpdateStatus('update-found');
        setReleaseUrl(release.html_url);
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (error) {
      setUpdateStatus('error');
      setUpdateMessage('Could not check. Try again.');
    }
  };

  const tabConfig = [
    { key: 'Appearance', label: t('settings.appearance'), icon: 'fas fa-palette' },
    { key: 'Search Engine', label: t('settings.searchEngine'), icon: 'fas fa-magnifying-glass' },
    { key: 'Keyboard Shortcuts', label: t('settings.keyboardShortcuts'), icon: 'fas fa-keyboard' },
    { key: 'Privacy', label: t('settings.privacy'), icon: 'fas fa-shield-halved' },
    { key: 'Digital Wellbeing', label: t('settings.digitalWellbeing'), icon: 'fas fa-heart-pulse' },
    null, // separator
    { key: 'About Cove', label: t('settings.aboutCove') }
  ];

  const mainTabs = tabConfig.filter(tab => tab && tab.key !== 'About Cove');
  const bottomTabs = tabConfig.filter(tab => tab && tab.key === 'About Cove');

  const renderContent = () => {
    switch (activeTab) {
      case 'Appearance':
        return (
          <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.appearance')}</h2>
            {/* Dark Mode toggle card */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
              marginBottom: 16,
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <i className="fas fa-moon" style={{ fontSize: 20, color: 'var(--text-muted)', width: 24, textAlign: 'center' }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'OpenSauceOne, sans-serif' }}>
                    {t('settings.darkMode')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'OpenSauceOne, sans-serif', marginTop: 2 }}>
                    {t('settings.darkModeDescription')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                role="switch"
                aria-checked={isDark}
                aria-label={t('settings.darkMode')}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                  background: isDark ? 'var(--accent)' : 'var(--border)',
                  transition: 'background-color 150ms ease-in-out',
                  padding: 0
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 3,
                  left: isDark ? 21 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  transition: 'left 150ms ease-in-out'
                }} />
              </button>
            </div>

            {/* Language dropdown card */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
              background: 'var(--surface)'
            }}>
              <label style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 12, fontWeight: 500, fontFamily: 'OpenSauceOne, sans-serif' }}>
                {t('settings.language')}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: 320,
                  padding: '10px 14px',
                  fontSize: 14,
                  color: 'var(--text)',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'OpenSauceOne, sans-serif'
                }}
              >
                {[
                  { code: 'en', name: 'English' },
                  { code: 'ms', name: 'Bahasa Malaysia' },
                  { code: 'zh-CN', name: '中文 (简体)' },
                  { code: 'ko', name: '한국어' },
                  { code: 'fr', name: 'Français' },
                  { code: 'de', name: 'Deutsch' },
                  { code: 'ja', name: '日本語' },
                  { code: 'ru', name: 'Русский' }
                ].map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'Search Engine':
        return (
          <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.searchEngine')}</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 8, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.defaultSearchEngine')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['google', 'duckduckgo', 'bing'].map(engine => (
                  <button
                    key={engine}
                    onClick={() => setSearchEngine(engine)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 'var(--radius)',
                      border: searchEngine === engine ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: searchEngine === engine ? 'var(--active-bg)' : 'transparent',
                      color: 'var(--text)',
                      fontSize: 14,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontFamily: 'OpenSauceOne, sans-serif',
                      transition: 'background-color 150ms ease-in-out'
                    }}
                  >
                    {engine}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Keyboard Shortcuts':
        return (
          <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.keyboardShortcuts')}</h2>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12, fontFamily: 'OpenSauceOne, sans-serif' }}>Navigation</h3>
              {[
                ['Ctrl + T', t('sidebar.newTab')],
                ['Ctrl + W', 'Close Tab'],
                ['Ctrl + L', 'Focus Address Bar'],
                ['Ctrl + R', t('toolbar.refresh')],
                ['Ctrl + Tab', 'Next Tab'],
                ['Alt + Home', t('toolbar.home')]
              ].map(([key, action]) => (
                <div key={key} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid var(--border)` }}>
                  <kbd style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '3px 8px',
                    fontSize: 12,
                    fontFamily: 'Space Mono, monospace',
                    color: 'var(--text)'
                  }}>
                    {key}
                  </kbd>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'OpenSauceOne, sans-serif' }}>{action}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 24, marginBottom: 12, fontFamily: 'OpenSauceOne, sans-serif' }}>Page</h3>
              {[
                ['Ctrl + F', 'Find in Page'],
                ['Ctrl + D', t('toolbar.bookmark')],
                ['Ctrl + +', 'Zoom In'],
                ['Ctrl + -', 'Zoom Out'],
                ['Ctrl + 0', 'Reset Zoom'],
                ['Escape', 'Stop Loading / Close Find Bar']
              ].map(([key, action]) => (
                <div key={key} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid var(--border)` }}>
                  <kbd style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '3px 8px',
                    fontSize: 12,
                    fontFamily: 'Space Mono, monospace',
                    color: 'var(--text)'
                  }}>
                    {key}
                  </kbd>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'OpenSauceOne, sans-serif' }}>{action}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 24, marginBottom: 12, fontFamily: 'OpenSauceOne, sans-serif' }}>General</h3>
              {[
                ['Ctrl + ,', 'Open Preferences'],
                ['Ctrl + Shift + I', 'Toggle Developer Tools'],
                ['Ctrl + A', 'Select All']
              ].map(([key, action]) => (
                <div key={key} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid var(--border)` }}>
                  <kbd style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '3px 8px',
                    fontSize: 12,
                    fontFamily: 'Space Mono, monospace',
                    color: 'var(--text)'
                  }}>
                    {key}
                  </kbd>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'OpenSauceOne, sans-serif' }}>{action}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Privacy':
        return (
          <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.privacy')}</h2>
            
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '20px 24px',
              marginBottom: 16,
              background: 'var(--surface)'
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: 'var(--text)', 
                marginBottom: 8,
                fontFamily: 'OpenSauceOne, sans-serif'
              }}>
                Cookie Manager
              </h3>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-muted)', 
                fontFamily: 'OpenSauceOne, sans-serif',
                marginBottom: 16,
                lineHeight: 1.5
              }}>
                View and manage cookies stored by websites you visit. Cookies are stored locally on your device.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleManageCookies}
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    fontFamily: 'OpenSauceOne, sans-serif',
                    transition: 'background-color 150ms ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--surface)';
                  }}
                >
                  Manage Cookies
                </button>
                {showCookies && cookies.length > 0 && (
                  <button
                    onClick={handleClearCookies}
                    style={{
                      background: '#C0392B',
                      color: '#FFFFFF',
                      borderRadius: 'var(--radius)',
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 500,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'OpenSauceOne, sans-serif',
                      transition: 'background-color 150ms ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#A93226';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#C0392B';
                    }}
                  >
                    Clear All Cookies
                  </button>
                )}
              </div>
              {showCookies && (
                <div style={{
                  marginTop: 16,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)',
                  padding: 8
                }}>
                  {cookies.length === 0 ? (
                    <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'OpenSauceOne, sans-serif' }}>
                      No cookies found
                    </div>
                  ) : (
                    cookies.map((cookie, index) => (
                      <div key={index} style={{
                        padding: '8px 12px',
                        borderBottom: index < cookies.length - 1 ? '1px solid var(--border)' : 'none',
                        fontSize: 12,
                        fontFamily: 'Space Mono, monospace'
                      }}>
                        <div style={{ color: 'var(--text)', marginBottom: 4 }}>
                          <strong>Domain:</strong> {cookie.domain}
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                          <strong>Name:</strong> {cookie.name}
                        </div>
                        <div style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                          <strong>Value:</strong> {cookie.value.length > 40 ? cookie.value.substring(0, 40) + '...' : cookie.value}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '20px 24px',
              marginBottom: 16,
              background: 'var(--surface)'
            }}>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-muted)', 
                fontFamily: 'OpenSauceOne, sans-serif',
                marginBottom: 16
              }}>
                Clear your browsing history, cookies, and cached files.
              </p>
              <button
                onClick={handleClearData}
                style={{
                  background: cleared ? '#2E7D32' : '#C0392B',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius)',
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'OpenSauceOne, sans-serif',
                  transition: 'background-color 150ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  if (!cleared) e.target.style.background = '#A93226';
                }}
                onMouseLeave={(e) => {
                  if (!cleared) e.target.style.background = '#C0392B';
                }}
              >
                {cleared ? 'Data Cleared' : 'Clear Browsing Data'}
              </button>
            </div>

            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '20px 24px',
              marginBottom: 16,
              background: 'var(--surface)'
            }}>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-muted)', 
                fontFamily: 'OpenSauceOne, sans-serif',
                marginBottom: 16
              }}>
                Export your browsing history, bookmarks, and settings to a JSON file.
              </p>
              <button
                onClick={handleExportData}
                style={{
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius)',
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'OpenSauceOne, sans-serif',
                  transition: 'background-color 150ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--accent-dk)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--accent)';
                }}
              >
                Export Data
              </button>
            </div>

            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '20px 24px',
              background: 'var(--surface)'
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: 'var(--text)', 
                marginBottom: 12,
                fontFamily: 'OpenSauceOne, sans-serif'
              }}>
                Your data stays on your device
              </h3>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-muted)', 
                lineHeight: 1.65,
                fontFamily: 'OpenSauceOne, sans-serif',
                marginBottom: 12
              }}>
                Cove stores your browsing history, bookmarks, profile information, and settings locally on your device. Cove does not upload this data to core. studios or any third-party service. You can clear your browsing data at any time using the button above.
              </p>
              <div>
                <span
                  onClick={() => onOpenInNewTab('https://corestudios.web.app/corepp.html')}
                  style={{
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontFamily: 'OpenSauceOne, sans-serif'
                  }}
                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                  Privacy Policy →
                </span>
              </div>
              <div>
                <span
                  onClick={() => onOpenInNewTab('https://corestudios.web.app/covetou.html')}
                  style={{
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontFamily: 'OpenSauceOne, sans-serif'
                  }}
                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                  Cove Browser Terms of Use Agreement →
                </span>
              </div>
            </div>
          </div>
        );

      case 'Digital Wellbeing':
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = sessions.find(s => s.date === today);
        const todayMinutes = todayRecord ? todayRecord.minutes : 0;
        const todayHours = Math.floor(todayMinutes / 60);
        const todayMins = todayMinutes % 60;
        const todayDisplay = todayHours > 0 ? `${todayHours}h ${todayMins}m` : `${todayMins}m`;
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const record = sessions.find(s => s.date === dateStr);
          last7Days.push({
            date: dateStr,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            minutes: record ? record.minutes : 0
          });
        }
        
        const totalWeekMinutes = last7Days.reduce((sum, d) => sum + d.minutes, 0);
        const avgMinutes = Math.round(totalWeekMinutes / 7);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        const avgDisplay = avgHours > 0 ? `${avgHours}h ${avgMins}m` : `${avgMins}m`;
        
        const maxMinutes = Math.max(...last7Days.map(d => d.minutes), 1);
        
        const handleGoalChange = async (e) => {
          const hours = parseFloat(e.target.value) || 0;
          setGoalHours(hours);
          await window.electronAPI.storeSet('wellbeing-goal', hours * 60);
        };
        
        const goalMinutes = goalHours * 60;
        let goalStatus = null;
        if (goalMinutes === 0) {
          goalStatus = { text: 'No goal set.', color: 'var(--text-muted)' };
        } else if (todayMinutes <= goalMinutes) {
          const remaining = goalMinutes - todayMinutes;
          goalStatus = { text: `You are within your goal. ${remaining} minutes remaining.`, color: 'var(--accent)' };
        } else {
          const exceeded = todayMinutes - goalMinutes;
          goalStatus = { text: `Goal exceeded by ${exceeded} minutes today.`, color: '#C0392B' };
        }

        return (
          <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.digitalWellbeing')}</h2>
            
            {/* Screen Time Section */}
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '20px 24px',
              marginBottom: 16,
              background: 'var(--surface)'
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: 'var(--text)', 
                marginBottom: 16,
                fontFamily: 'OpenSauceOne, sans-serif'
              }}>
                Screen Time
              </h3>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ 
                  fontSize: 48, 
                  fontWeight: 600, 
                  color: 'var(--text)', 
                  fontFamily: 'OpenSauceOne, sans-serif',
                  marginBottom: 4
                }}>
                  {todayDisplay}
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: 'var(--text-muted)', 
                  fontFamily: 'OpenSauceOne, sans-serif'
                }}>
                  Today
                </div>
              </div>
              
              <div style={{ 
                height: '6px', 
                background: 'var(--border)', 
                borderRadius: '3px',
                marginBottom: 20,
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'var(--accent)', 
                  borderRadius: '3px',
                  width: `${avgMinutes > 0 ? Math.min((todayMinutes / avgMinutes) * 100, 100) : 0}%`,
                  transition: 'width 300ms ease-in-out'
                }} />
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: 'var(--text)', 
                  marginBottom: 12,
                  fontFamily: 'OpenSauceOne, sans-serif'
                }}>
                  Weekly breakdown
                </div>
                {last7Days.map(day => {
                  const dayHours = Math.floor(day.minutes / 60);
                  const dayMins = day.minutes % 60;
                  const dayDisplay = dayHours > 0 ? `${dayHours}h ${dayMins}m` : `${dayMins}m`;
                  const barWidth = (day.minutes / maxMinutes) * 100;
                  
                  return (
                    <div key={day.date} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ 
                        width: 60, 
                        fontSize: 13, 
                        color: 'var(--text-muted)', 
                        fontFamily: 'OpenSauceOne, sans-serif'
                      }}>
                        {day.dayName}
                      </div>
                      <div style={{ 
                        flex: 1, 
                        height: '6px', 
                        background: 'var(--border)', 
                        borderRadius: '3px',
                        margin: '0 12px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--accent)', 
                          borderRadius: '3px',
                          width: `${barWidth}%`,
                          transition: 'width 300ms ease-in-out'
                        }} />
                      </div>
                      <div style={{ 
                        width: 50, 
                        fontSize: 13, 
                        color: 'var(--text)', 
                        textAlign: 'right',
                        fontFamily: 'OpenSauceOne, sans-serif'
                      }}>
                        {dayDisplay}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ 
                fontSize: 13, 
                color: 'var(--text-muted)', 
                fontFamily: 'OpenSauceOne, sans-serif',
                marginTop: 12
              }}>
                Weekly average: {avgDisplay} per day
              </div>
            </div>
            
            {/* Daily Goal Section */}
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: '20px 24px',
              marginBottom: 16,
              background: 'var(--surface)'
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: 'var(--text)', 
                marginBottom: 8,
                fontFamily: 'OpenSauceOne, sans-serif'
              }}>
                Daily Screen Time Goal
              </h3>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-muted)', 
                fontFamily: 'OpenSauceOne, sans-serif',
                marginBottom: 16
              }}>
                Set a daily limit and track whether you meet it.
              </p>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ 
                  fontSize: 14, 
                  color: 'var(--text)', 
                  display: 'block', 
                  marginBottom: 8, 
                  fontFamily: 'OpenSauceOne, sans-serif' 
                }}>
                  Goal (hours)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={goalHours}
                  onChange={handleGoalChange}
                  style={{
                    width: '100%',
                    maxWidth: '200px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 14,
                    fontFamily: 'OpenSauceOne, sans-serif',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ 
                fontSize: 14, 
                color: goalStatus.color, 
                fontFamily: 'OpenSauceOne, sans-serif',
                fontWeight: 500
              }}>
                {goalStatus.text}
              </div>
            </div>
          </div>
        );

      case 'About Cove':
        return (
          <div className="content-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 24, fontFamily: 'OpenSauceOne, sans-serif' }}>{t('settings.aboutCove')}</h2>
            
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              padding: 24,
              marginBottom: 16,
              background: 'var(--surface)'
            }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: 'var(--text)', 
                  marginBottom: 4,
                  fontFamily: 'OpenSauceOne, sans-serif'
                }}>
                  Cove Browser is up to date.
                </div>
                <div style={{ 
                  fontSize: '0.82rem', 
                  color: 'var(--text-muted)',
                  fontFamily: 'Space Mono, monospace'
                }}>
                  Version: {version}
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (updateStatus === 'update-found') {
                    window.electronAPI.openExternal(releaseUrl);
                  } else {
                    handleCheckUpdates();
                  }
                }}
                disabled={updateStatus === 'checking' || updateStatus === 'up-to-date'}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: updateStatus === 'checking' || updateStatus === 'up-to-date' ? 'not-allowed' : 'pointer',
                  fontFamily: 'OpenSauceOne, sans-serif',
                  transition: 'background-color 150ms ease-in-out',
                  marginTop: 16,
                  background: updateStatus === 'up-to-date' ? '#2E7D32' :
                           updateStatus === 'update-found' ? 'var(--accent)' :
                           updateStatus === 'error' ? 'var(--text-muted)' :
                           'var(--surface)',
                  color: updateStatus === 'up-to-date' ? '#FFFFFF' :
                         updateStatus === 'update-found' ? '#FFFFFF' :
                         updateStatus === 'error' ? '#FFFFFF' :
                         'var(--text)'
                }}
              >
                {updateStatus === 'checking' ? 'Checking...' :
                 updateStatus === 'up-to-date' ? "You're up to date" :
                 updateStatus === 'update-found' ? 'Update available — click to download' :
                 updateStatus === 'error' ? updateMessage :
                 'Check for Updates'}
              </button>
            </div>

            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)', 
              fontFamily: 'OpenSauceOne, sans-serif',
              marginTop: 'auto',
              paddingTop: 24,
              textAlign: 'center'
            }}>
              Cove is made possible by the open-source community.{' '}
              <span
                onClick={() => onNavigate('cove://acknowledgements')}
                style={{
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                View acknowledgements →
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--webview-bg)',
      overflow: 'hidden',
      boxSizing: 'border-box',
      display: 'flex'
    }}>
      {/* Left Navigation */}
      <div style={{
        width: '220px',
        borderRight: '1px solid var(--border)',
        padding: '28px 0',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)'
      }}>
        {/* Main tabs */}
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--active-bg)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: activeTab === tab.key ? 500 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'OpenSauceOne, sans-serif',
              borderRadius: 'var(--radius)',
              margin: '2px 10px',
              transition: 'background-color 150ms ease-in-out',
              width: 'calc(100% - 20px)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.target.style.background = 'var(--hover-bg)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            {tab.icon && <i className={tab.icon} style={{ fontSize: 12, width: 16, textAlign: 'center', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />}
            {tab.label}
          </button>
        ))}

        {/* Separator */}
        <div 
          style={{
            height: '1px',
            background: 'var(--border)',
            margin: '12px 14px'
          }}
        />

        {/* Bottom tabs - About Cove */}
        <div style={{ marginTop: 'auto' }}>
          {bottomTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                border: 'none',
                background: activeTab === tab.key ? 'var(--active-bg)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: activeTab === tab.key ? 500 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'OpenSauceOne, sans-serif',
                borderRadius: 'var(--radius)',
                margin: '2px 10px',
                transition: 'background-color 150ms ease-in-out',
                width: 'calc(100% - 20px)'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.target.style.background = 'var(--hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              {tab.icon && <i className={tab.icon} style={{ fontSize: 12, width: 16, textAlign: 'center', color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Content Panel */}
      <div style={{
        flex: 1,
        padding: '32px 40px',
        overflowY: 'auto',
        background: 'var(--webview-bg)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%'
      }}>
        {renderContent()}
      </div>
    </div>
  );
}