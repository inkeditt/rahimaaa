/**
 * ==========================================================================
 * SCRIPT PRINCIPAL - RAHIMANNIVERSAIRE
 * ==========================================================================
 * Gestion du scroll intelligent (snapping assisté), de la navigation, 
 * des odomètres mécaniques et de la constellation interactive de bulles.
 */

'use strict';

const pages = ['rahimanniv', 'rahimaths', 'rahimessages', 'rahimood'];

/* ==========================================================================
   1. GESTION DE LA NAVIGATION ET MISE À JOUR VISUELLE
   ========================================================================== */

/**
 * Met à jour l'indicateur actif de la barre de navigation flottante.
 * @param {string} activeTarget - Identifiant de la section active.
 */
function updateNavIndicator(activeTarget) {
    const bar = document.getElementById('bottom-nav-bar');
    if (bar) {
        bar.setAttribute('data-active', activeTarget);
        const indicator = bar.querySelector('.nav-indicator');
        const targetLink = bar.querySelector(`[data-target="${activeTarget}"]`);
        if (indicator && targetLink) {
            const isHorizontal = window.matchMedia('(min-aspect-ratio: 1/1)').matches;
            if (isHorizontal) {
                const topPos = targetLink.offsetTop;
                indicator.style.transform = `translateY(${topPos - 12}px)`;
            } else {
                const leftPos = targetLink.offsetLeft;
                indicator.style.transform = `translateX(${leftPos - 12}px)`;
            }
        }
    }
}

// Observation des sections pour synchroniser l'UI au défilement
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            if (pages.includes(id)) {
                updateNavIndicator(id);
                history.replaceState(null, null, ' ');
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.section').forEach(sec => sectionObserver.observe(sec));

// Clic sur les liens de navigation avec défilement fluide
document.querySelectorAll('.nav-icon-bubble').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); 
        const targetId = link.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
            updateNavIndicator(targetId);
            history.replaceState(null, null, ' ');
        }
    });
});


/* ==========================================================================
   2. ODOMÈTRE MÉCANIQUE (PAGE 2)
   ========================================================================== */

/**
 * Initialise les roulettes mécaniques pour les compteurs statistiques.
 */
function initOdometers() {
    document.querySelectorAll('.odometer').forEach(odo => {
        const startNum = parseInt(odo.getAttribute('data-start'), 10);
        const endNum = parseInt(odo.getAttribute('data-end'), 10);
        const step = parseInt(odo.getAttribute('data-step') || "5", 10);
        
        const sequence = [];
        for (let i = startNum; i <= endNum; i += step) sequence.push(i.toString());
        if (sequence[sequence.length - 1] !== endNum.toString()) sequence.push(endNum.toString());
        
        const maxLen = sequence[sequence.length - 1].length;
        const columnsData = [];
        odo.innerHTML = '';
        
        for (let colIdx = 0; colIdx < maxLen; colIdx++) {
            const colDiv = document.createElement('div');
            colDiv.className = 'digit-col';
            const stripDiv = document.createElement('div');
            stripDiv.className = 'digit-strip';
            
            const digitPath = [];
            sequence.forEach(numStr => {
                const padded = numStr.padStart(maxLen, '0');
                const char = padded[colIdx];
                if (digitPath.length === 0 || digitPath[digitPath.length - 1] !== char) {
                    digitPath.push(char);
                }
            });
            
            digitPath.forEach(char => {
                const span = document.createElement('span');
                span.textContent = char;
                stripDiv.appendChild(span);
            });
            
            colDiv.appendChild(stripDiv);
            odo.appendChild(colDiv);
            columnsData.push({ strip: stripDiv, stepsCount: digitPath.length });
        }
        
        odo._animate = () => {
            columnsData.forEach(col => {
                col.strip.style.transition = 'none';
                col.strip.style.transform = 'translateY(0)';
                if (col.stepsCount > 1) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const maxOffset = (col.stepsCount - 1) * 1.1;
                            col.strip.style.transition = 'transform 2.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
                            col.strip.style.transform = `translateY(-${maxOffset}em)`;
                        });
                    });
                }
            });
        };
    });
}

const exploitsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.odometer').forEach(odo => { if (odo._animate) odo._animate(); });
        }
    });
}, { threshold: 0.4 });


/* ==========================================================================
   3. CONSTELLATION FLUIDE & SIMULATION DE FORCES (PAGE 3)
   ========================================================================== */

