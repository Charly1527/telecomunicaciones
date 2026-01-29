const DEFAULT_LANG = localStorage.getItem('site_lang') || 'es';
const DEFAULT_THEME = localStorage.getItem('site_theme') || 'light';

// Locale override map is empty by default. Use only for temporary fallbacks.
const LOCALE_OVERRIDES = {};

document.documentElement.setAttribute('data-theme', DEFAULT_THEME === 'dark' ? 'dark' : '');

let CURRENT_LOCALE = null;
let CURRENT_CATEGORY_INDEX = 0;
let CURRENT_UNIT_INDEX = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const langSelect = document.getElementById('langSelect');
    const themeToggle = document.getElementById('themeToggle');
    const categoryList = document.getElementById('categoryList');

    langSelect.value = DEFAULT_LANG;
    themeToggle.checked = DEFAULT_THEME === 'dark';

    langSelect.addEventListener('change', () => {
        const l = langSelect.value;
        localStorage.setItem('site_lang', l);
        initLocale(l);
    });

    themeToggle.addEventListener('change', () => {
        const dark = themeToggle.checked;
        if (dark) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('site_theme', dark ? 'dark' : 'light');
    });

    document.getElementById('search').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        filterUnits(q);
    });

    categoryList.addEventListener('change', () => {
        CURRENT_CATEGORY_INDEX = Number(categoryList.value) || 0;
        renderUnitsForCurrentCategory();
    });

    document.getElementById('showExercises').addEventListener('click', () => {
        const unit = getCurrentUnit();
        toggleExercises(unit);
    });

    // generate printable flashcards (opens printable view instead of raw JSON)
    document.getElementById('genFlashcards').addEventListener('click', () => {
        const unit = getCurrentUnit();
        generateFlashcards(unit);
    });

    // download infographic (prints a nicely formatted unit summary/infographic)
    const downloadPdf = document.getElementById('downloadPdf');
    if (downloadPdf) {
        downloadPdf.addEventListener('click', (e) => {
            e.preventDefault();
            const unit = getCurrentUnit();
            generateInfographic(unit);
        });
    }

    // attempt to init
    await initLocale(DEFAULT_LANG);
});

async function initLocale(lang) {
    try {
        // first try to fetch JSON normally (supports overrides)
        const fileName = LOCALE_OVERRIDES[lang] ? LOCALE_OVERRIDES[lang] : `${lang}.json`;
        const res = await fetch(`locales/${fileName}`);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        CURRENT_LOCALE = json;
        postLoadInit();
    } catch (err) {
        console.warn('fetch locales failed, attempting fallback script. Error:', err.message);
        // fallback: try to use a JS fallback that defines window.LOCALES
        try {
            if (!window.LOCALES) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'locales/locales-fallback.js';
                    s.onload = resolve; s.onerror = () => reject(new Error('fallback script failed'));
                    document.head.appendChild(s);
                });
            }
            if (window.LOCALES && window.LOCALES[lang]) {
                CURRENT_LOCALE = window.LOCALES[lang];
                postLoadInit();
            } else {
                throw new Error('No fallback for language');
            }
        } catch (err2) {
            console.error('Fallback load failed', err2);
            // show a user-friendly message
            document.getElementById('topicArea').innerHTML = '<p class="muted">No se pudo cargar el contenido. Si abriste este archivo con file://, intenta servir el sitio con un servidor HTTP (ver README) o agrega locales/locales-fallback.js</p>';
        }
    }
}

function postLoadInit() {
    // normalize older locale shape: if `categories` is missing but `units` exists,
    // wrap units into a default category so older files still work.
    if (!CURRENT_LOCALE.categories && Array.isArray(CURRENT_LOCALE.units)) {
        CURRENT_LOCALE.categories = [{ id: 'all', title: 'All', units: CURRENT_LOCALE.units }];
    }
    // set page title
    renderIntro(CURRENT_LOCALE.meta || {});
    applyUIStrings(CURRENT_LOCALE.ui || {});
    populateCategoryList(CURRENT_LOCALE.categories || []);
    renderUnitsForCurrentCategory();
}

