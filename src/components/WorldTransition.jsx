import { forwardRef, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';

// Full-screen "water rises, new world fades in" sequence, orchestrated with GSAP.
const WorldTransition = forwardRef(function WorldTransition(_, ref) {
  const root = useRef(null), wave = useRef(null), title = useRef(null), name = useRef(null), tag = useRef(null);
  const busy = useRef(false);

  useImperativeHandle(ref, () => ({
    async play(world, swap, calm = false) {
      if (busy.current) return;
      busy.current = true;
      const el = root.current;
      name.current.textContent = world.name;
      tag.current.textContent = world.tagline;
      el.style.setProperty('--wt-top', world.colors.top);
      el.style.setProperty('--wt-bot', world.colors.bottom);
      const d = calm ? 0.01 : 1;
      const wait = (tl) => new Promise((res) => tl.eventCallback('onComplete', res));

      gsap.set(el, { display: 'block' });
      gsap.set(wave.current, { yPercent: 102 });
      gsap.set(title.current, { autoAlpha: 0, y: 24 });
      await wait(gsap.timeline().to(wave.current, { yPercent: 0, duration: 0.75 * d, ease: 'power3.inOut' }).to(title.current, { autoAlpha: 1, y: 0, duration: 0.5 * d, ease: 'power2.out' }, '-=0.3'));
      const hold = new Promise((r) => setTimeout(r, calm ? 50 : 900));
      await Promise.all([swap(), hold]);
      await wait(gsap.timeline().to(title.current, { autoAlpha: 0, y: -18, duration: 0.35 * d }).to(wave.current, { yPercent: -102, duration: 0.8 * d, ease: 'power3.inOut' }, '-=0.1'));
      gsap.set(el, { display: 'none' });
      busy.current = false;
    },
  }));

  return (
    <div className="wt" ref={root} aria-hidden="true" style={{ display: 'none' }}>
      <div className="wt-wave" ref={wave} />
      <div className="wt-title" ref={title}><span className="wt-name display" ref={name} /><span className="wt-tag" ref={tag} /></div>
    </div>
  );
});
export default WorldTransition;
