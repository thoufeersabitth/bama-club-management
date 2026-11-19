import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Triggers browser print with bulletproof BAMA Print Engine isolation.
 * Automatically toggles body.bama-printing-active so #root is completely
 * detached from layout calculation, preventing multi-page overflow.
 */
export function triggerBamaPrint(delayMs = 200) {
  if (typeof document === 'undefined') return;

  document.body.classList.add('bama-printing-active');

  const cleanup = () => {
    document.body.classList.remove('bama-printing-active');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    try {
      window.print();
    } catch (e) {
      console.error('Print trigger error:', e);
      cleanup();
    }

    // Safe fallback for mobile Chrome/Android where afterprint fires lazily or print spooler takes time
    const fallbackTimer = setTimeout(cleanup, 45000);
    const onUserInteraction = () => {
      clearTimeout(fallbackTimer);
      cleanup();
      window.removeEventListener('focus', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
    };
    window.addEventListener('focus', onUserInteraction, { once: true });
    window.addEventListener('touchstart', onUserInteraction, { once: true });
  }, delayMs);
}

/**
 * React Portal wrapper for mounting printable content into #bama-print-portal.
 * Safe for client-side rendering with fallback creation if portal element is missing.
 */
export function BamaPrintPortal({ children }) {
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    let node = document.getElementById('bama-print-portal');
    if (!node) {
      node = document.createElement('div');
      node.id = 'bama-print-portal';
      document.body.appendChild(node);
    }
    setMountNode(node);
  }, []);

  if (!mountNode || !children) return null;

  return createPortal(children, mountNode);
}
