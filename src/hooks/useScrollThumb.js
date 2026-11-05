import { useEffect } from 'react';

const MIN_THUMB = 24; // px, so a very long list still has a thumb you can see
const ACTIVE_MS = 800; // how long the thumb stays after scrolling stops

// The overflowing element that does the scrolling: the area itself, or else the first thing inside
// it that scrolls on its own (the Notes textarea, for example).
function findScroller(area) {
  const overflows = (el) => el.scrollHeight > el.clientHeight + 1;
  if (overflows(area)) return area;
  for (const el of area.querySelectorAll('*')) {
    if (!overflows(el)) continue;
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
  }
  return null;
}

// Draws a scroll thumb in place of the native scrollbar, which the dashboard hides.
//   areaRef: the region whose scrolling is shown (it or something inside it scrolls)
//   thumbRef: an element laid out as the track; it gets data-scrollable, data-active (while
//     scrolling) and two CSS variables, --thumb-top and --thumb-size (px), to draw the thumb from
// The styles are written straight onto the element, so scrolling never re-renders React.
function useScrollThumb(areaRef, thumbRef) {
  useEffect(() => {
    const area = areaRef.current;
    const thumb = thumbRef.current;
    if (!area || !thumb) return undefined;

    let frame = 0;
    let idle = 0;
    // data-active is set while scrolling and cleared a moment after it stops, so the thumb only
    // shows when it says something (the CSS also shows it on hover).
    function onScroll() {
      thumb.setAttribute('data-active', '');
      clearTimeout(idle);
      idle = setTimeout(() => thumb.removeAttribute('data-active'), ACTIVE_MS);
      schedule();
    }
    function update() {
      frame = 0;
      const scroller = findScroller(area);
      if (!scroller) {
        thumb.removeAttribute('data-scrollable');
        return;
      }
      const track = thumb.clientHeight;
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      const size = Math.min(track, Math.max(MIN_THUMB, (track * clientHeight) / scrollHeight));
      const top = ((track - size) * scrollTop) / (scrollHeight - clientHeight);
      thumb.style.setProperty('--thumb-size', `${size}px`);
      thumb.style.setProperty('--thumb-top', `${top}px`);
      thumb.setAttribute('data-scrollable', '');
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Scroll events don't bubble, but they do pass through the area on the way down (capture).
    area.addEventListener('scroll', onScroll, true);
    area.addEventListener('input', schedule, true);
    const mutations = new MutationObserver(schedule);
    mutations.observe(area, { childList: true, subtree: true, characterData: true });
    const resizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizes?.observe(area);
    resizes?.observe(thumb);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      area.removeEventListener('scroll', onScroll, true);
      area.removeEventListener('input', schedule, true);
      mutations.disconnect();
      resizes?.disconnect();
    };
  }, [areaRef, thumbRef]);
}

export default useScrollThumb;
