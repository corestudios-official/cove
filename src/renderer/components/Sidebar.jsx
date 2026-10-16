// CP2-9 FIX: Removed isRTL prop and RTL-specific context menu positioning since Arabic support was removed.
// CP2-32: Resizable sidebar, removed bottom links, New Tab button at bottom, close-tab animation
// CP2-32e FIX: Fixed guestInstanceId crash and missing animation by passing full tabs array to Sidebar
// (not filtered visibleTabs) and keeping closing tabs in DOM via filter(!tab._deleted || closingIds.has(tab.id))
// CP2-32f FIX: Removed incognito mode entirely
// CP2-32e FIX: Fixed guestInstanceId crash and missing animation by passing full tabs array to Sidebar
// (not filtered visibleTabs) and keeping closing tabs in DOM via filter(!tab._deleted || closingIds.has(tab.id))
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ tabs, activeTabId, activeTab, onTabSelect, onTabClose, onNewTab, onTabReorder, onNavigate, isDark, profile, onDuplicateTab, onDragStart, onDragEnd }) {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState(null);
  const [closingIds, setClosingIds] = useState(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? Math.max(200, Math.min(400, parseInt(saved, 10))) : 260;
  });
  const [isDragging, setIsDragging] = useState(false);
  const contextMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const dragHandleRef = useRef(null);

  // Persist sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);

  // Initialize sidebar width on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target)) return;
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                  onDragStart={e => e.dataTransfer.setData('tabIndex', String(index))}
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

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 4,
            minWidth: 180,
            zIndex: 99999,
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 150ms ease-in-out'
          }}>
          <button
            onMouseDown={() => handleContextMenuClose(contextMenu.tabId)}
            className="sidebar-item"
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'block',
              fontFamily: 'OpenSauceOne, sans-serif',
              transition: 'background-color 150ms ease-in-out'
            }}
          >
            Close Tab
          </button>
          <button
            onMouseDown={() => {
              tabs.filter(t => t.id !== contextMenu.tabId).forEach(t => handleCloseTab(t.id));
              setContextMenu(null);
            }}
            className="sidebar-item"
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'block',
              fontFamily: 'OpenSauceOne, sans-serif',
              transition: 'background-color 150ms ease-in-out'
            }}
          >
            Close Other Tabs
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button
            onMouseDown={() => { onDuplicateTab(contextMenu.tabId); setContextMenu(null); }}
            className="sidebar-item"
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'block',
              fontFamily: 'OpenSauceOne, sans-serif',
              transition: 'background-color 150ms ease-in-out'
            }}
          >
            Duplicate Tab
          </button>
        </div>
      )}
    </>
  );
}
