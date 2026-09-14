      (() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* ================= loader ================= */
        const loaderEl = document.querySelector('.loader');
        const countEl = document.getElementById('loaderCount');
        const barFill = document.getElementById('loaderBar');
        const statusEl = document.getElementById('loaderStatus');

        const statusSteps = [
          [0, 'Initializing system'],
          [25, 'Connecting to developer network'],
          [50, 'Loading project opportunities'],
          [75, 'Building your pipeline'],
          [99, 'Ready']
        ];

        function statusFor(n) {
          let s = statusSteps[0][1];
          for (const [t, txt] of statusSteps) if (n >= t) s = txt;
          return s;
        }

        function easeOutQuart(t) {
          return 1 - Math.pow(1 - t, 4);
        }

        const loaderDuration = reduceMotion ? 150 : 2000;
        const loaderStart = performance.now();

        function tickLoader(now) {
          const elapsed = now - loaderStart;
          const raw = Math.min(elapsed / loaderDuration, 1);
          const eased = easeOutQuart(raw);
          const n = Math.max(1, Math.round(eased * 100));
          countEl.textContent = n;
          barFill.style.width = n + '%';
          statusEl.textContent = statusFor(n);
          if (raw < 1) requestAnimationFrame(tickLoader);
          else finishLoader();
        }
        requestAnimationFrame(tickLoader);

        function finishLoader() {
          setTimeout(() => {
            loaderEl.classList.add('done');
            document.body.classList.remove('locked');
            document.body.classList.add('ready');
            loaderEl.addEventListener('transitionend', () => loaderEl.remove(), { once: true });
            onScroll(); // sync pin/nav state once page becomes scrollable
          }, reduceMotion ? 50 : 250);
        }

        /* ================= mobile menu ================= */
        const burger = document.getElementById('burgerBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        burger.addEventListener('click', () => {
          const open = mobileMenu.classList.toggle('open');
          burger.setAttribute('aria-expanded', String(open));
        });
        mobileMenu.querySelectorAll('a').forEach(a =>
          a.addEventListener('click', () => mobileMenu.classList.remove('open'))
        );

        /* ================= pinned sticky text swap ================= */
        const pinSections = Array.from(document.querySelectorAll('.pin'));
        const activePins = new Set();

        const pinObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) activePins.add(entry.target);
            else activePins.delete(entry.target);
          });
        }, { threshold: 0 });
        pinSections.forEach(sec => pinObserver.observe(sec));

        function updatePinSections() {
          const imageSections = document.querySelectorAll('.image-scroll');
          imageSections.forEach(sec => {
            const mediaPanels = sec.querySelectorAll('.image-panel');
            if (mediaPanels.length) {
              const rect = sec.getBoundingClientRect();
              const vh = window.innerHeight;
              const total = rect.height - vh;
              const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
              const idx = Math.min(mediaPanels.length - 1, Math.floor(progress * mediaPanels.length));
              mediaPanels.forEach((panel, i) => panel.classList.toggle('active', i === idx));
              return;
            }
          });

          activePins.forEach(sec => {
            if (sec.querySelector('.image-panel')) return;
            const lines = sec.querySelectorAll('.pin__line');
            if (!lines.length) return;
            const rect = sec.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = rect.height - vh;
            const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
            const idx = Math.min(lines.length - 1, Math.floor(progress * lines.length));
            lines.forEach((line, i) => line.classList.toggle('active', i === idx));
          });
        }

        document.querySelectorAll('.image-panel').forEach((panel, i) => {
          panel.classList.toggle('active', i === 0);
        });

        /* ================= nav background + parallax on scroll ================= */
        const nav = document.querySelector('.nav');
        const gridBg = document.querySelector('.grid-bg');
        let ticking = false;

        function onScroll() {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            const y = window.scrollY;
            nav.classList.toggle('scrolled', y > 40);
            if (!reduceMotion) gridBg.style.setProperty('--parallax', (y * 0.04) + 'px');
            updatePinSections();
            ticking = false;
          });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        /* ================= count-up stats ================= */
        const statEls = document.querySelectorAll('.stat b[data-count]');
        const statObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.4 });
        statEls.forEach(el => statObserver.observe(el));

        function animateCount(el) {
          const target = parseFloat(el.dataset.count);
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || '';

          if (reduceMotion) {
            el.textContent = prefix + target.toLocaleString('en-US') + suffix;
            return;
          }
          const dur = 1400;
          const start = performance.now();

          function frame(now) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = Math.round(target * eased);
            el.textContent = prefix + val.toLocaleString('en-US') + suffix;
            if (p < 1) requestAnimationFrame(frame);
          }

          requestAnimationFrame(frame);
        }

        /* ================= generic scroll reveal ================= */
        const revealEls = document.querySelectorAll('.reveal');
        const revealObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.15 });
        revealEls.forEach(el => revealObserver.observe(el));

        /* ================= diagram flow-line draw ================= */
        if (!reduceMotion) {
          const flowPaths = document.querySelectorAll('.diagram .flow-line');
          flowPaths.forEach(path => {
            const len = Math.ceil(path.getTotalLength());
            path.style.strokeDasharray = len;
            path.style.strokeDashoffset = len;
          });
          const diagramObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.querySelectorAll('.flow-line').forEach((p, i) => {
                  setTimeout(() => { p.style.strokeDashoffset = '0'; }, i * 180);
                });
                obs.unobserve(entry.target);
              }
            });
          }, { threshold: 0.35 });
          document.querySelectorAll('.diagram').forEach(d => diagramObserver.observe(d));
        }

        /* ================= earnings split bar ================= */
        const splitBar = document.getElementById('splitBar');
        const earningsObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              splitBar.style.width = '80%';
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.4 });
        earningsObserver.observe(splitBar);

        /* ================= apply form (front-end only) ================= */
        const form = document.getElementById('applyForm');
        const success = document.getElementById('applySuccess');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          // Demo only: wire this up to your own backend or form service
          // (fetch(), Formspree, etc.) to actually receive submissions.
          form.style.display = 'none';
          success.classList.add('show');
        });
      })();
