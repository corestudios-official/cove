import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function ContextMenu({ items, x, y, onClose }) {
  const menuRef = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // CP2-38(A): measure the real menu size after mount, then clamp so the menu
  // flips inward instead of clipping when it would overflow the window.
  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    }
  }, [items]);

  let left = x;
  let top = y;
  if (size) {
    if (left + size.w > window.innerWidth) left = x - size.w;
    if (top + size.h > window.innerHeight) top = y - size.h;
    left = Math.max(0, left);
    top = Math.max(0, top);
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 10000,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px',
        minWidth: '180px',
        boxShadow: 'var(--shadow-md)',
        animation: 'fadeIn var(--duration-sm) var(--ease)'
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.action();
            onClose();
          }}
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
            fontFamily: 'OpenSauceOne, sans-serif',
            display: 'block'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