function applyUIStrings(ui) {
    // ui: { searchPlaceholder, downloadPdf, showExercises, genFlashcards, resourcesTitle, videoTitle }
    try {
        const downloadPdf = document.getElementById('downloadPdf');
        const showExercises = document.getElementById('showExercises');
        const genFlashcards = document.getElementById('genFlashcards');
        const search = document.getElementById('search');
        const resourcesTitle = document.getElementById('resourcesTitle');
        const videoTitle = document.getElementById('videoTitle');

        if (downloadPdf && ui.downloadPdf) downloadPdf.textContent = ui.downloadPdf;
        if (showExercises && ui.showExercises) showExercises.textContent = ui.showExercises;
        if (genFlashcards && ui.genFlashcards) genFlashcards.textContent = ui.genFlashcards;
        if (search && ui.searchPlaceholder) search.placeholder = ui.searchPlaceholder;
        if (resourcesTitle && ui.resourcesTitle) resourcesTitle.textContent = ui.resourcesTitle;
        if (videoTitle && ui.videoTitle) videoTitle.textContent = ui.videoTitle;
    } catch (e) { console.warn('applyUIStrings failed', e); }
}

function renderIntro(meta) {
    document.getElementById('pageTitle').textContent = meta && meta.title ? meta.title : 'Temario';
}

function populateCategoryList(categories) {
    const sel = document.getElementById('categoryList');
    sel.innerHTML = '';
    // add an "All" option to show every unit grouped by category
    const allOpt = document.createElement('option');
    allOpt.value = -1; allOpt.textContent = 'Todos';
    sel.appendChild(allOpt);
    categories.forEach((c, i) => {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = c.title;
        sel.appendChild(opt);
    });
    sel.value = CURRENT_CATEGORY_INDEX;
}

function renderUnitsForCurrentCategory() {
    const categories = CURRENT_LOCALE.categories || [];
    const ul = document.getElementById('units');
    ul.innerHTML = '';
    // if CURRENT_CATEGORY_INDEX === -1 show all units grouped by category
    if (CURRENT_CATEGORY_INDEX === -1) {
        categories.forEach((c, cIdx) => {
            const header = document.createElement('li');
            header.className = 'category-header';
            header.textContent = c.title;
            ul.appendChild(header);
            (c.units || []).forEach((u, uIdx) => {
                const li = document.createElement('li');
                li.tabIndex = 0;
                li.dataset.cat = cIdx; li.dataset.idx = uIdx;
                li.innerHTML = `<strong>${u.title}</strong><div class=\"muted\">${u.summary || ''}</div>`;
                li.addEventListener('click', () => selectUnitBy(cIdx, uIdx));
                li.addEventListener('keypress', (e) => { if (e.key === 'Enter') selectUnitBy(cIdx, uIdx) });
                ul.appendChild(li);
            });
        });
        // select first available unit if none selected
        outer: for (let ci = 0; ci < categories.length; ci++) {
            const units = categories[ci].units || [];
            if (units.length) { selectUnitBy(ci, 0); break outer; }
        }
        return;
    }

    const category = categories[CURRENT_CATEGORY_INDEX] || { units: [] };
    const ul2 = document.getElementById('units');
    category.units.forEach((u, idx) => {
        const li = document.createElement('li');
        li.tabIndex = 0;
        li.dataset.cat = CURRENT_CATEGORY_INDEX; li.dataset.idx = idx;
        li.innerHTML = `<strong>${u.title}</strong><div class=\"muted\">${u.summary || ''}</div>`;
        li.addEventListener('click', () => selectUnit(idx));
        li.addEventListener('keypress', (e) => { if (e.key === 'Enter') selectUnit(idx) });
        ul2.appendChild(li);
    });
    // select first
    if (category.units.length) selectUnit(0);
}

function selectUnit(index) {
    // select within current category
    selectUnitBy(CURRENT_CATEGORY_INDEX, index);
}

function getCurrentUnit() {
    const categories = CURRENT_LOCALE.categories || [];
    const cat = categories[CURRENT_CATEGORY_INDEX] || { units: [] };
    return cat.units[CURRENT_UNIT_INDEX] || { title: '', topics: [] };
}

function selectUnitBy(catIndex, unitIndex) {
    CURRENT_CATEGORY_INDEX = Number(catIndex);
    CURRENT_UNIT_INDEX = Number(unitIndex);
    const lis = Array.from(document.querySelectorAll('#units li'));
    lis.forEach(n => {
        const c = n.dataset && n.dataset.cat !== undefined ? Number(n.dataset.cat) : null;
        const idx = n.dataset && n.dataset.idx !== undefined ? Number(n.dataset.idx) : null;
        if (c === CURRENT_CATEGORY_INDEX && idx === CURRENT_UNIT_INDEX) n.classList.add('active');
        else n.classList.remove('active');
    });
    const unit = getCurrentUnit();
    renderUnitContent(unit);
}

