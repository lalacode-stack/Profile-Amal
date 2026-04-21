// Scroll reveal and counter animation for career page
document.addEventListener('DOMContentLoaded', () => {
  // Particles system for hero
  const canvas = document.querySelector('.particles-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.2
      });
    }
    
    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 224, 198, ${p.opacity})`;
        ctx.fill();
        
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  // Typewriter effect for heading
  const heading = document.querySelector('[data-admin-key="career.heading"]');
  if (heading) {
    const text = heading.textContent;
    heading.textContent = '';
    let i = 0;
    function typeWriter() {
      if (i < text.length) {
        heading.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 80);
      }
    }
    setTimeout(typeWriter, 500);
  }
  // Scroll reveal for timeline items
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.timeline-item-new').forEach(item => {
    observer.observe(item);
  });

  // Counter animation
  const animateCounters = () => {
    document.querySelectorAll('.stat-number').forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const count = +counter.innerText;
      const increment = target / 100;
      
      if (count < target) {
        counter.innerText = Math.ceil(count + increment);
        setTimeout(animateCounters, 20);
      } else {
        counter.innerText = target;
      }
    });
  };

  // Start counters when stats visible
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const statsEl = document.querySelector('.career-stats');
  if (statsEl) {
    statsObserver.observe(statsEl);
  }

  // Radar chart animation - Pentagon/hexagon style
  const radarData = document.querySelector('.radar-data');
  if (radarData) {
    const skills = ['Geoserver\\n95%', 'Spatial Analysis\\n88%', 'Field Survey\\n92%', 'Flood Modeling\\n90%', 'Eco GIS\\n85%', 'DB Mgmt\\n93%'];
    const values = [0.95, 0.88, 0.92, 0.90, 0.85, 0.93];
    const numSkills = 6;
    const maxRadius = 130;
    
    // Draw hexagon/pentagon grid lines
    for (let level = 1; level <= 5; level++) {
      const radius = (level / 5) * maxRadius;
      const pathData = [];
      for (let i = 0; i < numSkills; i++) {
        const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
        const x = 150 + Math.cos(angle) * radius;
        const y = 150 + Math.sin(angle) * radius;
        pathData.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
      }
      pathData.push('Z');
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      gridLine.setAttribute('d', pathData.join(' '));
      gridLine.setAttribute('fill', 'none');
      gridLine.setAttribute('stroke', `rgba(255,255,255,0.${level})`);
      gridLine.setAttribute('stroke-width', '1');
      radarData.appendChild(gridLine);
    }
    
    // Data path
    const dataPathPoints = values.map((value, i) => {
      const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
      return [150 + Math.cos(angle) * (value * maxRadius), 150 + Math.sin(angle) * (value * maxRadius)];
    });
    const dataPath = `M ${dataPathPoints[0][0].toFixed(1)},${dataPathPoints[0][1].toFixed(1)} ` +
      dataPathPoints.map(([x, y], i) => `L ${x.toFixed(1)},${y.toFixed(1)}`).slice(1).join(' ') +
      ' Z';
    const dataFill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    dataFill.setAttribute('d', dataPath);
    dataFill.setAttribute('fill', 'url(#radarGrad)');
    dataFill.setAttribute('fill-opacity', '0.3');
    dataFill.setAttribute('stroke', 'url(#radarGrad)');
    dataFill.setAttribute('stroke-width', '3');
    dataFill.style.opacity = '0';
    dataFill.style.transition = 'opacity 1s ease';
    radarData.appendChild(dataFill);
    
    // Points & labels
    dataPathPoints.forEach(([x, y], i) => {
      // Point
      const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      point.setAttribute('cx', x);
      point.setAttribute('cy', y);
      point.setAttribute('r', '8');
      point.setAttribute('fill', 'white');
      point.style.opacity = '0';
      radarData.appendChild(point);
      
      // Label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', y - 15);
      label.textContent = skills[i];
      label.setAttribute('fill', '#9af4e7');
      label.setAttribute('font-size', '11');
      label.setAttribute('font-weight', '600');
      label.setAttribute('text-anchor', 'middle');
      label.style.opacity = '0';
      radarData.appendChild(label);
    });
    
    // Animate
    setTimeout(() => {
      dataFill.style.opacity = '1';
      document.querySelectorAll('.radar-data circle, .radar-data text').forEach((el, i) => {
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'scale(1.1)';
        }, i * 150);
      });
    }, 800);
  }
    
    for (let i = 0; i < numSkills; i++) {
      const angle = (Math.PI * 2 * i) / numSkills - Math.PI / 2;
      const radius = (values[i] / 100) * 120;
      
      // Axis line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '150');
      line.setAttribute('y1', '150');
      line.setAttribute('x2', 150 + Math.cos(angle) * 140);
      line.setAttribute('y2', 150 + Math.sin(angle) * 140);
      line.setAttribute('stroke', 'rgba(255,255,255,0.3)');
      line.setAttribute('stroke-width', '1');
      radarData.appendChild(line);
      
      // Data point & path
      const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      point.setAttribute('cx', 150 + Math.cos(angle) * radius);
      point.setAttribute('cy', 150 + Math.sin(angle) * radius);
      point.setAttribute('r', '6');
      point.setAttribute('fill', 'url(#radarGrad)');
      point.style.opacity = '0';
      radarData.appendChild(point);
      
      // Label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', 150 + Math.cos(angle) * 160);
      label.setAttribute('y', 150 + Math.sin(angle) * 160 + 4);
      label.textContent = skills[i];
      label.setAttribute('fill', 'rgba(255,255,255,0.8)');
      label.setAttribute('font-size', '12');
      label.setAttribute('text-anchor', 'middle');
      radarData.appendChild(label);
    }
    
    // Animate points
    setTimeout(() => {
      document.querySelectorAll('.radar-data circle').forEach((point, i) => {
        setTimeout(() => {
          point.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
          point.style.opacity = '1';
          point.style.transform = 'scale(1.2)';
        }, i * 200);
      });
    }, 1000);
  }

  // Testimonial carousel
  const testimonials = document.querySelectorAll('.testimonial-card');
  let currentTestimonial = 0;
  setInterval(() => {
    testimonials[currentTestimonial].classList.remove('active');
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    testimonials[currentTestimonial].classList.add('active');
  }, 5000);

  // Timeline item click to expand
  document.querySelectorAll('.timeline-item-new').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });
});