const container = document.getElementById('cloud-container');
const dots = container ? Array.from(container.querySelectorAll('.dot-card')) : [];
let originalLayout = new Map();
let activeDot = null;
let interactionMode = 'none';
let isMobile = window.matchMedia('(hover: none)').matches;

const brownColorPairs = [
    { dark: '#806653', light: '#F5EDE5' }, { dark: '#8A6D5B', light: '#F6EEE6' },
    { dark: '#92715D', light: '#F7EFE7' }, { dark: '#987663', light: '#F7F0E8' },
    { dark: '#9F7B66', light: '#F8F0E8' }, { dark: '#A4816B', light: '#F8F1E9' },
    { dark: '#AA866E', light: '#F9F1E9' }, { dark: '#B08B72', light: '#F9F2EA' },
    { dark: '#B58F77', light: '#F9F2EB' }, { dark: '#BA957D', light: '#FAF3EC' },
    { dark: '#C09B82', light: '#FAF3ED' }, { dark: '#C5A087', light: '#FAF4EE' }
];

// Attribution aléatoire de nuances de marron chaleureuses
dots.forEach((dot) => {
    const randomPair = brownColorPairs[Math.floor(Math.random() * brownColorPairs.length)];
    dot.style.setProperty('--c', randomPair.dark);
    dot.style.setProperty('--bg-msg', randomPair.light);
});

const nameCounts = {};
dots.forEach(dot => {
    const name = dot.getAttribute('data-name') || '';
    if(name) nameCounts[name] = (nameCounts[name] || 0) + 1;
});

const currentIndexes = {};
dots.forEach(dot => {
    const contentDiv = dot.querySelector('.dot-content');
    if (contentDiv) {
        dot.dataset.fullText = contentDiv.textContent.trim();
    }

    const senderDiv = dot.querySelector('.dot-sender');
    if (!senderDiv) return;
    const name = dot.getAttribute('data-name') || '';
    const rawCat = dot.getAttribute('data-cat') || '';
    const gender = dot.getAttribute('data-gender') || 'male';
    
    let category = rawCat;
    if (rawCat.toLowerCase().includes('quidditch')) {
        category = (gender === 'female') ? 'Joueuse de Quidditch' : 'Joueur de Quidditch';
    }
    
    currentIndexes[name] = (currentIndexes[name] || 0) + 1;
    const total = nameCounts[name];
    const countStr = total > 1 ? `<div class="dot-count">${currentIndexes[name]}/${total}</div>` : '';

    const words = name.split(' ');
    let formattedNameHtml = words.map(w => `<span class="name-group">${w.replace(/-/g, '&#8209;')}</span>`).join(' ');

    senderDiv.innerHTML = `
        <div class="name-group-wrap">${formattedNameHtml}</div>
        <div class="dot-category">${category}</div>
        ${countStr}
    `;
});

function getBaseSize(dot) {
    const value = getComputedStyle(dot).getPropertyValue('--dot-size').trim();
    const size = parseFloat(value);
    return Number.isFinite(size) ? size : 30;
}

function getVisibleDots() {
    return dots.filter(dot => !dot.classList.contains('is-hidden'));
}

function getDotRadius(dot) {
    const width = parseFloat(dot.style.getPropertyValue('--dot-size')) || parseFloat(dot.dataset.baseWidth) || getBaseSize(dot);
    return width / 2;
}

function clampPositionToContainer(x, y, radius) {
    const W = container.clientWidth;
    const H = container.clientHeight;
    return {
        x: Math.max(radius + 4, Math.min(W - radius - 4, x)),
        y: Math.max(radius + 4, Math.min(H - radius - 4, y))
    };
}

function calculateGap(visibleDots) {
    const W = container.clientWidth;
    const H = container.clientHeight;
    const radii = visibleDots.map(dot => getDotRadius(dot));

    for (let gap = 30; gap >= 8; gap -= 1) {
        const totalDiameter = radii.reduce((sum, radius) => sum + radius * 2, 0);
        const avgDiameter = totalDiameter / Math.max(radii.length, 1);
        const approxCols = Math.max(1, Math.floor(W / (avgDiameter + gap)));
        const approxRows = Math.max(1, Math.ceil(visibleDots.length / approxCols));
        if (approxRows * (avgDiameter + gap) <= H * 0.9) return gap;
    }
    return 8;
}

