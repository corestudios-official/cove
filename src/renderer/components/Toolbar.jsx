// CP2-6b FIX: Search suggestions dropdown clicks were not working because the input's
// onBlur event fired before the suggestion button's onClick could register, causing
// the dropdown to unmount before the click completed. Fixed by changing onClick to
// onMouseDown on suggestion items, which fires before onBlur and prevents the race condition.
// CP2-32e FIX: Changed close button hover background from red to gray to match minimize/maximize
// CP2-32f FIX: Removed incognito mode entirely
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ContextMenu from './ContextMenu';

export default function Toolbar({ activeTab, onNavigate, onNavigateNew, onBack, onForward, onRefresh, onStop, isDark, hoveredLink, isBookmarked, onToggleBookmark, onHome, zoomLevel, onZoomIn, onZoomOut, onResetZoom, searchEngine }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const suggestionsRef = useRef(null);

  const hasTab = !!activeTab;

  useEffect(() => {
    if (!focused) {
      setValue(activeTab?.url || '');
      setSuggestions([]);
    }
  }, [activeTab?.url, focused, hasTab]);

  // CP2-6 FIX: Search Suggestions dropdown needs to close when clicking outside.
  // Added click-outside handler similar to the existing menu handler.
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // CP2-6 FIX: Search Suggestions dropdown was not appearing because direct fetch
  // from renderer was blocked by CORS. Fixed by using IPC to proxy the request
  // through the main process, which bypasses CORS restrictions.
  useEffect(() => {
    if (!focused || value.trim().length <= 1 || value.startsWith('cove://') || value.startsWith('http://') || value.startsWith('https://')) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const data = await window.electronAPI.fetchSearchSuggestions(value, searchEngine);
        
        if (data && data[1] && Array.isArray(data[1])) {
          setSuggestions(data[1].slice(0, 5));
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, focused, searchEngine]);

  const canGoBack = activeTab?.canGoBack || false;
  const canGoForward = activeTab?.canGoForward || false;
  const isLoading = activeTab?.isLoading || false;
  const url = activeTab?.url || '';

  const handleNavigate = (overrideValue = null) => {
    let u = (overrideValue || value).trim();
    if (!u) return;
    setSuggestions([]);
    if (u.startsWith('cove://')) {
      if (!activeTab) {
        onNavigateNew(u);
      } else {
        onNavigate(u);
      }
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    // If it already has a valid protocol, return as-is
    if (u.startsWith('http://') || u.startsWith('https://')) {
      // Use the URL as-is
    } else if (!u.includes(' ') && u.includes('.')) {
      u = 'https://' + u;
    } else {
      const searchUrls = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        bing: 'https://www.bing.com/search?q='
      };
      const baseUrl = searchUrls[searchEngine] || searchUrls.google;
      u = baseUrl + encodeURIComponent(u);
    }
    if (!activeTab) {
      onNavigateNew(u);
    } else {
      onNavigate(u);
    }
    setFocused(false);
    inputRef.current?.blur();
  };

  const iconBtn = (onClick, icon, disabled = false, title = '', color = null) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="toolbar-btn"
      style={{
        fontSize: 13,
        flexShrink: 0,
        color: disabled ? 'var(--text-muted)' : (color || 'var(--text-muted)'),
        WebkitAppRegion: 'no-drag'
      }}
    >
      <i className={icon} />
    </button>
  );

  const menuItems = [
    { label: t('sidebar.newTab'), action: () => window.dispatchEvent(new CustomEvent('newTab')) },
    { label: t('sidebar.bookmarks'), action: () => onNavigate('cove://bookmarks') },
    { label: t('sidebar.history'), action: () => onNavigate('cove://history') },
    { label: t('sidebar.downloads'), action: () => onNavigate('cove://downloads') },
    { label: 'Cove Password Manager', action: () => onNavigate('cove://cpm') },
    { label: 'Profile', action: () => onNavigate('cove://profile') },
    null,
    { label: t('sidebar.settings'), action: () => onNavigate('cove://settings') }
  ];

  return (
    <div style={{
      height: 'var(--toolbar-height)',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      paddingRight: '8px',
      gap: 8,
      paddingBottom: 4,
      flexShrink: 0,
      WebkitAppRegion: 'drag'
    }}
    onDoubleClick={() => window.electronAPI.maximize()}
    >
      {/* Left nav buttons */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        {iconBtn(() => { try { onBack(); } catch(e) {} }, 'fas fa-arrow-left', !hasTab || !canGoBack, t('toolbar.back'))}
        {iconBtn(() => { try { onForward(); } catch(e) {} }, 'fas fa-arrow-right', !hasTab || !canGoForward, t('toolbar.forward'))}
        {iconBtn(() => { try { isLoading ? onStop() : onRefresh(); } catch(e) {} }, isLoading ? 'fas fa-times' : 'fas fa-redo', !hasTab, isLoading ? t('toolbar.stop') : t('toolbar.refresh'))}
        {iconBtn(() => { try { onHome(); } catch(e) {} }, 'fas fa-home', !hasTab, t('toolbar.home'))}
        {iconBtn(
          () => { try { onToggleBookmark(); } catch(e) {} },
          isBookmarked ? 'fas fa-bookmark' : 'far fa-bookmark',
          !hasTab || !activeTab?.url || activeTab?.url?.startsWith('cove://'),
          isBookmarked ? t('toolbar.removeBookmark') : t('toolbar.bookmark'),
          isBookmarked ? 'var(--accent)' : null
        )}
      </div>

      {/* Center address bar */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div
          onClick={() => inputRef.current?.focus()}
          className="address-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 8,
            cursor: 'text',
            width: '100%',
            maxWidth: '835px',
            WebkitAppRegion: 'no-drag'
          }}
        >
          {url.startsWith('https://') && (
            <i
              className={copied ? 'fas fa-check' : 'fas fa-lock'}
              style={{ fontSize: 11, color: copied ? '#4CAF50' : '#4CAF50', flexShrink: 0, cursor: 'pointer', WebkitAppRegion: 'no-drag' }}
              title={copied ? 'Copied!' : 'Click to copy URL'}
              onClick={() => {
                window.electronAPI.copyToClipboard(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
          )}
          {url.startsWith('http://') && (
            <i
              className={copied ? 'fas fa-check' : 'fas fa-globe'}
              style={{ fontSize: 11, color: copied ? '#4CAF50' : 'var(--text-muted)', flexShrink: 0, cursor: 'pointer', WebkitAppRegion: 'no-drag' }}
              title={copied ? 'Copied!' : 'Click to copy URL'}
              onClick={() => {
                window.electronAPI.copyToClipboard(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
          )}
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onFocus={() => { setFocused(true); setTimeout(() => inputRef.current?.select(), 0); }}
            onBlur={() => { setFocused(false); setValue(activeTab?.url || ''); }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNavigate();
              if (e.key === 'Escape') { 
                inputRef.current?.blur(); 
                setSuggestions([]); // CP2-6 FIX: Close suggestions on Escape
              }
            }}
            onContextMenu={e => {
              e.preventDefault();
              const items = [
                { label: 'Copy', action: () => window.electronAPI.copyToClipboard(value) },
                { label: 'Paste', action: async () => {
                  const text = await window.electronAPI.readFromClipboard();
                  setValue(text);
                }},
                { label: 'Cut', action: () => {
                  window.electronAPI.copyToClipboard(value);
                  setValue('');
                }}
              ];
              setContextMenu({ items, x: e.clientX, y: e.clientY });
            }}
            placeholder="Search or enter address"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--text)',
              fontFamily: 'OpenSauceOne, sans-serif'
            }}
          />
          {!focused && hoveredLink && (
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {hoveredLink}
            </span>
          )}
        </div>
        
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && focused && (
          <div ref={suggestionsRef} style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            marginTop: 4,
            zIndex: 9999,
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            animation: 'fadeIn 150ms ease-in-out',
            maxWidth: '835px'
          }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onMouseDown={() => {
                  setValue(suggestion);
                  setSuggestions([]);
                  handleNavigate(suggestion);
                  inputRef.current?.blur();
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'OpenSauceOne, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                <i className="fas fa-search" style={{ color: 'var(--text-muted)', fontSize: 12 }} />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right buttons */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        {zoomLevel !== undefined && zoomLevel !== 1.0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: '2px 8px',
            fontSize: 12,
            color: 'var(--text-muted)',
            border: '1px solid var(--border)'
          }}>
            <button onClick={onZoomOut} className="toolbar-btn" style={{ width: 20, height: 20, fontSize: 10 }}>
              <i className="fas fa-minus" />
            </button>
            <span onClick={onResetZoom} style={{ cursor: 'pointer', minWidth: 36, textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button onClick={onZoomIn} className="toolbar-btn" style={{ width: 20, height: 20, fontSize: 10 }}>
              <i className="fas fa-plus" />
            </button>
          </div>
        )}

        {/* Three dot menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          {iconBtn(() => setShowMenu(v => !v), 'fas fa-ellipsis-v', false, 'Menu')}
          {showMenu && (
            <div style={{
              position: 'absolute',
              top: 40,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 4,
              minWidth: 200,
              zIndex: 9999,
              boxShadow: 'var(--shadow-md)',
              animation: 'fadeIn var(--duration-sm) var(--ease)'
            }}>
              {menuItems.map((item, index) => {
                if (item === null) {
                  return (
                    <div
                      key={`divider-${index}`}
                      style={{
                        height: '1px',
                        background: 'var(--border)',
                        margin: '4px 0'
                      }}
                    />
                  );
                }
                return (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setShowMenu(false); }}
                    className="sidebar-item"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      fontSize: 13,
                      color: 'var(--text)',
                      cursor: 'pointer',
                      display: 'block',
                      fontFamily: 'OpenSauceOne, sans-serif'
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Window controls */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
          <button
            onClick={() => window.electronAPI.minimize()}
            title="Minimize"
            style={{
              width: 32,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
              borderRadius: '6px',
              fontSize: 11,
              outline: 'none',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i className="fa-solid fa-minus" />
          </button>
          <button
            onClick={() => window.electronAPI.maximize()}
            title="Maximize"
            style={{
              width: 32,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
              borderRadius: '6px',
              fontSize: 11,
              outline: 'none',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i className="fa-regular fa-square" />
          </button>
          <button
            onClick={() => window.electronAPI.closeWindow()}
            title="Close"
            style={{
              width: 32,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              WebkitAppRegion: 'no-drag',
              borderRadius: '6px',
              fontSize: 11,
              outline: 'none',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <i className="fa-solid fa-x" />
          </button>
        </div>
      </div>

      {/* Address bar context menu */}
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
