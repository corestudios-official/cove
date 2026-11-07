// CP2-9 FIX: Removed all RTL (Right-to-Left) layout logic since Arabic language support was removed.
// Removed isRTL state, document.dir setting, Arabic time formatting (ar-SA), and RTL context menu positioning.
// CP2-32e FIX: Pass full tabs array to Sidebar (not filtered visibleTabs) so closing animation can play
// CP2-32f FIX: Removed incognito mode entirely
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from './hooks/useTheme';
import { useStore } from './hooks/useStore';
import { useTranslation } from 'react-i18next';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import WebView from './components/WebView';
import FindBar from './components/FindBar';
import ErrorPage from './components/ErrorPage';
import ContextMenu from './components/ContextMenu';
import NewTab from './pages/NewTab';
import Bookmarks from './pages/Bookmarks';
import History from './pages/History';
import Downloads from './pages/Downloads';
import Settings from './pages/Settings';
import Acknowledgements from './pages/Acknowledgements';
import PasswordManager from './pages/PasswordManager';
import './i18n';
import './index.css';

function App() {
  const { isDark, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useStore('settings', { homepage: 'cove://home' });
  const [bookmarks, setBookmarks] = useStore('bookmarks', []);
  const [searchEngine, setSearchEngine] = useStore('searchEngine', 'google');
  const [language, setLanguage] = useStore('language', 'en');
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [hoveredLink, setHoveredLink] = useState('');
  const [showFindBar, setShowFindBar] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const webviewRefs = useRef({});

  const visibleTabs = tabs.filter(t => !t._deleted);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  const homepage = settings?.homepage || 'cove://home';

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const resolvedSettings = settings ?? { homepage: 'cove://home' };

  // Auto-open new tab when all tabs are closed (including on first launch)
  useEffect(() => {
    if (visibleTabs.length === 0) {
      createNewTab();
    }
  }, [visibleTabs.length, createNewTab]);

  // Clock for empty state
  useEffect(() => {
    if (visibleTabs.length === 0) {
      const updateClock = () => {
        const now = new Date();
        const timeEl = document.getElementById('empty-clock');
        const dateEl = document.getElementById('empty-date');
        const locale = language === 'ja' ? 'ja-JP' : language;
        if (timeEl) timeEl.textContent = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
        if (dateEl) dateEl.textContent = now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
      };
      updateClock();
      const interval = setInterval(updateClock, 1000);
      return () => clearInterval(interval);
    }
  }, [visibleTabs.length, language]);

  useEffect(() => {
    const handler = () => createNewTab();
    window.addEventListener('newTab', handler);
    return () => window.removeEventListener('newTab', handler);
  }, [homepage]);

  useEffect(() => {
    setTabs(prev => prev.map(t =>
      t.url?.startsWith('cove://') ? { ...t, favicon: null } : t
    ));
  }, [isDark]);

  useEffect(() => {
    setZoomLevel(1.0);
  }, [activeTabId]);

  // Suspend inactive tabs after 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTabs(prev => prev.map(tab => {
        if (tab.id !== activeTabId && 
            tab.lastActive && 
            now - tab.lastActive > 5 * 60 * 1000 &&
            !tab.url?.startsWith('cove://')) {
          return { ...tab, suspended: true };
        }
        return tab;
      }));
    }, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, [activeTabId]);

  useEffect(() => {
    const goOnline = () => {
      setBackOnline(true);
      setIsOnline(true);
      setShowOfflineBanner(true);
      setTimeout(() => {
        setShowOfflineBanner(false);
        setBackOnline(false);
      }, 3000);
    };
    const goOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // CP2-6 FIX: Digital Wellbeing screen time tracking was stuck at 0 minutes because
  // the timer only ran on app close. Fixed by adding a persistent 60-second interval
  // timer that increments and saves to storage continuously from app launch.
  useEffect(() => {
    const updateSessionTime = async () => {
      const today = new Date().toISOString().split('T')[0];
      const sessions = await window.electronAPI.storeGet('wellbeing-sessions') || [];

      // Find today's record
      const todayIndex = sessions.findIndex(s => s.date === today);
      const updatedSessions = [...sessions];

      if (todayIndex >= 0) {
        updatedSessions[todayIndex].minutes += 1;
      } else {
        updatedSessions.push({ date: today, minutes: 1 });
      }

      // Delete records older than 14 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const filteredSessions = updatedSessions.filter(s => new Date(s.date) >= cutoff);

      await window.electronAPI.storeSet('wellbeing-sessions', filteredSessions);

      // Check against goal
      const goalMinutes = await window.electronAPI.storeGet('wellbeing-goal');
      if (goalMinutes) {
        const todayRecord = filteredSessions.find(s => s.date === today);
        if (todayRecord && todayRecord.minutes > goalMinutes) {
          window.electronAPI.showNotification(
            'Screen Time Goal Exceeded',
            'You have exceeded your daily screen time goal for Cove Browser.'
          );
        }
      }
    };

    // Start the interval timer immediately on app launch
    const intervalId = setInterval(updateSessionTime, 60000); // Every 60 seconds

    return () => clearInterval(intervalId);
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const isBookmarked = bookmarks?.some(b => b.url === activeTab?.url) || false;

  const updateTab = useCallback((tabId, updates) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  }, []);

  const createNewTab = useCallback(() => {
    const t = { id: crypto.randomUUID(), url: homepage, title: 'New Tab', favicon: null, isLoading: false, canGoBack: false, canGoForward: false, lastActive: Date.now(), suspended: false };
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  }, [homepage]);

  const closeTab = useCallback((tabId) => {
    // Switch active tab immediately if closing the active one
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId && !t._deleted);
      if (remaining.length > 0) setActiveTabId(remaining[remaining.length - 1].id);
    }

    // Soft-delete only — hides the tab from the sidebar and from view
    // immediately. We intentionally NEVER filter this tab out of `tabs`
    // for the rest of the session. If we did, the <WebView> component
    // would unmount and React would call removeChild on its <webview>
    // DOM node, which crashes with "Invalid guestInstanceId" whenever
    // Electron's guest process for that webview is not in a fully
    // settled state (freshly navigated, freshly mounted, etc.) — and
    // there is no reliable way to know that state in every case.
    // Keeping the node in the DOM forever (just hidden) makes that crash
    // structurally impossible instead of merely unlikely.
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, _deleted: true } : t));

    // Free the webview's rendering resources by navigating it to a blank
    // page. This is safe now because the node is never removed from the
    // DOM afterward — there is no unmount race to worry about.
    const wv = webviewRefs.current[tabId];
    if (wv) {
      try { wv.src = 'about:blank'; } catch (e) {}
      // CP2-38: closing a tab also closes its detached DevTools window
      try {
        const guestId = wv.getWebContentsId?.();
        if (guestId) window.coveAPI?.invoke?.('cove:close-tab-guest', guestId);
      } catch (e) {}
    }
  }, [activeTabId, tabs]);

  const handleTabReorder = useCallback((from, to) => {
    setTabs(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  }, []);

  const duplicateTab = useCallback((tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const newTab = {
      id: crypto.randomUUID(),
      url: tab.url,
      title: tab.title,
      favicon: null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastActive: Date.now(),
      suspended: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs]);

  const toggleBookmark = useCallback(async () => {
    if (!activeTab?.url || activeTab.url.startsWith('cove://')) return;
    const current = bookmarks || [];
    const exists = current.find(b => b.url === activeTab.url);
    let updated;
    if (exists) {
      updated = current.filter(b => b.url !== activeTab.url);
    } else {
      updated = [{
        id: Date.now().toString(),
        url: activeTab.url,
        title: activeTab.title || activeTab.url,
        favicon: null,
        addedAt: Date.now()
      }, ...current];
    }
    setBookmarks(updated);
  }, [activeTab, bookmarks, setBookmarks]);

  const zoomIn = () => {
    const wv = webviewRefs.current[activeTabId];
    if (!wv) return;
    try {
      const newZoom = Math.min(zoomLevel + 0.1, 3.0);
      wv.setZoomFactor(newZoom);
      setZoomLevel(newZoom);
    } catch(e) {}
  };

  const zoomOut = () => {
    const wv = webviewRefs.current[activeTabId];
    if (!wv) return;
    try {
      const newZoom = Math.max(zoomLevel - 0.1, 0.3);
      wv.setZoomFactor(newZoom);
      setZoomLevel(newZoom);
    } catch(e) {}
  };

  const resetZoom = () => {
    const wv = webviewRefs.current[activeTabId];
    if (!wv) return;
    try {
      wv.setZoomFactor(1.0);
      setZoomLevel(1.0);
    } catch(e) {}
  };

  const navigateTab = useCallback((tabId, url) => {
    const pageTitles = {
      'cove://home': 'New Tab',
      'cove://bookmarks': 'Bookmarks',
      'cove://history': 'History',
      'cove://downloads': 'Downloads',
      'cove://acknowledgements': 'Acknowledgements',
      'cove://cpm': 'Cove Password Manager'
    };
    const updates = { url, title: pageTitles[url] || activeTab?.title || 'New Tab', failedLoad: false };
    if (url.startsWith('cove://')) updates.favicon = null;
    updateTab(tabId, updates);

    if (!url.startsWith('cove://')) {
      window.electronAPI.storeGet('history').then(h => {
        const history = h || [];
        history.unshift({ id: Date.now().toString(), url, title: url, timestamp: Date.now() });
        window.electronAPI.storeSet('history', history.slice(0, 500));
      });
    }
  }, [updateTab, activeTab]);

  const handleBack = useCallback(() => {
    const wv = webviewRefs.current[activeTabId];
    if (wv) try { wv.navigationHistory.goBack(); } catch(e) {}
  }, [activeTabId]);

  const handleForward = useCallback(() => {
    const wv = webviewRefs.current[activeTabId];
    if (wv) try { wv.navigationHistory.goForward(); } catch(e) {}
  }, [activeTabId]);

  const handleRefresh = useCallback(() => {
    const wv = webviewRefs.current[activeTabId];
    if (wv) try { wv.reload(); } catch(e) {}
  }, [activeTabId]);

  // CP2-37: Reload a specific tab's webview from the sidebar context menu.
  // cove:// internal pages have no reloadable webview, so they are skipped.
  const reloadTab = useCallback((tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.url?.startsWith('cove://')) return;
    const wv = webviewRefs.current[tabId];
    if (!wv) return;
    try { wv.reload(); } catch(e) {}
  }, [tabs]);

  // CP2-37: Copy a specific tab's current URL to the clipboard.
  const copyTabUrl = useCallback((tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    let url = tab.url;
    try {
      const liveUrl = webviewRefs.current[tabId]?.getURL?.();
      if (liveUrl && liveUrl !== 'about:blank') url = liveUrl;
    } catch(e) {}
    window.electronAPI.copyToClipboard(url);
  }, [tabs]);

  // CP2-38(A): website context menu — guest webContents forward their
  // context-menu events through the main process; we draw Cove's styled menu
  // (Select All / Inspect Element, no icons) with its top-left corner exactly
  // at the cursor position reported by the event params.
  useEffect(() => {
    const off = window.coveAPI?.on?.('cove:guest-context-menu', (p) => {
      if (!p) return;
      setContextMenu({
        x: p.x || 0,
        y: p.y || 0,
        items: [
          {
            label: t('websiteMenu.selectAll'),
            action: () => window.coveAPI.invoke('cove:guest-select-all', p.contentsId)
          },
          {
            label: t('websiteMenu.inspectElement'),
            action: () => window.coveAPI.invoke('cove:guest-inspect', p.contentsId, p.x, p.y)
          }
        ]
      });
    });
    return typeof off === 'function' ? off : undefined;
  }, [activeTabId, t]);

  // CP2-38: report the active tab's guest webContents id so chrome-focused
  // Ctrl+Shift+I can toggle DevTools for the active website (0 = none).
  useEffect(() => {
    const tab = tabs.find(tb => tb.id === activeTabId);
    if (!tab || tab._deleted || tab.url?.startsWith('cove://')) {
      window.coveAPI?.invoke?.('cove:set-active-guest', 0);
      return;
    }
    try {
      const id = webviewRefs.current[activeTabId]?.getWebContentsId?.();
      window.coveAPI?.invoke?.('cove:set-active-guest', id || 0);
    } catch (e) {
      window.coveAPI?.invoke?.('cove:set-active-guest', 0);
    }
  }, [activeTabId, tabs]);

  const handleOpenInNewTab = useCallback((url) => {
    const t = {
      id: crypto.randomUUID(),
      url,
      title: 'New Tab',
      favicon: null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastActive: Date.now(),
      suspended: false
    };
    setTabs(prev => [...prev, t]);
    setActiveTabId(t.id);
  }, []);

  // CP2-35: Open a URL requested from the Preferences window
  const openUrlInMainWindow = useCallback((url) => {
    if (!url) return;
    if (url.startsWith('cove://')) {
      const pageTitles = {
        'cove://home': 'New Tab',
        'cove://bookmarks': 'Bookmarks',
        'cove://history': 'History',
        'cove://downloads': 'Downloads',
        'cove://acknowledgements': 'Acknowledgements',
        'cove://cpm': 'Cove Password Manager'
      };
      const existing = tabs.find(t => t.url === url);
      if (existing) {
        setActiveTabId(existing.id);
      } else {
        const t = {
          id: crypto.randomUUID(),
          url,
          title: pageTitles[url] || 'New Tab',
          favicon: null,
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          lastActive: Date.now(),
          suspended: false
        };
        setTabs(prev => [...prev, t]);
        setActiveTabId(t.id);
      }
    } else {
      handleOpenInNewTab(url);
    }
  }, [tabs, handleOpenInNewTab]);

  useEffect(() => {
    const off = window.coveAPI?.on?.('cove:open-url', openUrlInMainWindow);
    return typeof off === 'function' ? off : undefined;
  }, [openUrlInMainWindow]);

  const handleSearchText = useCallback((text) => {
    const searchUrls = {
      google: 'https://www.google.com/search?q=',
      duckduckgo: 'https://duckduckgo.com/?q=',
      bing: 'https://www.bing.com/search?q='
    };
    const baseUrl = searchUrls[searchEngine] || searchUrls.google;
    const url = baseUrl + encodeURIComponent(text);
    handleOpenInNewTab(url);
  }, [searchEngine, handleOpenInNewTab]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 't') { e.preventDefault(); createNewTab(); }
        if (e.key === 'w') { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
        if (e.key === 'l') { e.preventDefault(); document.querySelector('input')?.focus(); }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); const wv = webviewRefs.current[activeTabId]; if (wv) try { wv.reload(); } catch(err) {} }
        if (e.key === 'd') { e.preventDefault(); toggleBookmark(); }
        if (e.key === 'f') { e.preventDefault(); setShowFindBar(true); }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
        if (e.key === '-') { e.preventDefault(); zoomOut(); }
        if (e.key === '0') { e.preventDefault(); resetZoom(); }
      }
      if (e.key === 'Tab' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        setTabs(currentTabs => {
          const currentIndex = currentTabs.findIndex(t => t.id === activeTabId);
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + currentTabs.length) % currentTabs.length
            : (currentIndex + 1) % currentTabs.length;
          if (currentTabs[nextIndex]) setActiveTabId(currentTabs[nextIndex].id);
          return currentTabs;
        });
      }
      if (e.altKey && e.key === 'Home') { e.preventDefault(); navigateTab(activeTabId, 'cove://home'); }
      if (e.key === 'Escape') {
        if (showFindBar) {
          setShowFindBar(false);
          setFindQuery('');
          const wv = webviewRefs.current[activeTabId];
          if (wv) try { wv.stopFindInPage('clearSelection'); } catch(e) {}
        } else {
          const wv = webviewRefs.current[activeTabId];
          if (wv) try { wv.stop(); } catch(e) {}
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [createNewTab, closeTab, activeTabId, toggleBookmark, zoomIn, zoomOut, resetZoom, showFindBar, navigateTab]);

  const isInternal = activeTab?.url?.startsWith('cove://');

  const renderPage = () => {
    const props = { onNavigate: (url) => navigateTab(activeTabId, url), settings, setSettings, isDark, setTheme, searchEngine, setSearchEngine, language, setLanguage };
    switch (activeTab?.url) {
      case 'cove://home': case 'cove://newtab': return <NewTab {...props} />;
      case 'cove://bookmarks': return <Bookmarks {...props} />;
      case 'cove://history': return <History {...props} />;
      case 'cove://downloads': return <Downloads {...props} />;
      case 'cove://acknowledgements': return <Acknowledgements {...props} onNavigate={(url) => navigateTab(activeTabId, url)} />;
      case 'cove://cpm': return <PasswordManager {...props} onNavigate={(url) => navigateTab(activeTabId, url)} />;
      default: return <div style={{ padding: 20 }}>Page not found</div>;
    }
  };

  // CP2-35: Preferences window renders the same bundle at #/preferences
  if (window.location.hash.startsWith('#/preferences')) {
    return <PreferencesView />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }} onClick={() => setContextMenu(null)}>
      <Sidebar
        tabs={tabs}
        activeTabId={activeTabId}
        activeTab={activeTab}
        onTabSelect={(id) => {
          setActiveTabId(id);
          setTabs(prev => prev.map(t =>
            t.id === id ? { ...t, lastActive: Date.now(), suspended: false } : t
          ));
        }}
        onTabClose={closeTab}
        onNewTab={createNewTab}
        onTabReorder={handleTabReorder}
        onDuplicateTab={duplicateTab}
        onReloadTab={reloadTab}
        onCopyTabUrl={copyTabUrl}
        onNavigate={(url) => {
          // Always open internal cove:// pages in a new tab
          const pageTitles = {
            'cove://bookmarks': 'Bookmarks',
            'cove://history': 'History',
            'cove://downloads': 'Downloads',
            'cove://home': 'New Tab',
            'cove://acknowledgements': 'Acknowledgements',
            'cove://cpm': 'Cove Password Manager'
          };

          if (url.startsWith('cove://')) {
            // Check if a tab with this URL already exists
            const existing = tabs.find(t => t.url === url);
            if (existing) {
              // Just switch to it
              setActiveTabId(existing.id);
            } else {
              // Open in new tab
              const t = {
                id: crypto.randomUUID(),
                url,
                title: pageTitles[url] || 'New Tab',
                favicon: null,
                isLoading: false,
                canGoBack: false,
                canGoForward: false,
                lastActive: Date.now(),
                suspended: false
              };
              setTabs(prev => [...prev, t]);
              setActiveTabId(t.id);
            }
          } else {
            navigateTab(activeTabId, url);
          }
        }}
        isDark={isDark}
        onDragStart={() => setIsSidebarDragging(true)}
        onDragEnd={() => setIsSidebarDragging(false)}
        onOpenUrl={handleOpenInNewTab}
      />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: 0,
        background: 'var(--surface)'
      }}>
        {showOfflineBanner && (
          <div style={{
            background: backOnline ? '#2E7D32' : '#D93025',
            color: 'white',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeIn var(--duration-sm) var(--ease)'
          }}>
            <i className="fas fa-wifi" style={{ opacity: 0.8 }} />
            {backOnline ? 'Back online!' : 'No internet connection — some features may not work'}
            <button
              onClick={() => setShowOfflineBanner(false)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, fontSize: 14 }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}
        <Toolbar
          activeTab={activeTab}
          onNavigate={(url) => navigateTab(activeTabId, url)}
          onNavigateNew={(url) => {
            const t = {
              id: crypto.randomUUID(),
              url,
              title: 'New Tab',
              favicon: null,
              isLoading: false,
              canGoBack: false,
              canGoForward: false,
              lastActive: Date.now(),
              suspended: false
            };
            setTabs([t]);
            setActiveTabId(t.id);
          }}
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          onStop={() => { const wv = webviewRefs.current[activeTabId]; if (wv) try { wv.stop(); } catch(e) {} }}
          onHome={() => navigateTab(activeTabId, 'cove://home')}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggleBookmark}
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          searchEngine={searchEngine || 'google'}
          isDark={isDark}
          hoveredLink={hoveredLink}
        />
        <div style={{
          flex: 1,
          position: 'relative',
          background: 'var(--surface)',
          borderTopLeftRadius: 'var(--viewing-window-radius)',
          borderTopRightRadius: 'var(--viewing-window-radius)',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          overflow: 'hidden'
        }}>
          {visibleTabs.length === 0 ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--webview-bg)',
              gap: 8
            }}>
              <div id="empty-clock" style={{
                fontSize: 72,
                fontWeight: 300,
                color: 'var(--text)',
                fontFamily: 'OpenSauceOne, sans-serif',
                letterSpacing: '-2px',
                lineHeight: 1
              }} />
              <div id="empty-date" style={{
                fontSize: 16,
                color: 'var(--text-muted)',
                fontWeight: 400,
                letterSpacing: '0.2px'
              }} />
            </div>
          ) : (
            <>
              {tabs.map(tab => (
                <WebView
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId && !isInternal && !tab._deleted}
                  isSuspended={tab.suspended}
                  webviewRefs={webviewRefs}
                  onTabUpdate={updateTab}
                  onHoveredLink={setHoveredLink}
                  onOpenInNewTab={handleOpenInNewTab}
                  onSearchText={handleSearchText}
                  onBack={handleBack}
                  onForward={handleForward}
                  onRefresh={handleRefresh}
                  activeTabId={activeTabId}
                />
              ))}
              {activeTab && activeTab.failedLoad && !isInternal && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
                  <ErrorPage
                    tab={activeTab}
                    onRefresh={() => { const wv = webviewRefs.current[activeTabId]; if(wv) try { wv.reload(); } catch(e){} }}
                    onHome={() => navigateTab(activeTabId, 'cove://home')}
                  />
                </div>
              )}
              {isInternal && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  background: 'var(--webview-bg)',
                  paddingTop: '40px'
                }}>
                  {renderPage()}
                </div>
              )}
              {showFindBar && activeTab && !isInternal && (
                <FindBar
                  query={findQuery}
                  setQuery={setFindQuery}
                  onFindNext={() => { const wv = webviewRefs.current[activeTabId]; if(wv) try { wv.findInPage(findQuery); } catch(e){} }}
                  onFindPrev={() => { const wv = webviewRefs.current[activeTabId]; if(wv) try { wv.findInPage(findQuery, { forward: false }); } catch(e){} }}
                  onClose={() => { setShowFindBar(false); setFindQuery(''); const wv = webviewRefs.current[activeTabId]; if(wv) try { wv.stopFindInPage('clearSelection'); } catch(e){} }}
                  isDark={isDark}
                />
              )}
              {/* Transparent overlay during sidebar drag to prevent webview from swallowing mouse events */}
              {isSidebarDragging && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 100,
                  pointerEvents: 'auto'
                }} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// CP2-35: Standalone Preferences window content — same Settings component,
// backed by the same electron-store keys so changes sync to the main window.
function PreferencesView() {
  const { isDark, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const [settings, setSettings] = useStore('settings', { homepage: 'cove://home' });
  const [searchEngine, setSearchEngine] = useStore('searchEngine', 'google');
  const [language, setLanguage] = useStore('language', 'en');

  useEffect(() => {
    document.title = 'Cove Preferences';
    if (language) i18n.changeLanguage(language);
  }, [language, i18n]);

  const openInMain = (url) => window.coveAPI?.invoke('cove:open-url-in-main', url);

  return (
    <div style={{ width: '100%', height: '100vh', background: 'var(--webview-bg)', overflow: 'hidden' }}>
      <Settings
        onNavigate={openInMain}
        onOpenInNewTab={openInMain}
        settings={settings}
        setSettings={setSettings}
        isDark={isDark}
        setTheme={setTheme}
        searchEngine={searchEngine}
        setSearchEngine={setSearchEngine}
        language={language}
        setLanguage={setLanguage}
      />
    </div>
  );
}

export default App;