function renderUnitContent(unit) {
    const area = document.getElementById('topicArea');
    area.innerHTML = '';
    const h = document.createElement('h2');
    h.textContent = unit.title;
    area.appendChild(h);

    // PDF link
    const pdfLink = document.getElementById('downloadPdf');
    if (unit.pdf) {
        pdfLink.href = unit.pdf; pdfLink.hidden = false;
    } else {
        pdfLink.href = '#'; pdfLink.hidden = true;
    }

    // topics
    unit.topics.forEach(t => {
        const sec = document.createElement('section');
        const th = document.createElement('h3');
        th.textContent = t.title;
        const div = document.createElement('div');
        div.className = 'topic-content';
        div.innerHTML = t.content || '';

        sec.appendChild(th);
        sec.appendChild(div);

        // media: image or video
        if (t.image) {
            const img = document.createElement('img');
            img.src = t.image; img.alt = t.title;
            sec.appendChild(img);
        }

        if (t.video) {
            const vw = document.createElement('div'); vw.className = 'video-wrap';
            // detect youtube
            const url = t.video;
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                // convert to embed if possible
                const embed = getYouTubeEmbed(url);
                const iframe = document.createElement('iframe');
                iframe.width = 560; iframe.height = 315;
                iframe.src = embed;
                iframe.setAttribute('frameborder', '0'); iframe.setAttribute('allowfullscreen', '');
                vw.appendChild(iframe);
            } else {
                // assume local video
                const vid = document.createElement('video');
                vid.controls = true; vid.src = url; vid.style.maxWidth = '100%';
                vw.appendChild(vid);
            }
            sec.appendChild(vw);
        }

        area.appendChild(sec);
    });

    // hide exercises area until requested
    document.getElementById('exercisesArea').hidden = true;
}

function getYouTubeEmbed(url) {
    try {
        // handle several youtube url formats
        let id = null;
        if (url.includes('youtube.com')) {
            const m = url.match(/[?&]v=([\w-]+)/);
            if (m) id = m[1];
            else {
                const p = url.match(/youtube.com\/embed\/([\w-]+)/);
                if (p) id = p[1];
            }
        } else if (url.includes('youtu.be')) {
            const p = url.match(/youtu\.be\/([\w-]+)/);
            if (p) id = p[1];
        }
        if (id) return `https://www.youtube.com/embed/${id}`;
    } catch (e) { }
    // fallback to original
    return url;
}

function filterUnits(query) {
    if (!CURRENT_LOCALE) return;
    const category = (CURRENT_LOCALE.categories || [])[CURRENT_CATEGORY_INDEX] || { units: [] };
    const ul = document.getElementById('units');
    ul.innerHTML = '';
    category.units.forEach((u, idx) => {
        const text = (u.title + ' ' + (u.summary || '') + ' ' + u.topics.map(t => t.title + ' ' + (t.content || '')).join(' ')).toLowerCase();
        if (!query || text.includes(query)) {
            const li = document.createElement('li');
            li.tabIndex = 0;
            li.innerHTML = `<strong>${u.title}</strong><div class=\"muted\">${u.summary || ''}</div>`;
            li.addEventListener('click', () => selectUnit(idx));
            ul.appendChild(li);
        }
    });
}