function calculateOriginalLayout() {
    const visibleDots = getVisibleDots();
    if (!visibleDots.length) return;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const centerX = W / 2;
    const centerY = H / 2;
    const gap = calculateGap(visibleDots);

    const positions = visibleDots.map((dot, index) => {
        const radius = getDotRadius(dot);
        const angle = index * 2.399963;
        const spread = Math.min(W, H) * 0.22;
        const randomOffset = (Math.random() - 0.5) * 30;
        
        const clamped = clampPositionToContainer(centerX + Math.cos(angle) * spread + randomOffset, centerY + Math.sin(angle) * spread + randomOffset, radius);
        return { dot, x: clamped.x, y: clamped.y, radius };
    });

    for (let i = 0; i < 300; i++) {
        let hasCollision = false;
        for (let a = 0; a < positions.length; a++) {
            for (let b = a + 1; b < positions.length; b++) {
                let p1 = positions[a], p2 = positions[b];
                let dx = p2.x - p1.x, dy = p2.y - p1.y;
                let dist = Math.hypot(dx, dy) || 1;
                let req = p1.radius + p2.radius + gap;
                if (dist < req) {
                    hasCollision = true;
                    let overlap = (req - dist) * 0.5;
                    p1.x -= (dx / dist) * overlap;
                    p1.y -= (dy / dist) * overlap;
                    p2.x += (dx / dist) * overlap;
                    p2.y += (dy / dist) * overlap;
                }
            }
        }
        positions.forEach(p => {
            let clamped = clampPositionToContainer(p.x, p.y, p.radius);
            p.x = clamped.x; p.y = clamped.y;
            p.x += (centerX - p.x) * 0.002;
            p.y += (centerY - p.y) * 0.002;
        });
        if (!hasCollision) break;
    }

    originalLayout.clear();
    positions.forEach(p => {
        originalLayout.set(p.dot, { x: p.x, y: p.y, width: getBaseSize(p.dot) });
        p.dot.dataset.baseWidth = getBaseSize(p.dot);
    });
    restoreOriginalLayout();
}

function restoreOriginalLayout() {
    dots.forEach(dot => {
        const original = originalLayout.get(dot);
        if (!original) return;
        dot.classList.remove('state-name', 'state-message');
        
        const innerBox = dot.querySelector('.dot-inner-box');
        if (innerBox) {
            const sender = dot.querySelector('.dot-sender');
            const content = dot.querySelector('.dot-content');
            if (sender) dot.appendChild(sender);
            if (content) dot.appendChild(content);
            innerBox.remove();
        }

        dot.style.setProperty('--dot-size', `${original.width}px`);
        dot.style.width = `${original.width}px`;
        dot.style.height = `${original.width}px`;
        dot.style.left = `${original.x}px`;
        dot.style.top = `${original.y}px`;

        const content = dot.querySelector('.dot-content');
        if (content && dot.dataset.fullText) content.textContent = dot.dataset.fullText;
    });
    activeDot = null;
    interactionMode = 'none';
}

function calculateCompactDiameter(dot, isMessageState = false) {
    const sender = dot.querySelector('.dot-sender');
    const content = dot.querySelector('.dot-content');
    if (!sender) return getBaseSize(dot);

    let innerBox = dot.querySelector('.dot-inner-box');
    if (!innerBox) {
        innerBox = document.createElement('div');
        innerBox.className = 'dot-inner-box';
        innerBox.appendChild(sender);
        if (isMessageState && content) innerBox.appendChild(content);
        dot.appendChild(innerBox);
    }

    const prevSize = dot.style.getPropertyValue('--dot-size');
    dot.style.setProperty('--dot-size', 'auto');
    dot.style.width = 'auto';
    dot.style.height = 'auto';
    
    let minW = 60, maxW = isMessageState ? 420 : 280, bestSide = maxW;
    while (minW <= maxW) {
        let mid = Math.floor((minW + maxW) / 2);
        innerBox.style.width = `${mid}px`;
        innerBox.style.height = `${mid}px`;
        let totalH = sender.getBoundingClientRect().height + ((isMessageState && content) ? content.getBoundingClientRect().height + 14 : 0);
        if (totalH <= mid) { bestSide = mid; maxW = mid - 1; } else { minW = mid + 1; }
    }
    
    innerBox.style.width = ''; innerBox.style.height = '';
    dot.style.setProperty('--dot-size', prevSize);
    dot.style.width = prevSize; dot.style.height = prevSize;
    
    let diameter = Math.ceil(bestSide * (isMessageState ? 1.35 : 1.6));
    return Math.max(isMessageState ? 110 : 90, Math.min(isMessageState ? 380 : 260, diameter));
}

