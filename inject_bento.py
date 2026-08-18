import re

def main():
    file_path = "/Users/apple/Downloads/compleate/dashboard.html"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Inject GSAP
    if "gsap.min.js" not in content:
        content = content.replace(
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>'
        )

    # 2. Inject CSS
    magic_css = """
    /* MAGIC BENTO CSS */
    .kpi {
      --glow-x: 50%;
      --glow-y: 50%;
      --glow-intensity: 0;
      --glow-radius: 200px;
      --glow-color: 246, 199, 106;
    }
    
    .kpi.magic-bento-card--border-glow::after {
      content: '';
      position: absolute;
      inset: 0;
      padding: 2px;
      background: radial-gradient(
        var(--glow-radius) circle at var(--glow-x) var(--glow-y),
        rgba(var(--glow-color), calc(var(--glow-intensity) * 0.8)) 0%,
        rgba(var(--glow-color), calc(var(--glow-intensity) * 0.4)) 30%,
        transparent 60%
      );
      border-radius: inherit;
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease;
      z-index: 10;
    }

    .kpi.magic-bento-card--border-glow:hover {
      box-shadow:
        0 4px 20px rgba(var(--glow-color), 0.1),
        0 0 30px rgba(var(--glow-color), 0.15);
    }

    .global-spotlight {
      mix-blend-mode: screen;
      will-change: transform, opacity;
      z-index: 200 !important;
      pointer-events: none;
    }
    
    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 100;
    }
    .particle::before {
      content: '';
      position: absolute;
      top: -2px; left: -2px; right: -2px; bottom: -2px;
      background: rgba(var(--glow-color), 0.2);
      border-radius: 50%;
      z-index: -1;
    }
    """
    
    if "MAGIC BENTO CSS" not in content:
        content = content.replace("</style>", magic_css + "\n  </style>")

    # 3. Add classes to .kpi
    content = content.replace('class="kpi"', 'class="kpi magic-bento-card--border-glow"')

    # 4. Inject JS logic
    magic_js = """
  <!-- MAGIC BENTO JS -->
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile || typeof gsap === 'undefined') return;

      const grid = document.querySelector('.kpi-grid');
      const cards = document.querySelectorAll('.kpi');
      const glowColor = '246, 199, 106'; // Golden Amber instead of purple
      const spotlightRadius = 300;
      
      // Update variables so they match the brand
      cards.forEach(card => card.style.setProperty('--glow-color', glowColor));

      // Global Spotlight
      const spotlight = document.createElement('div');
      spotlight.className = 'global-spotlight';
      spotlight.style.cssText = `
        position: fixed;
        width: 800px;
        height: 800px;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle,
          rgba(${glowColor}, 0.15) 0%,
          rgba(${glowColor}, 0.08) 15%,
          rgba(${glowColor}, 0.04) 25%,
          rgba(${glowColor}, 0.02) 40%,
          rgba(${glowColor}, 0.01) 65%,
          transparent 70%
        );
        z-index: 200;
        opacity: 0;
        transform: translate(-50%, -50%);
        mix-blend-mode: screen;
      `;
      document.body.appendChild(spotlight);

      document.addEventListener('mousemove', (e) => {
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const isInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        
        if (!isInside) {
          gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
          cards.forEach(card => card.style.setProperty('--glow-intensity', '0'));
          return;
        }

        const proximity = spotlightRadius * 0.5;
        const fadeDistance = spotlightRadius * 0.75;
        let minDistance = Infinity;

        cards.forEach(card => {
          const cardRect = card.getBoundingClientRect();
          const centerX = cardRect.left + cardRect.width / 2;
          const centerY = cardRect.top + cardRect.height / 2;
          const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
          const effectiveDistance = Math.max(0, distance);

          minDistance = Math.min(minDistance, effectiveDistance);
          
          let glowIntensity = 0;
          if (effectiveDistance <= proximity) glowIntensity = 1;
          else if (effectiveDistance <= fadeDistance) glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);

          const relativeX = ((e.clientX - cardRect.left) / cardRect.width) * 100;
          const relativeY = ((e.clientY - cardRect.top) / cardRect.height) * 100;
          card.style.setProperty('--glow-x', `${relativeX}%`);
          card.style.setProperty('--glow-y', `${relativeY}%`);
          card.style.setProperty('--glow-intensity', glowIntensity.toString());
          card.style.setProperty('--glow-radius', `${spotlightRadius}px`);
        });

        gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });

        const targetOpacity = minDistance <= proximity ? 0.8 : minDistance <= fadeDistance ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8 : 0;
        gsap.to(spotlight, { opacity: targetOpacity, duration: targetOpacity > 0 ? 0.2 : 0.5, ease: 'power2.out' });
      });

      document.addEventListener('mouseleave', () => {
        cards.forEach(card => card.style.setProperty('--glow-intensity', '0'));
        gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      });

      // Individual Card Animations (Tilt, Magnetism, Particles, Ripple)
      cards.forEach(card => {
        let isHovered = false;
        let timeouts = [];
        let particles = [];
        let magnetismAnimation = null;
        
        const createParticle = (x, y) => {
          const el = document.createElement('div');
          el.className = 'particle';
          el.style.background = `rgba(${glowColor}, 1)`;
          el.style.boxShadow = `0 0 6px rgba(${glowColor}, 0.6)`;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          return el;
        };

        const clearParticles = () => {
          timeouts.forEach(clearTimeout);
          timeouts = [];
          if(magnetismAnimation) magnetismAnimation.kill();
          particles.forEach(p => {
            gsap.to(p, {
              scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)',
              onComplete: () => p.parentNode?.removeChild(p)
            });
          });
          particles = [];
        };

        const animateParticles = () => {
          if (!isHovered) return;
          const rect = card.getBoundingClientRect();
          const baseParticles = Array.from({length: 12}, () => createParticle(Math.random() * rect.width, Math.random() * rect.height));
          
          baseParticles.forEach((p, i) => {
            const t = setTimeout(() => {
              if (!isHovered) return;
              const clone = p.cloneNode(true);
              card.appendChild(clone);
              particles.push(clone);
              
              gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
              gsap.to(clone, { x: (Math.random()-0.5)*100, y: (Math.random()-0.5)*100, rotation: Math.random()*360, duration: 2+Math.random()*2, ease: 'none', repeat: -1, yoyo: true });
              gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
            }, i * 100);
            timeouts.push(t);
          });
        };

        card.addEventListener('mouseenter', () => {
          isHovered = true;
          animateParticles();
          gsap.to(card, { rotateX: 5, rotateY: 5, duration: 0.3, ease: 'power2.out', transformPerspective: 1000 });
        });

        card.addEventListener('mouseleave', () => {
          isHovered = false;
          clearParticles();
          gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
        });

        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const rotateX = ((y - centerY) / centerY) * -10;
          const rotateY = ((x - centerX) / centerX) * 10;
          gsap.to(card, { rotateX, rotateY, duration: 0.1, ease: 'power2.out', transformPerspective: 1000 });
          
          const magnetX = (x - centerX) * 0.05;
          const magnetY = (y - centerY) * 0.05;
          magnetismAnimation = gsap.to(card, { x: magnetX, y: magnetY, duration: 0.3, ease: 'power2.out' });
        });

        card.addEventListener('click', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const maxDist = Math.max(Math.hypot(x, y), Math.hypot(x-rect.width, y), Math.hypot(x, y-rect.height), Math.hypot(x-rect.width, y-rect.height));
          
          const ripple = document.createElement('div');
          ripple.style.cssText = `
            position: absolute;
            width: ${maxDist*2}px; height: ${maxDist*2}px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(${glowColor},0.4) 0%, rgba(${glowColor},0.2) 30%, transparent 70%);
            left: ${x - maxDist}px; top: ${y - maxDist}px;
            pointer-events: none; z-index: 1000;
          `;
          card.appendChild(ripple);
          gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() });
        });
      });
    });
  </script>
    """
    if "MAGIC BENTO JS" not in content:
        content = content.replace("</body>", magic_js + "\n</body>")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
if __name__ == "__main__":
    main()
