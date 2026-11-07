// CP2-9 FIX: Removed isRTL prop and RTL-specific context menu positioning since Arabic support was removed.
// CP2-32: Resizable sidebar, removed bottom links, New Tab button at bottom, close-tab animation
// CP2-32e FIX: Fixed guestInstanceId crash and missing animation by passing full tabs array to Sidebar
// (not filtered visibleTabs) and keeping closing tabs in DOM via filter(!tab._deleted || closingIds.has(tab.id))
// CP2-32f FIX: Removed incognito mode entirely
// CP2-32e FIX: Fixed guestInstanceId crash and missing animation by passing full tabs array to Sidebar
// (not filtered visibleTabs) and keeping closing tabs in DOM via filter(!tab._deleted || closingIds.has(tab.id))
// CP2-33: Removed shortcuts grid; added drag-to-shortcut drop zone and pinned shortcuts row
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// CP2-40: Favicon resolver for shortcuts — uses the site's own /favicon.ico
// instead of a third-party favicon service. Returns null for invalid/blank URLs.
function resolveShortcutFavicon(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    if (!u.hostname) return null;
    return `${u.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export default function Sidebar({ tabs, activeTabId, activeTab, onTabSelect, onTabClose, onNewTab, onTabReorder, onNavigate, isDark, onDuplicateTab, onReloadTab, onCopyTabUrl, onDragStart, onDragEnd, onOpenUrl }) {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState(null);
  const [menuBox, setMenuBox] = useState(null);
  const [closingIds, setClosingIds] = useState(new Set());
  const [isDraggingTab, setIsDraggingTab] = useState(false);
  const [shortcuts, setShortcuts] = useState([]);
  const [failedFavicons, setFailedFavicons] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? Math.max(200, Math.min(400, parseInt(saved, 10))) : 260;
  });
  const [isDragging, setIsDragging] = useState(false);
  const contextMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const dragHandleRef = useRef(null);

  // CP2-33: Load persisted shortcuts on mount
  // CP2-40: rewrite legacy third-party favicon URLs to the site's own /favicon.ico
  useEffect(() => {
    window.coveAPI?.invoke('cove:shortcuts-get')
      .then(list => setShortcuts((list || []).map(s =>
        s.favicon && s.favicon.includes('google.com/s2/favicons')
          ? { ...s, favicon: resolveShortcutFavicon(s.url) }
          : s
      )))
      .catch(() => setShortcuts([]));
  }, []);

  // CP2-33(C): Cancel delete mode when clicking outside any shortcut
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (!e.target.closest?.('.sidebar-shortcut')) {
        setDeletingId(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const handleShortcutDrop = (e) => {
    e.preventDefault();
    const url = e.dataTransfer.getData('tabUrl');
    const favicon = e.dataTransfer.getData('tabFavicon');
    if (!url) return;
    window.coveAPI.invoke('cove:shortcuts-add', { url, favicon })
      .then(updated => setShortcuts(updated || []))
      .catch(() => {});
  };

  const handleShortcutDelete = (id) => {
    window.coveAPI.invoke('cove:shortcuts-remove', id)
      .then(updated => setShortcuts(updated || []))
      .catch(() => {});
    setDeletingId(null);
  };

  const openOrFocusTab = (url) => {
    const existing = tabs.find(t => t.url === url && !t._deleted);
    if (existing) {
      onTabSelect(existing.id);
    } else if (onOpenUrl) {
      onOpenUrl(url);
    }
  };

  // Persist sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  // Initialize sidebar width on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, []);

  // Measure the open context menu so it can be kept inside the window bounds
  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const rect = contextMenuRef.current.getBoundingClientRect();
    setMenuBox({ w: rect.width, h: rect.height });
  }, [contextMenu]);

  // Close the tab context menu on outside click, Esc, scroll, and window blur
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target)) return;
      close();
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('blur', close);
    };
  }, [contextMenu]);

  // Clean up closingIds after animation completes (240ms)
  useEffect(() => {
    if (closingIds.size > 0) {
      const timeout = setTimeout(() => {
        setClosingIds(new Set());
      }, 240);
      return () => clearTimeout(timeout);
    }
  }, [closingIds]);

  // Drag handle logic
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    if (onDragStart) onDragStart();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(400, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (onDragEnd) onDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCloseTab = (tabId, e) => {
    if (e) e.stopPropagation();
    setClosingIds(prev => new Set([...prev, tabId]));
    onTabClose(tabId);
  };

  const handleContextMenuClose = (tabId) => {
    setClosingIds(prev => new Set([...prev, tabId]));
    onTabClose(tabId);
    setContextMenu(null);
  };

  return (
    <>
      <style>{`
        .tab-closing {
          transform: translateX(-100%);
          transition: transform 240ms ease-in;
        }
        .sidebar-shortcut {
          width: 100%;
          height: 38px;
          border-radius: 10px;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
        }
        .sidebar-shortcut:hover {
          background: var(--hover-bg);
        }
        .sidebar-shortcut .shortcut-favicon,
        .sidebar-shortcut .shortcut-delete-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: opacity 0.15s ease;
        }
        .sidebar-shortcut img.shortcut-favicon {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }
        .sidebar-shortcut .shortcut-delete-icon {
          font-size: 14px;
          color: var(--text-muted);
        }
      `}</style>
      <div
        ref={sidebarRef}
        style={{
          width: `${sidebarWidth}px`,
          height: '100%',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          WebkitAppRegion: 'drag',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Drag handle */}
        <div
          ref={dragHandleRef}
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 10,
            WebkitAppRegion: 'no-drag'
          }}
        />

        {/* Drop zone reveal area — expands when a tab drag starts */}
        <div style={{
          height: isDraggingTab ? 72 : 0,
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'all 0.2s ease'
        }}>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleShortcutDrop}
            style={{
              width: '100%',
              height: 72,
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: isDraggingTab ? 1 : 0,
              transition: 'opacity 0.2s ease',
              WebkitAppRegion: 'no-drag',
              boxSizing: 'border-box'
            }}
          >
            <i className="fas fa-thumbtack" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
            <span style={{
              fontFamily: 'OpenSauceOne, sans-serif',
              fontSize: 10,
              color: 'var(--text-secondary, #888)'
            }}>
              Drop tab to add shortcut
            </span>
          </div>
        </div>

        {/* Pinned shortcuts row */}
        {shortcuts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            padding: '6px 10px',
            flexShrink: 0,
            WebkitAppRegion: 'no-drag'
          }}>
            {shortcuts.map(shortcut => {
              const isDeleting = deletingId === shortcut.id;
              return (
                <div
                  key={shortcut.id}
                  className="sidebar-shortcut"
                  onClick={() => {
                    if (!isDeleting) openOrFocusTab(shortcut.url);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDeletingId(shortcut.id);
                  }}
                  title={shortcut.url}
                >
                  {shortcut.favicon && !failedFavicons.has(shortcut.id) ? (
                    <img
                      className="shortcut-favicon"
                      src={shortcut.favicon}
                      alt=""
                      onError={() => setFailedFavicons(prev => new Set(prev).add(shortcut.id))}
                      style={{
                        opacity: isDeleting ? 0 : 1,
                        pointerEvents: isDeleting ? 'none' : 'auto'
                      }}
                    />
                  ) : (
                    <i
                      className="fas fa-globe shortcut-favicon"
                      style={{
                        fontSize: 16,
                        color: 'var(--text-muted)',
                        opacity: isDeleting ? 0 : 1,
                        pointerEvents: isDeleting ? 'none' : 'auto'
                      }}
                    />
                  )}
                  <i
                    className="fa-solid fa-trash shortcut-delete-icon"
                    style={{
                      opacity: isDeleting ? 1 : 0,
                      pointerEvents: isDeleting ? 'auto' : 'none',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShortcutDelete(shortcut.id);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {tabs.length === 0 ? (
            <div style={{
              padding: '20px 10px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13
            }}>
              No open tabs
            </div>
          ) : (
            tabs.filter(tab => !tab._deleted || closingIds.has(tab.id)).map((tab, index) => {
              const isActive = tab.id === activeTabId;
              const isClosing = closingIds.has(tab.id);
              return (
                <div
                  key={tab.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('tabIndex', String(index));
                    e.dataTransfer.setData('tabUrl', tab.url || '');
                    e.dataTransfer.setData('tabFavicon', tab.favicon || resolveShortcutFavicon(tab.url) || '');
                    setIsDraggingTab(true);
                  }}
                  onDragEnd={() => setIsDraggingTab(false)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const from = parseInt(e.dataTransfer.getData('tabIndex'));
                    if (from !== index) onTabReorder(from, index);
                  }}
                  onClick={() => onTabSelect(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleCloseTab(tab.id);
                    }
                  }}
                  className={`sidebar-item ${isActive ? 'active' : ''} ${isClosing ? 'tab-closing' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 10px',
                    height: 32,
                    WebkitAppRegion: 'no-drag',
                    position: 'relative',
                    border: isActive ? '1px solid rgba(123,155,181,0.2)' : '1px solid transparent'
                  }}
                >
                  {tab.isLoading ? (
                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 13, color: 'var(--accent)', width: 16, textAlign: 'center', flexShrink: 0 }} />
                  ) : tab.favicon ? (
                    <img
                      src={tab.favicon}
                      width={16}
                      height={16}
                      style={{ borderRadius: 'var(--radius-xs)', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 8,
                      flexShrink: 0
                    }}>
                      <i className="fas fa-globe" />
                    </div>
                  )}
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--accent)' : 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color var(--duration-sm) var(--ease)',
                    fontFamily: 'OpenSauceOne, sans-serif'
                  }}>
                    {tab.title || 'New Tab'}
                  </span>
                  {tab.isLoading && (
                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }} />
                  )}
                  <button
                    onClick={e => handleCloseTab(tab.id, e)}
                    className="sidebar-item"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--text-muted)',
                      opacity: 1,
                      WebkitAppRegion: 'no-drag',
                      transition: 'background-color 150ms ease-in-out, color 150ms ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover-bg)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                      <line x1="0" y1="0" x2="8" y2="8" />
                      <line x1="8" y1="0" x2="0" y2="8" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* New Tab button at bottom */}
        <div style={{
          padding: '12px',
          WebkitAppRegion: 'drag',
          background: 'var(--surface)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={onNewTab}
            title="New Tab"
            className="sidebar-item"
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: 'none',
              background: 'var(--bg)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              WebkitAppRegion: 'no-drag',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              transition: 'background-color 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F7F9FC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg)';
            }}
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>
      </div>

      {contextMenu && (() => {
        const menuTab = tabs.find(tb => tb.id === contextMenu.tabId);
        const canReload = !!menuTab && !menuTab.url?.startsWith('cove://');
        const menuItems = [
          {
            icon: 'fa-rotate-right',
            label: t('tabMenu.reloadTab'),
            disabled: !canReload,
            action: () => onReloadTab && onReloadTab(contextMenu.tabId)
          },
          {
            icon: 'fa-link',
            label: t('tabMenu.copyUrl'),
            action: () => onCopyTabUrl && onCopyTabUrl(contextMenu.tabId)
          },
          {
            icon: 'fa-clone',
            label: t('tabMenu.duplicateTab'),
            action: () => onDuplicateTab && onDuplicateTab(contextMenu.tabId)
          },
          {
            icon: 'fa-xmark',
            label: t('tabMenu.closeTab'),
            action: () => handleContextMenuClose(contextMenu.tabId)
          },
          {
            icon: 'fa-xmarks-lines',
            label: t('tabMenu.closeOtherTabs'),
            action: () => {
              tabs.filter(tb => tb.id !== contextMenu.tabId && !tb._deleted).forEach(tb => handleCloseTab(tb.id));
              setContextMenu(null);
            }
          }
        ];

        const menuW = menuBox?.w ?? 190;
        const menuH = menuBox?.h ?? 210;
        const menuX = Math.max(0, Math.min(contextMenu.x, window.innerWidth - menuW - 8));
        const menuY = Math.max(0, Math.min(contextMenu.y, window.innerHeight - menuH - 8));

        const itemStyle = {
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          border: 'none',
          background: 'transparent',
          fontSize: 13,
          color: 'var(--text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'OpenSauceOne, sans-serif',
          transition: 'background-color 150ms ease-in-out'
        };

        return (
          <div
            ref={contextMenuRef}
            style={{
              position: 'fixed',
              top: menuY,
              left: menuX,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 4,
              minWidth: 190,
              zIndex: 99999,
              boxShadow: 'var(--shadow-md)',
              animation: 'fadeIn 150ms ease-in-out',
              visibility: menuBox ? 'visible' : 'hidden'
            }}>
            {menuItems.map((item) => (
              <button
                key={item.label}
                disabled={item.disabled}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (item.disabled) return;
                  item.action();
                  setContextMenu(null);
                }}
                className={item.disabled ? undefined : 'sidebar-item'}
                style={{
                  ...itemStyle,
                  opacity: item.disabled ? 0.4 : 1,
                  cursor: item.disabled ? 'default' : 'pointer'
                }}
              >
                <i className={`fas ${item.icon}`} style={{ width: 14, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }} />
                {item.label}
              </button>
            ))}
          </div>
        );
      })()}
    </>
  );
}