function computeStableLayout(activeDot, activeSize) {
    const original = originalLayout.get(activeDot);
    if (!original) return { activePos: { x: original.x, y: original.y, radius: activeSize / 2 }, othersPos: [] };
    
    const activeRadius = activeSize / 2;
    const clampedActive = clampPositionToContainer(original.x, original.y, activeRadius);
    
    const others = getVisibleDots().filter(d => d !== activeDot);
    const othersPos = others.map(dot => {
        const pos = originalLayout.get(dot);
        let size = (interactionMode === 'message') ? Math.max(16, pos.width * 0.65) : pos.width;
        let dx = pos.x - clampedActive.x, dy = pos.y - clampedActive.y;
        let dist = Math.hypot(dx, dy) || 1;
        let minD = activeRadius + (size / 2) + (interactionMode === 'message' ? 14 : 10);
        let x = pos.x, y = pos.y;
        if (dist < minD) {
            x = clampedActive.x + (dx / dist) * minD;
            y = clampedActive.y + (dy / dist) * minD;
        }
        let clamped = clampPositionToContainer(x, y, size / 2);
        return { dot, x: clamped.x, y: clamped.y, radius: size / 2, size };
    });

    for (let i = 0; i < 40; i++) {
        let hasCollision = false;
        for (let a = 0; a < othersPos.length; a++) {
            for (let b = a + 1; b < othersPos.length; b++) {
                let p1 = othersPos[a], p2 = othersPos[b];
                let dx = p2.x - p1.x, dy = p2.y - p1.y;
                let dist = Math.hypot(dx, dy) || 1;
                let req = p1.radius + p2.radius + (interactionMode === 'message' ? 12 : 8);
                if (dist < req) {
                    hasCollision = true;
                    let overlap = (req - dist) * 0.5;
                    p1.x -= (dx / dist) * overlap;
                    p1.y -= (dy / dist) * overlap;
                    p2.x += (dx / dist) * overlap;
                    p2.y += (dy / dist) * overlap;
                }
            }
        }
        othersPos.forEach(p => {
            let clamped = clampPositionToContainer(p.x, p.y, p.radius);
            p.x = clamped.x; p.y = clamped.y;
            let dx = p.x - clampedActive.x, dy = p.y - clampedActive.y;
            let dist = Math.hypot(dx, dy) || 1;
            let minD = activeRadius + p.radius + (interactionMode === 'message' ? 14 : 10);
            if (dist < minD) {
                p.x = clampedActive.x + (dx / dist) * minD;
                p.y = clampedActive.y + (dy / dist) * minD;
                let reClamp = clampPositionToContainer(p.x, p.y, p.radius);
                p.x = reClamp.x; p.y = reClamp.y;
            }
        });
        if (!hasCollision) break;
    }

    return {
        activePos: { x: clampedActive.x, y: clampedActive.y, radius: activeRadius },
        othersPos
    };
}

function applyTemporaryLayout(activeDot, activeSize) {
    const layout = computeStableLayout(activeDot, activeSize);
    
    activeDot.style.left = `${layout.activePos.x}px`;
    activeDot.style.top = `${layout.activePos.y}px`;

    layout.othersPos.forEach(p => {
        if (interactionMode === 'message') {
            p.dot.style.setProperty('--dot-size', `${p.size}px`);
            p.dot.style.width = `${p.size}px`; 
            p.dot.style.height = `${p.size}px`;
        }
        p.dot.style.left = `${p.x}px`;
        p.dot.style.top = `${p.y}px`;
    });
}

function showName(dot) {
    if (!dot.querySelector('.dot-sender')) return;
    if (activeDot && activeDot !== dot) restoreOriginalLayout();
    activeDot = dot;
    interactionMode = 'name';
    dot.classList.remove('state-message');
    dot.classList.add('state-name');

    const sender = dot.querySelector('.dot-sender');
    if (!dot.querySelector('.dot-inner-box')) {
        const innerBox = document.createElement('div');
        innerBox.className = 'dot-inner-box';
        innerBox.appendChild(sender);
        dot.appendChild(innerBox);
    }

    const size = calculateCompactDiameter(dot, false);
    applyTemporaryLayout(dot, size);
    
    dot.style.setProperty('--dot-size', `${size}px`);
    dot.style.width = `${size}px`; 
    dot.style.height = `${size}px`;
}

