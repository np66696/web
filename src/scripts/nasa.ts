// src/scripts/nasa.ts — NASA APOD 页面模块入口
// 由 nasa.html 的 <script type="module" src="/src/scripts/nasa.ts"> 加载
import './nasa.css';

/* ========== TYPES ========== */

interface ApodItem {
    date: string;
    title: string;
    explanation?: string;
    url?: string;
    hdurl?: string;
    thumbnail_url?: string;
    media_type: 'image' | 'video';
}

interface I18nDict {
    title: string;
    subtitle: string;
    loading: string;
    errorTitle: string;
    errorSub: string;
    retry: string;
    carouselTitle: string;
    prevSlide: string;
    nextSlide: string;
    goToSlide: string;
    kbdHint: string;
    closeDetail: string;
    imageDetail: string;
    cardHint: string;
    viewItem: string;
}

/* ========== I18N ========== */

const i18n: Record<string, I18nDict> = {
    en: {
        title: 'Astronomy Picture of the Day',
        subtitle: 'Explore the universe — one image at a time',
        loading: 'Fetching cosmic wonders…',
        errorTitle: '⚠️ Failed to load images from NASA',
        errorSub: 'Please check your connection and try again.',
        retry: '🔄 Retry',
        carouselTitle: '🎠 Swipe to Explore',
        prevSlide: 'Previous slide',
        nextSlide: 'Next slide',
        goToSlide: 'Go to slide ',
        kbdHint: 'arrow keys · <kbd>Esc</kbd> close lightbox',
        closeDetail: 'Close detail view',
        imageDetail: 'Image detail view',
        cardHint: '🔍 tap to view',
        viewItem: 'View ',
    },
    zh: {
        title: 'NASA 每日天文图片',
        subtitle: '探索宇宙 — 每天一张，惊艳一生',
        loading: '正在获取宇宙奇观…',
        errorTitle: '⚠️ 无法从 NASA 加载图片',
        errorSub: '请检查网络连接后重试。',
        retry: '🔄 重试',
        carouselTitle: '🎠 滑动探索',
        prevSlide: '上一张',
        nextSlide: '下一张',
        goToSlide: '跳转到第 ',
        kbdHint: '方向键切换 · <kbd>Esc</kbd> 关闭详情',
        closeDetail: '关闭详情',
        imageDetail: '图片详情',
        cardHint: '🔍 点击查看',
        viewItem: '查看 ',
    },
};

let lang: string = localStorage.getItem('nasa-lang') || 'en';

function t(key: keyof I18nDict): string {
    return (i18n[lang] && i18n[lang][key]) || i18n['en'][key] || key;
}

/* ========== DOM REFERENCES ========== */

const loadingEl = document.getElementById('loading')!;
const errorEl = document.getElementById('error')!;
const gridEl = document.getElementById('grid')!;
const carouselSection = document.getElementById('carousel-section')!;
const carouselTrack = document.getElementById('carousel-track')!;
const carouselWrap = document.getElementById('carousel-wrap')!;
const carouselDots = document.getElementById('carousel-dots')!;
const prevBtn = document.getElementById('carousel-prev')!;
const nextBtn = document.getElementById('carousel-next')!;
const lightbox = document.getElementById('lightbox')!;
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxVideo = document.getElementById('lightbox-video') as HTMLIFrameElement;
const lightboxTitle = document.getElementById('lightbox-title')!;
const lightboxDate = document.getElementById('lightbox-date')!;
const lightboxExplanation = document.getElementById('lightbox-explanation')!;
const lightboxClose = document.getElementById('lightbox-close')!;
const retryBtn = document.getElementById('retry-btn')!;

/* ========== STATE ========== */

let apodData: ApodItem[] = [];
let slideIndex = 0;
let swipeActive = false;
let swipeStartX = 0;
let swipeDelta = 0;
let activePointerType = '';

/* ========== API ========== */

