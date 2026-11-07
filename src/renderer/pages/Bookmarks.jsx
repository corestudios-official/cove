import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';

export default function Bookmarks({ onNavigate }) {
  const [bookmarks, setBookmarks] = useStore('bookmarks', []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const handleDeleteBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100%',
      background: 'var(--webview-bg)',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <div style={{
        padding: '32px 40px',
        maxWidth: 800,
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Bookmarks</h1>
          <button
            onClick={() => setShowAddForm(v => !v)}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'var(--transition)'
            }}
          >
            <i className="fas fa-plus" style={{ fontSize: 11 }} />
            Add Bookmark
          </button>
        </div>

        {showAddForm && (
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            border: '1px solid var(--border)'
          }}>
            <input
              placeholder="Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                color: 'var(--text-1)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'OpenSauceOne, sans-serif'
              }}
            />
            <input
              placeholder="URL (https://...)"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                color: 'var(--text-1)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'OpenSauceOne, sans-serif'
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  if (!newUrl.trim()) return;
                  const bookmark = {
                    id: Date.now().toString(),
                    url: newUrl.startsWith('http') ? newUrl : 'https://' + newUrl,
                    title: newTitle || newUrl,
                    favicon: null,
                    addedAt: Date.now()
                  };
                  const updated = [bookmark, ...(bookmarks || [])];
                  setBookmarks(updated);
                  setNewUrl('');
                  setNewTitle('');
                  setShowAddForm(false);
                }}
                style={{
                  background: 'var(--accent)', color: 'white', border: 'none',
                  borderRadius: 'var(--radius-sm)', padding: '8px 16px',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'OpenSauceOne, sans-serif'
                }}
              >
                Save
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewUrl(''); setNewTitle(''); }}
                style={{
                  background: 'var(--surface2)', color: 'var(--text-1)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '8px 16px',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'OpenSauceOne, sans-serif'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      {bookmarks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="far fa-bookmark" style={{ fontSize: 32, color: 'var(--text-3)' }} />
          <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 12 }}>
            No bookmarks yet. Click the bookmark icon while browsing to save pages.
          </p>
        </div>
      ) : (
        <div>
          {bookmarks.map(bookmark => (
            <div
              key={bookmark.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 8,
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onClick={() => onNavigate(bookmark.url)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 'var(--radius-xs)',
                  flexShrink: 0,
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 10
                }}
              >
                <i className="fas fa-globe" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {bookmark.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                  {bookmark.url}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDeleteBookmark(bookmark.id); }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(192, 57, 43, 0.1)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-3)';
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
