(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = $('#menuToggle');
  const nav = $('#navigation');
  const packageMenu = $('#navPackages');
  const partnerViewport = $('.partner-viewport');
  partnerViewport?.addEventListener('click', event => {
    const tile = event.target.closest('.partner-tile[role=button]');
    if (!tile || tile.closest('.partner-group[aria-hidden=true]')) return;
    const selected = tile.classList.toggle('is-color');
    tile.setAttribute('aria-pressed', String(selected));
  });
  partnerViewport?.addEventListener('keydown', event => {
    const tile = event.target.closest('.partner-tile[role=button]');
    if (!tile || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    tile.click();
  });
  function closeMenu(returnFocus = false) {
    nav.classList.remove('open');
    if (packageMenu) packageMenu.open = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Hap menynë');
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Mbyll menynë' : 'Hap menynë');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (packageMenu?.open) { if (packageMenu) packageMenu.open = false; packageMenu.querySelector('summary').focus(); }
    else if (nav.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-packages')) if (packageMenu) packageMenu.open = false;
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Entrance animations settle by themselves; no persistent banner controls.
  const hero = $('#krye');
  if (window.matchMedia('(pointer:fine)').matches) {
    let pointerFrame = 0;
    hero.addEventListener('pointermove', event => {
      if (reduced.matches || pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        hero.style.setProperty('--pointer-x', (event.clientX - bounds.left) + 'px');
        hero.style.setProperty('--pointer-y', (event.clientY - bounds.top) + 'px');
        pointerFrame = 0;
      });
    }, { passive: true });
  }

  // Show one randomly placed sparkle at a time across the hero photo.
  const twinkles = $$('.tirana-twinkles i');
  const sparkleColours = ['#829cc4', '#7fa9cb', '#c6d5ec', '#bdd9e9'];
  let sparkleTimer = 0;
  let activeTwinkle = null;
  let twinkleIndex = Math.floor(Math.random() * Math.max(1, twinkles.length));
  function placeTwinkle(spark, index) {
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const x = mobile ? 14 + Math.random() * 76 : 64 + Math.random() * 31;
    const photoHeight = Math.min(280, Math.max(180, hero.clientHeight * .27));
    const y = mobile ? hero.clientHeight - photoHeight + Math.random() * (photoHeight - 35) : hero.clientHeight * (.16 + Math.random() * .66);
    spark.style.setProperty('--spark-x', x + '%');
    spark.style.setProperty('--spark-y', y + 'px');
    spark.style.setProperty('--spark-size', (mobile ? 10 + Math.random() * 7 : 12 + Math.random() * 11) + 'px');
    spark.style.setProperty('--spark-color', sparkleColours[index % sparkleColours.length]);
    spark.style.setProperty('--spark-duration', (3.2 + Math.random() * 1.8) + 's');
  }
  function scheduleNextTwinkle(delay) {
    clearTimeout(sparkleTimer);
    if (reduced.matches || document.hidden || !twinkles.length) return;
    sparkleTimer = window.setTimeout(showNextTwinkle, delay);
  }
  function showNextTwinkle() {
    if (reduced.matches || document.hidden || !twinkles.length) return;
    const index = twinkleIndex;
    const spark = twinkles[index];
    twinkleIndex = Math.floor(Math.random() * twinkles.length);
    if (twinkles.length > 1 && twinkleIndex === index) twinkleIndex = (index + 1) % twinkles.length;
    placeTwinkle(spark, index);
    activeTwinkle = spark;
    spark.classList.add('is-pulsing');
    spark.addEventListener('animationend', () => {
      spark.classList.remove('is-pulsing');
      if (activeTwinkle === spark) {
        activeTwinkle = null;
        scheduleNextTwinkle(350 + Math.random() * 950);
      }
    }, { once: true });
  }
  function restartTwinkles() {
    clearTimeout(sparkleTimer);
    twinkles.forEach(spark => spark.classList.remove('is-pulsing'));
    activeTwinkle = null;
    if (!document.hidden && !reduced.matches) scheduleNextTwinkle(250 + Math.random() * 650);
  }
  restartTwinkles();
  reduced.addEventListener('change', restartTwinkles);
  document.addEventListener('visibilitychange', restartTwinkles);
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
    if (activeTwinkle) placeTwinkle(activeTwinkle, twinkles.indexOf(activeTwinkle));
  });
  const content = window.TIRANA_CONTENT || { reviews: [], videos: [], mediaIsReference: true };
  $$('[data-reference-label]').forEach(label => { label.hidden = !content.mediaIsReference; });
  const comparison = $('#comparisonRange');
  const stage = $('#comparisonStage');
  const pairs = content.comparisons || (content.comparison ? [content.comparison] : []);
  const previous = $('.comparison-prev');
  const next = $('.comparison-next');
  const thumbs = $('#comparisonThumbnails');
  const figure = $('.comparison-figure');
  let activePair = 0;
  let comparisonFrame = null;
  const identityMatrix = [1,0,0,0,1,0,0,0,1];
  function cropMatrix(crop, size, width, height) {
    const [x,y,w,h] = crop || [0,0,size.width,size.height];
    const scale = Math.max(width / w, height / h);
    return [scale,0,width / 2 - (x + w / 2) * scale,0,scale,height / 2 - (y + h / 2) * scale,0,0,1];
  }
  function setComparisonImage(side, pair, matrix, crop) {
    const img = side === 'before' ? $('#beforeImage') : $('#afterImage');
    const size = pair[side + 'Size'];
    const h = matrix || identityMatrix;
    const s = [h[0]-crop.x*h[6],h[1]-crop.x*h[7],h[2]-crop.x*h[8],h[3]-crop.y*h[6],h[4]-crop.y*h[7],h[5]-crop.y*h[8],h[6],h[7],h[8]];
    if (pair[side + 'Display']) {
      img.srcset = pair[side + 'Display'] + ' ' + pair[side + 'DisplayWidth'] + 'w, ' + pair[side] + ' ' + size.width + 'w';
      img.sizes = '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 60vw, 760px';
    }
    img.src = pair[side + 'Display'] || pair[side];
    img.alt = pair.title + (side === 'before' ? ' — para larjes' : ' — pas larjes');
    img.style.width = size.width + 'px';
    img.style.height = size.height + 'px';
    img.style.transform = 'matrix3d(' + [s[0],s[3],0,s[6],s[1],s[4],0,s[7],0,0,1,0,s[2],s[5],0,s[8]].join(',') + ')';
  }
  function fitComparison() {
    if (!comparisonFrame) return;
    stage.style.setProperty('--comparison-scale',Math.max(stage.clientWidth / comparisonFrame.width,stage.clientHeight / comparisonFrame.height));
  }
  function updateComparison() {
    const split = Number(comparison.value);
    stage.style.setProperty('--split',split + '%');
    comparison.setAttribute('aria-valuetext',(100 - split) + '% e pamjes pas larjes');
  }
  function showComparison(index, animate = true) {
    if (!pairs.length) return;
    activePair = (index + pairs.length) % pairs.length;
    const pair = pairs[activePair];
    const crop = pair.alignment?.crop || null;
    comparisonFrame = crop;
    stage.classList.remove('comparison-side-by-side');
    ['--comparison-width','--comparison-height','--comparison-scale'].forEach(property => stage.style.removeProperty(property));
    if (crop) {
      stage.classList.add('registered');
      stage.style.setProperty('--comparison-width',crop.width + 'px');
      stage.style.setProperty('--comparison-height',crop.height + 'px');
      for (const side of ['before','after']) {
        const matrix = pair.alignment?.[side] || cropMatrix(pair[side + 'Crop'],pair[side + 'Size'],crop.width,crop.height);
        setComparisonImage(side,pair,matrix,crop);
      }
    } else {
      stage.classList.remove('registered');
      for (const side of ['before','after']) {
        const img = side === 'before' ? $('#beforeImage') : $('#afterImage');
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.src = pair[side];
        img.alt = pair.title + (side === 'before' ? ' — para pastrimit' : ' — pas pastrimit');
        ['width','height','transform','objectFit'].forEach(property => img.style.removeProperty(property));
      }
    }
    comparison.value = String(pair.defaultSplit ?? 50);
    updateComparison();
    fitComparison();
    $('#comparisonCaption').textContent = pair.title;
    $('#comparisonCount').textContent = String(activePair + 1).padStart(2,'0') + ' / ' + String(pairs.length).padStart(2,'0');
    [...thumbs.children].forEach((button,i) => button.setAttribute('aria-current',String(i === activePair)));
    previous.disabled = next.disabled = pairs.length < 2;
    $('.comparison-navigation').hidden = pairs.length < 2;
    if (animate && !reduced.matches) { figure.classList.remove('is-switching'); void figure.offsetWidth; figure.classList.add('is-switching'); }
  }
  thumbs.replaceChildren();
  if (pairs.length > 1) pairs.forEach((pair,index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'comparison-thumb';
    button.setAttribute('aria-label',pair.title + ' — krahasimi ' + (index + 1));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    const size = pair.afterPreviewSize || pair.afterSize;
    svg.setAttribute('viewBox',(pair.afterPreviewCrop || pair.afterCrop || [0,0,size.width,size.height]).join(' '));
    svg.setAttribute('preserveAspectRatio','xMidYMid slice');svg.setAttribute('aria-hidden','true');
    const img = document.createElementNS(ns,'image');img.dataset.src = pair.afterPreview || pair.after;img.setAttribute('width',size.width);img.setAttribute('height',size.height);svg.append(img);button.append(svg);
    button.addEventListener('click',() => showComparison(index));thumbs.append(button);
  });
  previous?.addEventListener('click',() => showComparison(activePair - 1));
  next?.addEventListener('click',() => showComparison(activePair + 1));
  comparison.addEventListener('input',updateComparison);
  let dragPointer = null;
  function setComparisonFromPointer(event) {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width) return;
    const position = ((event.clientX - bounds.left) / bounds.width) * 100;
    comparison.value = String(Math.round(Math.max(0, Math.min(100, position))));
    updateComparison();
  }
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragPointer = event.pointerId;
    stage.setPointerCapture?.(event.pointerId);
    setComparisonFromPointer(event);
  });
  stage.addEventListener('pointermove', event => {
    if (dragPointer === event.pointerId) setComparisonFromPointer(event);
  });
  function endComparisonDrag(event) {
    if (dragPointer !== event.pointerId) return;
    dragPointer = null;
    if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }
  stage.addEventListener('pointerup', endComparisonDrag);
  stage.addEventListener('pointercancel', endComparisonDrag);
  if ('ResizeObserver' in window) new ResizeObserver(fitComparison).observe(stage);
  else window.addEventListener('resize',fitComparison);
  showComparison(0,false);
  // Fetch thumbnails only as the comparison section approaches the viewport.
  function loadComparisonThumbnails() {
    thumbs.querySelectorAll('image[data-src]').forEach(image => {
      image.setAttribute('href',image.dataset.src);
      delete image.dataset.src;
    });
  }
  if ('IntersectionObserver' in window) {
    const thumbnailObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      loadComparisonThumbnails();
      thumbnailObserver.disconnect();
    }, {rootMargin:'600px 0px'});
    thumbnailObserver.observe(stage);
  } else loadComparisonThumbnails();

  const videoGrid = $('#videoGrid');
  const playIcon = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M2 2 16 11 2 20Z" fill="currentColor"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M5 3v16M13 3v16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const videoPlayers = new Map();
  function syncVideoPlayback(player) {
    const {video} = player;
    if (document.hidden || !player.visible || player.manuallyPaused) {
      video.pause();
      return;
    }
    video.play().then(() => {
      // A pending play request can resolve after the visitor scrolls away.
      if (document.hidden || !player.visible || player.manuallyPaused) video.pause();
    }).catch(player.update);
  }
  const videoWarmup = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      // Metadata is enough to prepare playback without downloading every clip.
      entry.target.preload = 'metadata';
      videoWarmup.unobserve(entry.target);
    });
  }, {rootMargin:'300px 0px'}) : null;
  const videoVisibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const player = videoPlayers.get(entry.target);
      player.visible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      syncVideoPlayback(player);
    });
  }, {threshold:[0,0.1]}) : null;
  (content.videos || []).forEach((item, index) => {
    const figure = videoGrid.querySelector('[data-video-index="' + index + '"]') || document.createElement('figure');
    figure.className = 'video-card reveal'; figure.dataset.videoIndex = String(index);
    const frame = figure.querySelector('.video-frame') || document.createElement('div'); frame.className = 'video-frame';
    const video = frame.querySelector('video') || document.createElement('video');
    video.preload = 'none'; video.muted = true; video.defaultMuted = true; video.autoplay = false; video.loop = true; video.playsInline = true; video.controls = false;
    video.removeAttribute('autoplay');
    ['muted','loop','playsinline'].forEach(attribute => video.setAttribute(attribute,''));
    video.setAttribute('loading','lazy');
    if (video.getAttribute('src') !== item.src) video.src = item.src;
    if (item.poster) video.poster = item.poster;
    video.setAttribute('aria-label', item.title + ' — Kompani Pastrimi Kristal');
    const play = frame.querySelector('.video-play') || document.createElement('button'); play.type = 'button'; play.className = 'video-play';
    function updatePlaybackControl() { frame.classList.toggle('playing',!video.paused); play.setAttribute('aria-label',(video.paused ? 'Luaj videon: ' : 'Ndalo videon: ') + item.title); play.innerHTML = '<span>' + (video.paused ? playIcon : pauseIcon) + '</span>'; }
    const player = {video,visible:false,manuallyPaused:false,update:updatePlaybackControl};
    videoPlayers.set(video,player);
    play.addEventListener('click',async () => {
      player.manuallyPaused = !video.paused;
      if (player.manuallyPaused) { video.pause(); return; }
      try { await video.play(); } catch { showVideoError(); }
    });
    video.addEventListener('play',updatePlaybackControl); video.addEventListener('pause',updatePlaybackControl);
    function showVideoError() { if (frame.querySelector('.video-error')) return; const error = document.createElement('a'); error.className = 'video-error'; error.href = 'https://www.instagram.com/explore/tags/pastrim/'; error.target = '_blank'; error.rel = 'noopener'; error.textContent = 'Shihni videot në Instagram ↗'; frame.append(error); }
    video.addEventListener('error',showVideoError);
    frame.append(video,play);
    const caption = figure.querySelector('figcaption') || document.createElement('figcaption');
    if (!caption.children.length) { const text = document.createElement('div'); const title = document.createElement('h3'); title.textContent = item.title; const subtitle = document.createElement('p'); subtitle.textContent = item.subtitle || ''; text.append(title,subtitle); caption.append(text); }
    figure.append(frame,caption); if (!figure.isConnected) videoGrid.append(figure);
    updatePlaybackControl();
    videoWarmup?.observe(video);
    videoVisibility?.observe(video);
    // Without observer support the play button remains available.
  });
  document.addEventListener('visibilitychange',() => videoPlayers.forEach(syncVideoPlayback));

  const reviews = (content.reviews || []).filter(item => typeof item.text === 'string' && item.text.trim());
  const reviewsGrid = $('#reviewsGrid');
  const reviewsSection = $('#pershtypje');
  const reviewsEmpty = $('#reviewsEmpty');
  const reviewsPrevious = $('#reviewsPrevious');
  const reviewsNext = $('#reviewsNext');
  const reviewsCount = $('#reviewsCount');
  const reviewCount = reviewsGrid.children.length || reviews.length;
  reviewsEmpty.hidden = reviewCount > 0;
  reviewsSection.hidden = reviewCount === 0;

  if (!reviewsGrid.children.length) reviews.forEach((item, index) => {
    const figure = document.createElement('figure');
    figure.className = 'review-card reveal';
    figure.setAttribute('role', 'group');
    figure.setAttribute('aria-roledescription', 'slide');
    figure.setAttribute('aria-label', 'Përshtypja ' + (index + 1) + ' nga ' + reviews.length);
    const quote = document.createElement('blockquote');
    quote.textContent = item.text.trim();
    const rating = document.createElement('span');
    rating.className = 'review-stars';
    rating.setAttribute('role', 'img');
    rating.setAttribute('aria-label', 'Vlerësim me pesë yje');
    rating.textContent = '★★★★★';
    figure.append(quote, rating);
    reviewsGrid.append(figure);
  });

  function updateReviewsCarousel() {
    const cards = [...reviewsGrid.children];
    if (!cards.length) return;
    const viewport = reviewsGrid.getBoundingClientRect();
    const activeIndex = Math.max(0, cards.findIndex(card => {
      const bounds = card.getBoundingClientRect();
      return bounds.left + bounds.width / 2 >= viewport.left + 2;
    }));
    reviewsCount.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    reviewsPrevious.disabled = reviewsGrid.scrollLeft <= 2;
    reviewsNext.disabled = reviewsGrid.scrollLeft + reviewsGrid.clientWidth >= reviewsGrid.scrollWidth - 2;
  }
  function moveReviews(direction) {
    const firstCard = reviewsGrid.firstElementChild;
    if (!firstCard) return;
    const styles = getComputedStyle(reviewsGrid);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    reviewsGrid.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap), behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  reviewsPrevious.addEventListener('click', () => moveReviews(-1));
  reviewsNext.addEventListener('click', () => moveReviews(1));
  let reviewDrag = null;
  reviewsGrid.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0) return;
    reviewDrag = { pointerId: event.pointerId, startX: event.clientX, startScroll: reviewsGrid.scrollLeft };
    reviewsGrid.classList.add('is-dragging');
    reviewsGrid.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  reviewsGrid.addEventListener('pointermove', event => {
    if (!reviewDrag || event.pointerId !== reviewDrag.pointerId) return;
    reviewsGrid.scrollLeft = reviewDrag.startScroll - (event.clientX - reviewDrag.startX);
  });
  function endReviewDrag(event) {
    if (!reviewDrag || event.pointerId !== reviewDrag.pointerId) return;
    reviewDrag = null;
    reviewsGrid.classList.remove('is-dragging');
    if (reviewsGrid.hasPointerCapture(event.pointerId)) reviewsGrid.releasePointerCapture(event.pointerId);
  }
  reviewsGrid.addEventListener('pointerup', endReviewDrag);
  reviewsGrid.addEventListener('pointercancel', endReviewDrag);
  reviewsGrid.addEventListener('lostpointercapture', endReviewDrag);
  reviewsGrid.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveReviews(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  reviewsGrid.addEventListener('scroll', updateReviewsCarousel, { passive: true });
  window.addEventListener('resize', updateReviewsCarousel);
  updateReviewsCarousel();

  // Progressive enhancement: all content is visible without JavaScript.
  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      $('#mobileDock').classList.toggle('visible', !entries[0].isIntersecting);
    }, { threshold: 0 });
    heroObserver.observe($('#krye'));
    if (!reduced.matches) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); } });
      }, { threshold: 0.08 });
      $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('waiting'); observer.observe(el); } });
      // Long pages remain available even if observation is interrupted.
      window.setTimeout(() => $$('.reveal.waiting').forEach(el => el.classList.remove('waiting')), 12000);
    }
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) $$('.site-nav a').forEach(link => {
          const active = link.hash === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -60% 0px' });
    $$('.site-nav a').forEach(link => { const target = document.querySelector(link.hash); if (target) sectionObserver.observe(target); });
  }

  const form = $('#offerForm');
  const serviceField = $('#service');
  const result = $('#formResult');
  const status = $('#formStatus');
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    serviceField.value = link.dataset.service;
    serviceField.dispatchEvent(new Event('change', { bubbles: true }));
    result.hidden = true;
    closeMenu();
  }));

  function phoneValid(value) {
    const digits = value.replace(/\D/g, '');
    return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }
  const rules = {
    name: value => value.length >= 2,
    phone: phoneValid,
    service: value => [...serviceField.options].some(option => option.value === value && value),
    area: value => value.length >= 2,
  };
  function checkField(name) {
    const field = form.elements.namedItem(name);
    const valid = rules[name](field.value.trim());
    field.closest('.field').classList.toggle('has-error', !valid);
    field.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  Object.keys(rules).forEach(name => {
    const field = form.elements.namedItem(name);
    ['input', 'change'].forEach(event => field.addEventListener(event, () => {
      if (field.getAttribute('aria-invalid') === 'true') checkField(name);
      status.textContent = '';
    }));
  });
  form.addEventListener('input', () => { result.hidden = true; });
  form.addEventListener('change', () => { result.hidden = true; });
  function buildMessage() {
    const value = name => form.elements.namedItem(name).value.trim();
    const lines = [
      'Përshëndetje Kompani pastrimi Kristal! Dëshiroj të rezervoj një pastrim dhe të di çmimin.', '',
      'Emri: ' + value('name'), 'Telefoni: ' + value('phone'),
      'Shërbimi: ' + value('service'), 'Qyteti / zona / adresa: ' + value('area'),
    ];
    if (value('size')) lines.push('Sipërfaqja: ' + value('size') + ' m²');
    if (value('date')) { const parts = value('date').split('-'); lines.push('Data e preferuar: ' + parts.reverse().join('.')); }
    if (value('notes')) lines.push('Shënime: ' + value('notes'));
    lines.push('', 'Mund t’ju dërgoj foto ose video të ambientit në WhatsApp. Faleminderit!');
    return lines.join('\n');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    let firstInvalid;
    Object.keys(rules).forEach(name => { if (!checkField(name) && !firstInvalid) firstInvalid = form.elements.namedItem(name); });
    if (firstInvalid) {
      result.hidden = true;
      status.textContent = 'Ju lutem kontrolloni fushat e shënuara.';
      firstInvalid.focus();
      return;
    }
    status.textContent = '';
    const message = buildMessage();
    $('#messagePreview').textContent = message;
    $('#whatsappLink').href = 'https://wa.me/355693543074?text=' + encodeURIComponent(message);
    result.hidden = false;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  $('#copyMessage').addEventListener('click', async () => {
    const button = $('#copyMessage');
    try {
      await navigator.clipboard.writeText($('#messagePreview').textContent);
      button.textContent = 'U kopjua';
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('#messagePreview'));
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      button.textContent = 'Përzgjidhni Kopjo';
    }
    window.setTimeout(() => { button.textContent = 'Kopjo mesazhin'; }, 3000);
  });
  $('#year').textContent = new Date().getFullYear();
})();