function toggleExercises(unit) {
    const area = document.getElementById('exercisesArea');
    area.innerHTML = '';
    if (!unit.exercises || !unit.exercises.length) {
        area.innerHTML = '<p class="muted">No hay ejercicios definidos para esta unidad.</p>';
        area.hidden = false;
        return;
    }

    unit.exercises.forEach((ex, idx) => {
        const q = document.createElement('div'); q.className = 'exercise';
        const qh = document.createElement('strong'); qh.textContent = `Ejercicio ${idx + 1}`;
        const qp = document.createElement('p'); qp.textContent = ex.q;
        q.appendChild(qh); q.appendChild(qp);

        if (!ex.type || ex.type === 'text') {
            const show = document.createElement('button'); show.textContent = 'Mostrar respuesta';
            const ans = document.createElement('div'); ans.className = 'answer'; ans.hidden = true; ans.textContent = ex.a || '—';
            show.addEventListener('click', () => ans.hidden = !ans.hidden);
            q.appendChild(show); q.appendChild(ans);
        } else if (ex.type === 'mcq') {
            const form = document.createElement('form'); form.className = 'mcq';
            ex.options.forEach((opt, i) => {
                const id = `ex${idx}_opt${i}`;
                const label = document.createElement('label');
                label.htmlFor = id;
                const input = document.createElement('input');
                input.type = 'radio'; input.name = `ex${idx}`; input.id = id; input.value = i;
                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + opt));
                form.appendChild(label);
                form.appendChild(document.createElement('br'));
            });
            const check = document.createElement('button'); check.type = 'button'; check.textContent = 'Comprobar';
            const result = document.createElement('div'); result.className = 'mcq-result';
            check.addEventListener('click', () => {
                const sel = form.querySelector('input[type=radio]:checked');
                if (!sel) { result.textContent = 'Selecciona una opción.'; return; }
                const chosen = Number(sel.value);
                if (chosen === ex.answerIndex) {
                    result.textContent = 'Correcto ✅'; result.style.color = 'green';
                } else {
                    result.textContent = 'Incorrecto ❌ — ' + (ex.explain || ('Respuesta: ' + (ex.options[ex.answerIndex] || '—')));
                    result.style.color = 'crimson';
                }
            });
            q.appendChild(form); q.appendChild(check); q.appendChild(result);
        }

        area.appendChild(q);
    });
    area.hidden = false;
}

function generateFlashcards(unit) {
    // open a printable HTML with flashcards (front/back) for the unit
    const html = [];
    html.push('<!doctype html><html><head><meta charset="utf-8"><title>Flashcards - ' + (unit.title || '') + '</title>');
    html.push('<style>body{font-family:system-ui,Arial;margin:20px}');
    html.push('.cards{display:flex;flex-wrap:wrap;gap:12px}');
    html.push('.card{width:280px;height:180px;border:1px solid #333;border-radius:8px;padding:12px;box-shadow:0 2px 6px rgba(0,0,0,.1);background:#fff}');
    html.push('.front{font-weight:700;margin-bottom:8px}');
    html.push('.back{color:#222}</style></head><body>');
    html.push('<h1>Flashcards - ' + (unit.title || '') + '</h1>');
    html.push('<div class="cards">');
    (unit.topics || []).forEach(t => {
        html.push('<div class="card">');
        html.push('<div class="front">' + escapeHtml(t.title || '') + '</div>');
        html.push('<div class="back">' + (t.content || '') + '</div>');
        html.push('</div>');
    });
    html.push('</div>');
    html.push('<script>setTimeout(()=>{window.print()},300);</script>');
    html.push('</body></html>');

    const w = window.open('', '_blank');
    if (!w) {
        alert('No se pudo abrir la ventana de impresión. Permite popups o descarga manual.');
        return;
    }
    w.document.write(html.join('\n'));
    w.document.close();
    return;
}

function generateInfographic(unit) {
    // build a simple printable infographic HTML for the unit
    const parts = [];
    parts.push('<!doctype html><html><head><meta charset="utf-8"><title>Infografía - ' + (unit.title || '') + '</title>');
    parts.push('<style>body{font-family:system-ui,Arial;color:#111;margin:24px}');
    parts.push('.inf{max-width:900px;margin:0 auto;border:1px solid #ddd;padding:18px;border-radius:10px}');
    parts.push('.header{display:flex;align-items:center;gap:12px}');
    parts.push('.title{font-size:22px;font-weight:700}');
    parts.push('.summary{color:#444;margin:8px 0}');
    parts.push('.topics{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}');
    parts.push('.topic{border-radius:8px;padding:10px;border:1px solid #eee;background:#fafafa}');
    parts.push('</style></head><body>');
    parts.push('<div class="inf">');
    parts.push('<div class="header"><div class="title">' + escapeHtml(unit.title || '') + '</div></div>');
    if (unit.summary) parts.push('<div class="summary">' + escapeHtml(unit.summary) + '</div>');
    parts.push('<div class="topics">');
    (unit.topics || []).forEach(t => {
        parts.push('<div class="topic"><h3>' + escapeHtml(t.title || '') + '</h3><div>' + (t.content || '') + '</div></div>');
    });
    parts.push('</div></div>');
    parts.push('<script>setTimeout(()=>{window.print()},300);</script>');
    parts.push('</body></html>');

    const w = window.open('', '_blank');
    if (!w) { alert('No se pudo abrir la ventana de impresión. Permite popups o descarga manual.'); return; }
    w.document.write(parts.join('\n'));
    w.document.close();
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

