import React, { useEffect, useRef, forwardRef } from 'react';

const WebView = forwardRef(({ tab, isActive, isSuspended, isIncognito, webviewRefs, onTabUpdate, onHoveredLink, onContextMenu, onOpenInNewTab, onSearchText, onBack, onForward, onRefresh, activeTabId }, ref) => {
  const webviewRef = useRef(null);

  useEffect(() => {
    if (webviewRef.current) webviewRefs.current[tab.id] = webviewRef.current;
  }, [tab.id]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    // Only set src for non-cove:// URLs. cove:// pages are rendered as React components in App.jsx.
    // The <webview> stays mounted regardless (never conditionally removed) to prevent guestInstanceId crash.
    if (tab.url.startsWith('cove://')) return;
    if (isSuspended) {
      try { wv.src = 'about:blank'; } catch (e) { return; }
    } else {
      try { wv.src = tab.url; } catch (e) { return; }
    }
  }, [tab.url, tab.id, isSuspended]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const applyTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      try {
        wv.insertCSS(dark
          ? ':root { color-scheme: dark !important; } * { color-scheme: dark !important; }'
          : ':root { color-scheme: light !important; } * { color-scheme: light !important; }'
        ).catch(() => {});
      } catch (e) { return; }
    };

    const onReady = () => {
      if (tab._deleted) return;
      applyTheme();
      try {
        const title = wv.getTitle();
        const url = wv.getURL();
        // Only update if it's a real URL, not about:blank from suspension
        if (url && url !== 'about:blank') {
          onTabUpdate(tab.id, { title: title || 'New Tab', url });
        } else if (!url || url === 'about:blank') {
          onTabUpdate(tab.id, { title: title || 'New Tab' });
        }
      } catch (e) { return; }
    };

    const onTitle = (e) => { if (!tab._deleted && e.title) onTabUpdate(tab.id, { title: e.title }); };

    const onFavicon = (e) => { if (!tab._deleted && e.favicons?.[0]) onTabUpdate(tab.id, { favicon: e.favicons[0] }); };

    const getNavState = (wv) => {
      try {
        if (wv && wv.navigationHistory) {
          return {
            canGoBack: wv.navigationHistory.canGoBack(),
            canGoForward: wv.navigationHistory.canGoForward()
          };
        }
      } catch (e) {}
      return {};
    };

    const onNavigate = (e) => {
      if (tab._deleted || !e.url || e.url === 'about:blank') return;
      const updates = { url: e.url, failedLoad: false };
      if (tab.id === activeTabId) {
        Object.assign(updates, getNavState(wv));
      }
      onTabUpdate(tab.id, updates);
    };

    const onStart = () => { if (!tab._deleted) onTabUpdate(tab.id, { isLoading: true }); };

    const onStop = () => {
      if (tab._deleted) return;
      const updates = { isLoading: false };
      if (tab.id === activeTabId) {
        Object.assign(updates, getNavState(wv));
      }
      onTabUpdate(tab.id, updates);
    };

    const onHover = (e) => onHoveredLink(e.url || '');

    const onFailLoad = (e) => {
      if (tab._deleted) return;
      if (e.errorCode === -3) return;
      onTabUpdate(tab.id, {
        failedLoad: true,
        errorCode: e.errorCode,
        errorDescription: e.errorDescription,
        failedUrl: e.validatedURL
      });
    };

    const handleContextMenuEvent = (e) => {
      const params = e.params;
      let items = [];
      if (params.linkURL) {
        items = [
          { label: 'Open in new tab', action: () => onOpenInNewTab && onOpenInNewTab(params.linkURL) },
          { label: 'Copy link', action: () => window.electronAPI.copyToClipboard(params.linkURL) }
        ];
      } else if (params.mediaType === 'image') {
        items = [
          { label: 'Save image', action: () => window.electronAPI.saveImage(params.srcURL) },
          { label: 'Copy image', action: () => window.electronAPI.copyImage(params.srcURL) }
        ];
      } else if (params.selectionText) {
        items = [
          { label: 'Copy', action: () => window.electronAPI.copyToClipboard(params.selectionText) },
          { label: 'Search', action: () => onSearchText && onSearchText(params.selectionText) }
        ];
      } else {
        items = [
          { label: 'Back', action: () => onBack && onBack() },
          { label: 'Forward', action: () => onForward && onForward() },
          { label: 'Reload', action: () => onRefresh && onRefresh() }
        ];
      }
      if (onContextMenu) onContextMenu(items, e.x, e.y);
    };

    wv.addEventListener('dom-ready', onReady);
    wv.addEventListener('page-title-updated', onTitle);
    wv.addEventListener('page-favicon-updated', onFavicon);
    wv.addEventListener('did-navigate', onNavigate);
    wv.addEventListener('did-navigate-in-page', onNavigate);
    wv.addEventListener('did-start-loading', onStart);
    wv.addEventListener('did-stop-loading', onStop);
    wv.addEventListener('update-target-url', onHover);
    wv.addEventListener('did-fail-load', onFailLoad);
    wv.addEventListener('context-menu', handleContextMenuEvent);

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      wv.removeEventListener('dom-ready', onReady);
      wv.removeEventListener('page-title-updated', onTitle);
      wv.removeEventListener('page-favicon-updated', onFavicon);
      wv.removeEventListener('did-navigate', onNavigate);
      wv.removeEventListener('did-navigate-in-page', onNavigate);
      wv.removeEventListener('did-start-loading', onStart);
      wv.removeEventListener('did-stop-loading', onStop);
      wv.removeEventListener('update-target-url', onHover);
      wv.removeEventListener('did-fail-load', onFailLoad);
      wv.removeEventListener('context-menu', handleContextMenuEvent);
      observer.disconnect();
    };
  }, [tab.id, onTabUpdate, onHoveredLink, onContextMenu, onOpenInNewTab, onSearchText, onBack, onForward, onRefresh, activeTabId]);

  return (
    <div
      className={`webview-wrapper ${isActive ? 'visible' : 'hidden'}`}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        display: isActive ? 'flex' : 'none',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      {/* 
        ALWAYS render the webview element regardless of URL type.
        Conditionally mounting/unmounting causes Electron's guestInstanceId crash
        because React removes the DOM node while Electron still holds a reference to it.
        For cove:// pages, the webview just stays hidden behind the React page rendered in App.jsx.
      */}
      <webview
        ref={webviewRef}
        partition={isIncognito ? 'incognito' : 'persist:cove'}
        webpreferences="contextIsolation=true, javascript=true, images=true, scrollbounce=true"
        style={{ width: '100%', height: '100%', border: 'none', display: 'flex' }}
      />
    </div>
  );
});

export default WebView;