// 生产环境通过 wrangler.jsonc 注入 VITE_NASA_API_KEY，开发/回退使用 DEMO_KEY
const API_KEY = (import.meta.env.VITE_NASA_API_KEY as string | undefined) || 'DEMO_KEY';
const API_URL = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(API_KEY)}&count=6&thumbs=true`;

// sessionStorage 缓存：避免同一会话内重复请求消耗限流配额
const CACHE_KEY = 'nasa-apod-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时

interface CacheEntry {
    timestamp: number;
    data: ApodItem[];
}

function readCache(): ApodItem[] | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry = JSON.parse(raw) as CacheEntry;
        if (!entry || !entry.data || Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
        return entry.data;
    } catch {
        return null;
    }
}

function writeCache(data: ApodItem[]): void {
    try {
        const entry: CacheEntry = { timestamp: Date.now(), data };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
        // 缓存写入失败不影响主流程
    }
}

/**
 * 预加载前几张可见图片（非阻塞）
 */
function preloadFirstImages(data: ApodItem[], count: number): void {
    const n = Math.min(count || 2, data.length);
    for (let i = 0; i < n; i++) {
        const src = getMediaSource(data[i]);
        if (!src || /youtube\.com|youtu\.be|vimeo\.com/i.test(src)) continue;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
    }
}

function fetchData(): void {
    // 1. 优先读缓存
    const cached = readCache();
    if (cached) {
        apodData = cached;
        render();
        return;
    }

    // 2. 显示加载态，发起请求
    loadingEl.hidden = false;
    errorEl.hidden = true;
    gridEl.hidden = true;
    carouselSection.hidden = true;

    // AbortController 支持超时取消
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    fetch(API_URL, {
        signal: controller.signal,
        referrerPolicy: 'no-referrer',
    })
        .then((resp) => {
            clearTimeout(timeoutId);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.json() as Promise<ApodItem[]>;
        })
        .then((data) => {
            if (!data || !data.length) throw new Error('Empty response');
            apodData = data;
            writeCache(data);
            // 立即渲染（不等图片加载），预加载前 2 张可见图
            render();
            preloadFirstImages(apodData, 2);
        })
        .catch((err) => {
            clearTimeout(timeoutId);
            console.error('NASA API error:', err);
            loadingEl.hidden = true;
            errorEl.hidden = false;
        });
}

/* ========== RENDER ========== */

function render(): void {
    loadingEl.hidden = true;
    gridEl.hidden = false;
    carouselSection.hidden = false;
    buildGrid();
    buildCarousel();
    renderAllText();
}

function buildGrid(): void {
    gridEl.innerHTML = '';
    apodData.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', t('viewItem') + item.title);
        card.innerHTML =
            '<div class="card-image-wrap">' +
                renderMediaPreview(item, i < 2) +
            '</div>' +
            '<div class="card-body">' +
                '<p class="date">' + esc(item.date) + '</p>' +
                '<h3>' + esc(item.title) + '</h3>' +
                '<p class="excerpt">' + esc(item.explanation || '') + '</p>' +
            '</div>' +
            '<span class="card-hint">' + t('cardHint') + '</span>';

        card.addEventListener('click', () => openLightbox(i));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(i);
            }
        });
        gridEl.appendChild(card);
    });
}

function buildCarousel(): void {
    carouselTrack.innerHTML = '';
    carouselDots.innerHTML = '';
    slideIndex = 0;

    apodData.forEach((item, i) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.setAttribute('draggable', 'false');
        slide.innerHTML =
            renderMediaPreview(item, false, true) +
            '<div class="carousel-slide-caption">' +
                '<h3>' + esc(item.title) + '</h3>' +
                '<p class="date">' + esc(item.date) + '</p>' +
            '</div>';
        carouselTrack.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', t('goToSlide') + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        carouselDots.appendChild(dot);
    });

    setCarouselPos();
}

function setCarouselPos(): void {
    carouselTrack.style.transform = 'translateX(-' + (slideIndex * 100) + '%)';
    const dots = carouselDots.querySelectorAll('.carousel-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === slideIndex));
}

function goTo(idx: number): void {
    slideIndex = ((idx % apodData.length) + apodData.length) % apodData.length;
    setCarouselPos();
}

/* ========== POINTER EVENTS (touch/pen swipe) ========== */

carouselWrap.addEventListener('pointerdown', (e) => {
    activePointerType = e.pointerType;
    if (activePointerType !== 'touch' && activePointerType !== 'pen') return;

    e.preventDefault();
    swipeActive = true;
    swipeStartX = e.clientX;
    swipeDelta = 0;
    carouselTrack.style.transition = 'none';
    carouselWrap.setPointerCapture(e.pointerId);
});

carouselWrap.addEventListener('pointermove', (e) => {
    if (!swipeActive) return;
    if (activePointerType !== 'touch' && activePointerType !== 'pen') return;

    e.preventDefault();
    swipeDelta = e.clientX - swipeStartX;
    const pct = -slideIndex * 100 + (swipeDelta / carouselWrap.offsetWidth) * 100;
    carouselTrack.style.transform = 'translateX(' + pct + '%)';
});

function endSwipe(e?: PointerEvent): void {
    if (!swipeActive) return;
    swipeActive = false;

    if (activePointerType === 'touch' || activePointerType === 'pen') {
        if (e) e.preventDefault();
    }

    carouselTrack.style.transition = 'transform .45s cubic-bezier(.25,.1,.25,1)';
    const threshold = carouselWrap.offsetWidth * 0.2;

    if (swipeDelta < -threshold) goTo(slideIndex + 1);
    else if (swipeDelta > threshold) goTo(slideIndex - 1);
    else setCarouselPos();

    swipeDelta = 0;
    activePointerType = '';
}

carouselWrap.addEventListener('pointerup', () => endSwipe());
carouselWrap.addEventListener('pointercancel', () => {
    if (!swipeActive) return;
    swipeActive = false;
    carouselTrack.style.transition = 'transform .45s cubic-bezier(.25,.1,.25,1)';
    setCarouselPos();
    swipeDelta = 0;
    activePointerType = '';
});

/* Prevent context menu during touch/pen drag */
carouselWrap.addEventListener('contextmenu', (e) => {
    if (activePointerType === 'touch' || activePointerType === 'pen') {
        e.preventDefault();
    }
});

/* ========== BUTTON NAV ========== */

prevBtn.addEventListener('click', () => goTo(slideIndex - 1));
nextBtn.addEventListener('click', () => goTo(slideIndex + 1));

/* ========== KEYBOARD NAV ========== */

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (lightbox.classList.contains('open')) {
            e.preventDefault();
            closeLightbox();
        }
        return;
    }
    if (e.key === 'ArrowLeft') {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        e.preventDefault();
        goTo(slideIndex - 1);
    }
    if (e.key === 'ArrowRight') {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        e.preventDefault();
        goTo(slideIndex + 1);
    }
});

/* ========== LIGHTBOX ========== */

function openLightbox(idx: number): void {
    const item = apodData[idx];
    const isVideo = item.media_type === 'video';
    lightboxImg.hidden = isVideo;
    lightboxVideo.hidden = !isVideo;
    if (isVideo) {
        lightboxVideo.src = getVideoEmbedUrl(item.url || '');
        lightboxVideo.title = item.title;
    } else {
        lightboxImg.src = getMediaSource(item);
        lightboxImg.alt = item.title;
    }
    lightboxTitle.textContent = item.title;
    lightboxDate.textContent = item.date;
    lightboxExplanation.textContent = item.explanation || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
}

function closeLightbox(): void {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxImg.src = '';
    lightboxVideo.src = '';
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && typeof activeEl.blur === 'function') activeEl.blur();
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
});

/* ========== RETRY ========== */

retryBtn.addEventListener('click', fetchData);

/* ========== LANGUAGE TOGGLE ========== */

function setLang(newLang: string): void {
    if (newLang === lang) return;
    lang = newLang;
    localStorage.setItem('nasa-lang', lang);
    updateLanguageUI();
    renderAllText();
}

function updateLanguageUI(): void {
    const btns = document.querySelectorAll<HTMLButtonElement>('#lang-toggle button');
    btns.forEach((b) => {
        const isActive = b.getAttribute('data-lang') === lang;
        b.classList.toggle('active', isActive);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(isActive));
    });
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

function renderAllText(): void {
    // Header
    const h1 = document.querySelector('.header h1');
    if (h1) h1.textContent = t('title');
    const subtitle = document.querySelector('.header .subtitle');
    if (subtitle) subtitle.textContent = t('subtitle');

    // Loading
    const loadingP = document.querySelector('#loading p');
    if (loadingP) loadingP.textContent = t('loading');

    // Error
    const errP = document.querySelector('#error > p');
    if (errP) errP.textContent = t('errorTitle');
    const errSub = document.querySelector('#error .err-sub');
    if (errSub) errSub.textContent = t('errorSub');
    retryBtn.textContent = t('retry');

    // Carousel
    const carTitle = document.querySelector('#carousel-section .section-title');
    if (carTitle) carTitle.innerHTML = '<span class="icon">🎠</span> ' + t('carouselTitle');
    prevBtn.setAttribute('aria-label', t('prevSlide'));
    nextBtn.setAttribute('aria-label', t('nextSlide'));
    const kbdB = document.querySelector('.kbd-bar');
    if (kbdB) kbdB.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> ' + t('kbdHint');

    // Close button
    lightboxClose.setAttribute('aria-label', t('closeDetail'));

    // Lightbox dialog
    lightbox.setAttribute('aria-label', t('imageDetail'));

    // Cards — update hints & aria-labels
    const cards = document.querySelectorAll('#grid .card');
    cards.forEach((card, i) => {
        const hint = card.querySelector('.card-hint');
        if (hint) hint.textContent = t('cardHint');
        if (apodData[i]) {
            card.setAttribute('aria-label', t('viewItem') + apodData[i].title);
        }
    });

    // Carousel dots
    const dots = document.querySelectorAll('#carousel-dots .carousel-dot');
    dots.forEach((dot, i) => {
        dot.setAttribute('aria-label', t('goToSlide') + (i + 1));
    });
}

document.getElementById('lang-toggle')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (!btn) return;
    const newLang = btn.getAttribute('data-lang');
    if (newLang) setLang(newLang);
});

/* ========== BLOCK PULL-TO-REFRESH ========== */

document.addEventListener('touchmove', (e) => {
    if (lightbox.classList.contains('open')) {
        if (!(e.target as HTMLElement).closest('.lightbox-content')) {
            e.preventDefault();
        }
    }
}, { passive: false });

/* ========== UTILS ========== */

const escCache: Record<string, string> = Object.create(null);

function getMediaSource(item: ApodItem): string {
    return item.media_type === 'video' ? (item.thumbnail_url || '') : (item.hdurl || item.url || '');
}

function getVideoEmbedUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // 协议白名单：仅允许 http/https，防止 javascript: 等危险协议进入 iframe src
        if (!/^https?:$/.test(parsed.protocol)) {
            console.warn('Blocked non-http(s) video URL:', url);
            return '';
        }
        if (/(^|\.)youtu\.be$/i.test(parsed.hostname)) {
            return 'https://www.youtube.com/embed' + parsed.pathname;
        }
        if (/(^|\.)youtube\.com$/i.test(parsed.hostname) && parsed.pathname === '/watch') {
            return 'https://www.youtube.com/embed/' + parsed.searchParams.get('v');
        }
        if (/(^|\.)vimeo\.com$/i.test(parsed.hostname) && !/^player\./i.test(parsed.hostname)) {
            return 'https://player.vimeo.com/video' + parsed.pathname;
        }
    } catch {
        console.warn('Invalid NASA video URL:', url);
        return '';
    }
    // 未知主机但协议合法：返回原始 URL（iframe 加载由 CSP frame-src 二次限制）
    return url;
}

function renderMediaPreview(item: ApodItem, highPriority?: boolean, draggable?: boolean): string {
    const src = getMediaSource(item);
    if (!src) {
        return '<div class="media-fallback" role="img" aria-label="' + esc(item.title) + '">🎬<span>Video</span></div>';
    }
    return '<img src="' + esc(src) + '" alt="' + esc(item.title) + '" loading="lazy" decoding="async"' +
        (highPriority ? ' fetchpriority="high"' : '') + (draggable ? ' draggable="false"' : '') + ' />';
}

function esc(str: string | null | undefined): string {
    if (str == null) return '';
    const s = '' + str;
    if (escCache[s]) return escCache[s];
    // 仅转义 HTML 关键字符，避免创建 DOM 元素的开销
    const result = s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    escCache[s] = result;
    return result;
}

/* ========== INIT ========== */

updateLanguageUI();
renderAllText();
fetchData();
