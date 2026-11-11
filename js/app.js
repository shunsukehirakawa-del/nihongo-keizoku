/* =========================================================
   NIHONGO KEIZOKU  app.js
   ========================================================= */

const FADE_MS = 500;
let isLoggedIn = false;   // 仮のログイン状態（後で本物に置き換える）
let articles = [];
let currentArt = null;

const $ = id => document.getElementById(id);

const homeView    = $('homeView');
const startBtn    = $('startBtn');
const contentView = $('contentView');
const freeGrid    = $('freeGrid');
const premiumGrid = $('premiumGrid');
const loginBtn    = $('loginBtn');

/* ---------- 入口画面 → コンテンツ画面 ---------- */
function startApp() {
    startBtn.disabled = true;
    homeView.classList.add('is-leaving');
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('keizoku:start'));
    }, FADE_MS);
}
startBtn.addEventListener('click', startApp);

window.addEventListener('keizoku:start', () => {
    document.body.classList.add('is-started');
    contentView.classList.add('is-visible');
    setTimeout(() => contentView.classList.add('is-shown'), 50);
});

/* ---------- 記事データの読み込み ---------- */
async function loadArticles() {
    try {
        const res = await fetch('data/articles.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        articles = data.map(normalizeArticle);
        render();
    } catch (err) {
        console.error('articles.json の読み込みに失敗:', err);
        freeGrid.innerHTML = '<div class="placeholder">記事を読み込めませんでした。<br>Live Server で開いているか確認してください。</div>';
        premiumGrid.innerHTML = '';
    }
}

function normalizeArticle(a) {
    const isPremium = a.access === 'premium';
    return {
        id: a.id,
        access: a.access || 'free',
        title: a.title || '',
        plainTitle: a.plainTitle || '',
        img: a.img || '',
        audioUrl: a.audioUrl || '',
        content: a.content || (isPremium
            ? 'This is exclusive content for members.<br>Este es contenido exclusivo para miembros.'
            : '<ruby>準備中<rt>じゅんびちゅう</rt></ruby>です。'),
        plain: a.plain || (isPremium ? '会員限定の特別なコンテンツです。' : '準備中です。'),
        translation: a.translation || (isPremium ? 'Members Only' : 'Coming soon.'),
        vocab: a.vocab || []
    };
}

/* ---------- カード表示 ---------- */
function render() {
    freeGrid.innerHTML = '';
    premiumGrid.innerHTML = '';
    articles.forEach(art => {
        const isLocked = art.access === 'premium';
        (isLocked ? premiumGrid : freeGrid).appendChild(createCard(art, isLocked));
    });
}

function createCard(art, isLocked) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-img-wrapper';
    if (art.img) {
        const img = document.createElement('img');
        img.src = art.img;
        img.alt = art.plainTitle;
        img.loading = 'lazy';
        img.onerror = () => img.remove();
        imgWrap.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML = `<h3 class="card-title">${art.title}</h3>`;
    if (isLocked && !isLoggedIn) {
        body.insertAdjacentHTML('beforeend',
            '<div class="lock-badge">🔒 Members Only / Solo miembros</div>');
    }

    card.appendChild(imgWrap);
    card.appendChild(body);

    card.addEventListener('click', () => onCardClick(art, isLocked));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick(art, isLocked);
        }
    });
    return card;
}

function onCardClick(art, isLocked) {
    if (isLocked && !isLoggedIn) {
        alert('This article requires login.\nEste artículo requiere iniciar sesión.');
        return;
    }
    openModal(art);
}

/* ---------- タップで出るラベル ---------- */
const tip = $('tip');
let tipTimer;

function showTip(target, text) {
    tip.textContent = text;
    tip.classList.add('is-on');

    const r = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.top - tip.offsetHeight - 8;
    if (top < 8) top = r.bottom + 8;

    tip.style.left = left + 'px';
    tip.style.top  = top + 'px';

    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tip.classList.remove('is-on'), 1800);
}

// data-tip を持つボタンは、タップ（クリック）でラベルを出す
document.querySelectorAll('[data-tip]').forEach(el => {
    el.title = el.dataset.tip;   // パソコンでは、マウスを乗せても出る
    el.addEventListener('click', () => showTip(el, el.dataset.tip));
});

/* ---------- 開く・閉じる共通 ---------- */
function updateScrollLock() {
    const anyOpen = document.querySelector('.modal.is-open, .sub-window.is-open');
    document.body.classList.toggle('modal-open', !!anyOpen);
}

function openEl(id) {
    $(id).classList.add('is-open');
    updateScrollLock();
}

function closeEl(id) {
    $(id).classList.remove('is-open');
    if (id === 'modal') {
        stopAudio();
        closeEl('translateWindow');
        closeEl('vocabWindow');
    }
    updateScrollLock();
}

// 暗い背景をタップしたら閉じる
['modal', 'helpModal', 'translateWindow', 'vocabWindow'].forEach(id => {
    $(id).addEventListener('click', e => {
        if (e.target === $(id)) closeEl(id);
    });
});

// Escキーで、いちばん上のウィンドウを閉じる
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const id of ['translateWindow', 'vocabWindow', 'helpModal', 'modal']) {
        if ($(id).classList.contains('is-open')) { closeEl(id); break; }
    }
});

