import { useEffect } from 'react';

/**
 * Custom hook for smooth scroll reveal animations across sections.
 * Automatically attaches an IntersectionObserver to elements with `.reveal-on-scroll`
 * and applies `.is-visible` when scrolled into view.
 */
export default function useScrollReveal(dependencies = []) {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.05,
      rootMargin: '0px 0px -20px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, dependencies);
}