function showMessage(dot) {
    if (!dot.querySelector('.dot-sender')) return;
    activeDot = dot;
    interactionMode = 'message';
    const content = dot.querySelector('.dot-content');
    if (!content) return;

    content.textContent = dot.dataset.fullText || content.textContent.trim();
    dot.classList.remove('state-name');
    dot.classList.add('state-message');

    const innerBox = dot.querySelector('.dot-inner-box') || document.createElement('div');
    if (!innerBox.classList.contains('dot-inner-box')) {
        innerBox.className = 'dot-inner-box';
        innerBox.appendChild(dot.querySelector('.dot-sender'));
        dot.appendChild(innerBox);
    }
    if (!innerBox.contains(content)) innerBox.appendChild(content);

    const size = calculateCompactDiameter(dot, true);
    applyTemporaryLayout(dot, size);
    
    dot.style.setProperty('--dot-size', `${size}px`);
    dot.style.width = `${size}px`; 
    dot.style.height = `${size}px`;
}

dots.forEach(dot => {
    dot.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!dot.querySelector('.dot-sender')) return;
        if (!isMobile) {
            if (interactionMode === 'message') { restoreOriginalLayout(); return; }
            showMessage(dot);
            return;
        }
        if (activeDot === dot) {
            if (interactionMode === 'name') { showMessage(dot); return; }
            else { restoreOriginalLayout(); return; }
        }
        showName(dot);
    });

    dot.addEventListener('mouseenter', function() {
        if (isMobile || interactionMode === 'message' || !dot.querySelector('.dot-sender')) return;
        showName(dot);
    });

    dot.addEventListener('mouseleave', function() {
        if (isMobile || interactionMode === 'message') return;
        restoreOriginalLayout();
    });
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container')) {
        const dropdown = document.getElementById('custom-dropdown');
        const box = document.getElementById('search-container-box');
        if (dropdown) dropdown.classList.remove('show');
        if (box) box.classList.remove('dropdown-open');
    }
    if (!e.target.closest('.dot-card') && !e.target.closest('.controls-container') && interactionMode !== 'none') {
        restoreOriginalLayout();
    }
});

function applyFilters() {
    const searchBar = document.getElementById('search-bar');
    if (!searchBar) return;
    const rawQuery = searchBar.value;
    if (rawQuery.trim() === '') document.querySelectorAll('#custom-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);
    const terms = rawQuery.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

    restoreOriginalLayout();
    dots.forEach(dot => {
        if (!dot.querySelector('.dot-sender')) return;
        const name = (dot.getAttribute('data-name') || '').toLowerCase();
        const rawCat = (dot.getAttribute('data-cat') || '').toLowerCase();
        const gender = (dot.getAttribute('data-gender') || 'male').toLowerCase();
        const house = (dot.getAttribute('data-house') || '').toLowerCase();
        let dynamicCat = rawCat.includes('quidditch') ? (gender === 'female' ? 'joueuse de quidditch' : 'joueur de quidditch') : rawCat;
        let text = (dot.dataset.fullText || '').toLowerCase();

        let matches = terms.length === 0 || terms.every(term => {
            let st = (term.includes('joueur') || term.includes('joueuse')) ? 'quidditch' : term;
            return name.includes(st) || dynamicCat.includes(st) || house.includes(st) || text.includes(st);
        });
        dot.classList.toggle('is-hidden', !matches);
    });
    setTimeout(calculateOriginalLayout, 30);
}

function handleSearchInput(q) {
    const checkboxes = document.querySelectorAll('#custom-dropdown input[type="checkbox"]');
    if (q.trim() === '') checkboxes.forEach(cb => cb.checked = false);
    applyFilters();
}

function handleCheckboxChange() {
    const checked = Array.from(document.querySelectorAll('#custom-dropdown input[type="checkbox"]'))
        .filter(cb => cb.checked).map(cb => cb.value === 'Joueur' ? 'Joueurs de Quidditch' : cb.value);
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.value = checked.join(', ');
    applyFilters();
}

function toggleDropdownMenu(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('custom-dropdown');
    const box = document.getElementById('search-container-box');
    if (dropdown) dropdown.classList.toggle('show');
    if (box) box.classList.toggle('dropdown-open');
}

window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(() => { 
        restoreOriginalLayout(); 
        calculateOriginalLayout(); 
        const activeBar = document.querySelector('.bottom-nav-bar');
        if (activeBar) updateNavIndicator(activeBar.getAttribute('data-active')); 
    }, 250);
});

window.matchMedia('(hover: none)').addEventListener('change', e => { isMobile = e.matches; });

document.addEventListener('DOMContentLoaded', () => {
    initOdometers();
    const mathSec = document.getElementById('rahimaths');
    if (mathSec) exploitsObserver.observe(mathSec);
    updateNavIndicator('rahimanniv');
    history.replaceState(null, null, ' ');
    calculateOriginalLayout();
});