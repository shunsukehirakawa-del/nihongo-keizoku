/* =========================================================
   NIHONGO KEIZOKU  app.js
   ========================================================= */

const FADE_MS = 500;
let isLoggedIn = false;   // 仮のログイン状態（後で本物に置き換える）
let articles = [];

const homeView    = document.getElementById('homeView');
const startBtn    = document.getElementById('startBtn');
const contentView = document.getElementById('contentView');
const freeGrid    = document.getElementById('freeGrid');
const premiumGrid = document.getElementById('premiumGrid');
const loginBtn    = document.getElementById('loginBtn');

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
        const msg = '<div class="placeholder">記事を読み込めませんでした。<br>Live Server で開いているか確認してください。</div>';
        freeGrid.innerHTML = msg;
        premiumGrid.innerHTML = '';
    }
}

/* JSONに書かれていない項目に、初期値を入れる */
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

/* ---------- 表示 ---------- */
function render() {
    freeGrid.innerHTML = '';
    premiumGrid.innerHTML = '';

    articles.forEach(art => {
        const isLocked = art.access === 'premium';
        const card = createCard(art, isLocked);
        (isLocked ? premiumGrid : freeGrid).appendChild(card);
    });
}

function createCard(art, isLocked) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    // 画像（なければ・読み込めなければ、背景色だけにする）
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

    // タイトルと鍵バッジ
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
    // 記事モーダルは次のステップで作ります（今は仮の表示）
    alert('「' + art.plainTitle + '」のモーダルは次のステップで作ります。');
}

/* ---------- 仮のログイン切り替え ---------- */
loginBtn.addEventListener('click', () => {
    isLoggedIn = !isLoggedIn;
    loginBtn.textContent = isLoggedIn ? 'Logout' : 'Login';
    render();
});

/* ---------- 開始 ---------- */
loadArticles();