$('modalClose').addEventListener('click',     () => closeEl('modal'));
$('helpClose').addEventListener('click',      () => closeEl('helpModal'));
$('translateClose').addEventListener('click', () => closeEl('translateWindow'));
$('vocabClose').addEventListener('click',     () => closeEl('vocabWindow'));

/* ---------- 記事モーダル ---------- */
// 空行（<br><br>）を段落に変えて、間の広がりすぎを防ぐ
function toParagraphs(html) {
    return html
        .split(/(?:<br\s*\/?>\s*){2,}/i)
        .map(p => '<p>' + p.trim() + '</p>')
        .join('');
}

function openModal(art) {
    currentArt = art;
    $('modalTitle').innerHTML = art.title;
    $('modalBody').innerHTML = toParagraphs(art.content);

    $('rubyToggle').checked = true;
    $('modalTitle').classList.remove('hide-ruby');
    $('modalBody').classList.remove('hide-ruby');

    stopAudio();
    $('articleAudio').src = art.audioUrl || '';

    $('modal').querySelector('.modal-content').scrollTop = 0;
    openEl('modal');
}

/* ふりがな ON/OFF */
$('rubyToggle').addEventListener('change', e => {
    const on = e.target.checked;
    $('modalBody').classList.toggle('hide-ruby', !on);
    $('modalTitle').classList.toggle('hide-ruby', !on);
    showTip($('rubyLabel'), on ? 'Furigana ON' : 'Furigana OFF');
});

/* 翻訳・語彙 */
$('translateBtn').addEventListener('click', () => {
    $('translateText').innerHTML = currentArt.translation;
    openEl('translateWindow');
});
$('vocabBtn').addEventListener('click', () => {
    $('vocabList').innerHTML = currentArt.vocab.length
        ? currentArt.vocab.map(v => `<li>${v}</li>`).join('')
        : '<li>—</li>';
    openEl('vocabWindow');
});

/* ---------- 再生 / 一時停止 ---------- */
const audioEl  = $('articleAudio');
const playBtn  = $('playBtn');
const playIcon = $('playIcon');
let currentUtterance = null;   // 音声ファイルがないとき用の読み上げ

// アイコンとラベルを、再生中 / 停止中に合わせて切り替える
function setPlaying(on) {
    playIcon.className = 'ti ' + (on ? 'ti-player-pause' : 'ti-player-play');
    const label = on ? 'Pause / Pausa' : 'Play / Reproducir';
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    playBtn.dataset.tip = label;
    playBtn.title = label;
}

// 音を止めて、最初に戻す
function stopAudio() {
    audioEl.pause();
    audioEl.currentTime = 0;
    currentUtterance = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setPlaying(false);
}

// 音声ファイルの状態に合わせてアイコンを変える
audioEl.addEventListener('play',  () => setPlaying(true));
audioEl.addEventListener('pause', () => setPlaying(false));
audioEl.addEventListener('ended', () => setPlaying(false));

playBtn.addEventListener('click', () => {
    const rate = parseFloat($('speedRange').value);

    // ① 音声ファイルがあるとき
    if (currentArt.audioUrl) {
        if (audioEl.paused) {
            audioEl.playbackRate = rate;
            audioEl.play().catch(err => {
                console.error('音声を再生できません:', err);
                setPlaying(false);
            });
        } else {
            audioEl.pause();
        }
        return;
    }

    // ② 音声ファイルがないとき：ブラウザの読み上げで代用
    if (!('speechSynthesis' in window)) return;

    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        setPlaying(false);
    } else if (speechSynthesis.paused) {
        speechSynthesis.resume();
        setPlaying(true);
    } else {
        const ut = new SpeechSynthesisUtterance(currentArt.plain);
        ut.rate = rate;
        ut.lang = 'ja-JP';
        ut.onend = ut.onerror = () => {
            if (currentUtterance === ut) setPlaying(false);
        };
        currentUtterance = ut;
        speechSynthesis.speak(ut);
        setPlaying(true);
    }
});

/* スピード */
$('speedRange').addEventListener('input', e => {
    const speed = e.target.value;
    $('speedDisplay').textContent = parseFloat(speed).toFixed(1) + 'x';
    audioEl.playbackRate = speed;
});

/* ---------- How to use ---------- */
function setHelpTab(lang) {
    const isEn = lang === 'en';
    $('helpEn').hidden = !isEn;
    $('helpEs').hidden = isEn;
    $('tabEn').setAttribute('aria-selected', String(isEn));
    $('tabEs').setAttribute('aria-selected', String(!isEn));
}
$('tabEn').addEventListener('click', () => setHelpTab('en'));
$('tabEs').addEventListener('click', () => setHelpTab('es'));

// ブラウザの言語がスペイン語なら、最初から Español を表示
setHelpTab((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');

$('helpBtn').addEventListener('click', () => openEl('helpModal'));

/* ---------- 仮のログイン切り替え ---------- */
loginBtn.addEventListener('click', () => {
    isLoggedIn = !isLoggedIn;
    loginBtn.textContent = isLoggedIn ? 'Logout' : 'Login';
    render();
});

/* ---------- 開始 ---------- */
loadArticles();