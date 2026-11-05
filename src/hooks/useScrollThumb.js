import { useEffect } from 'react';

const MIN_THUMB = 24; // px, so a very long list still has a thumb you can see

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
//   thumbRef: an element laid out as the track; it gets data-scrollable and two CSS variables,
//     --thumb-top and --thumb-size (px), and draws the thumb from them
// The styles are written straight onto the element, so scrolling never re-renders React.
function useScrollThumb(areaRef, thumbRef) {
  useEffect(() => {
    const area = areaRef.current;
    const thumb = thumbRef.current;
    if (!area || !thumb) return undefined;

    let frame = 0;
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
    area.addEventListener('scroll', schedule, true);
    area.addEventListener('input', schedule, true);
    const mutations = new MutationObserver(schedule);
    mutations.observe(area, { childList: true, subtree: true, characterData: true });
    const resizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizes?.observe(area);
    resizes?.observe(thumb);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener('scroll', schedule, true);
      area.removeEventListener('input', schedule, true);
      mutations.disconnect();
      resizes?.disconnect();
    };
  }, [areaRef, thumbRef]);
}

export default useScrollThumb;
