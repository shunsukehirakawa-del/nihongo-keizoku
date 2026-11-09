let isLoggedIn = false;
let currentArt = null;
let freeArticles = [];
let premiumArticles = [];

// サイト起動時にJSONデータを読み込む
async function loadArticles() {
    try {
        const response = await fetch('data/articles.json');
        if (!response.ok) throw new Error('JSONファイルの読み込みに失敗しました');
        const data = await response.json();
        
        freeArticles = data.free || [];
        premiumArticles = (data.premium || []).map((item) => ({
            title: item.title,
            plainTitle: item.plainTitle,
            img: item.img,
            content: "This is exclusive content for members.<br>Este es contenido exclusivo para miembros.",
            plain: "会員限定の特別なコンテンツです。",
            translation: "Members Only",
            vocab: []
        }));
        
        render();
    } catch (error) {
        console.error("エラー詳細:", error);
    }
}

function startApp() {
    const homeView = document.getElementById('homeView');
    const contentView = document.getElementById('contentView');
    if (homeView && contentView) {
        homeView.style.opacity = '0';
        homeView.style.visibility = 'hidden';
        contentView.style.display = 'block';
        setTimeout(() => { contentView.style.opacity = '1'; }, 50);
    }
}

function render() {
    const freeGrid = document.getElementById('freeGrid');
    const premiumGrid = document.getElementById('premiumGrid');
    if (!freeGrid || !premiumGrid) return;
    freeGrid.innerHTML = ''; premiumGrid.innerHTML = '';
    freeArticles.forEach((art, i) => freeGrid.appendChild(createCard(art, false, i)));
    premiumArticles.forEach((art, i) => premiumGrid.appendChild(createCard(art, true, i)));
}

function createCard(art, isLocked, index) {
    const card = document.createElement('div');
    card.className = "card";
    card.innerHTML = `
        <div class="card-img-wrapper"><img src="${art.img}" alt="${art.plainTitle}"></div>
        <div style="padding:15px 20px;">
            <h3 style="margin:0; font-size: 1.2rem; line-height: 1.5; color: var(--text);">${art.title}</h3>
            ${isLocked && !isLoggedIn ? '<div style="margin-top:12px; font-size:0.75rem; font-weight:bold; color:var(--primary); background:#e0e7ff; padding:4px 8px; border-radius:8px; display:inline-block;">🔒 Members Only / Solo miembros</div>' : ''}
        </div>`;
    card.onclick = () => {
        if(isLocked && !isLoggedIn) alert("This article requires login.\nEste artículo requiere iniciar sesión.");
        else openModal(art);
    };
    return card;
}

function openModal(art) {
    currentArt = art;
    document.getElementById('modalTitle').innerHTML = art.title;
    document.getElementById('modalBody').innerHTML = art.content;
    
    document.getElementById('rubyToggle').checked = true;
    document.getElementById('modalTitle').classList.remove('hide-ruby');
    document.getElementById('modalBody').classList.remove('hide-ruby');
    
    document.getElementById('modal').style.display = 'flex';
    
    const audioEl = document.getElementById('articleAudio');
    if (art.audioUrl) {
        audioEl.src = art.audioUrl;
    } else {
         audioEl.src = "";
    }
}

function openHelp() {
    document.getElementById('helpModal').style.display = 'flex';
}

function toggleRuby(checkbox) {
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    if (checkbox.checked) {
        modalBody.classList.remove('hide-ruby');
        modalTitle.classList.remove('hide-ruby');
    } else {
        modalBody.classList.add('hide-ruby');
        modalTitle.classList.add('hide-ruby');
    }
}

function openSubWindow(type) {
    if (type === 'english') {
        document.getElementById('englishText').innerHTML = currentArt.translation;
        document.getElementById('englishWindow').style.display = 'flex';
    } else if (type === 'vocabulary') {
        document.getElementById('vocabList').innerHTML = currentArt.vocab.map(v => `<li>${v}</li>`).join('');
        document.getElementById('vocabWindow').style.display = 'flex';
    }
}

function closeSubWindow(type) {
    if (type === 'english') document.getElementById('englishWindow').style.display = 'none';
    if (type === 'vocabulary') document.getElementById('vocabWindow').style.display = 'none';
}

function closeModal(modalId) { 
    document.getElementById(modalId).style.display = 'none'; 
    if(modalId === 'modal') {
        const audioEl = document.getElementById('articleAudio');
        audioEl.pause();
        audioEl.currentTime = 0;
        speechSynthesis.cancel(); 
        closeSubWindow('english');
        closeSubWindow('vocabulary');
    }
}

document.getElementById('playBtn').onclick = () => {
    const audioEl = document.getElementById('articleAudio');
    
    if (currentArt && currentArt.audioUrl && currentArt.audioUrl !== "") {
        audioEl.playbackRate = document.getElementById('speedRange').value;
        if (audioEl.paused) {
             audioEl.play().catch(e => console.error("Error playing audio:", e));
        } else {
             audioEl.pause();
             audioEl.currentTime = 0;
             audioEl.play().catch(e => console.error("Error playing audio:", e));
        }
    } else if (currentArt) {
        speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(currentArt.plain);
        ut.rate = document.getElementById('speedRange').value;
        ut.lang = 'ja-JP';
        speechSynthesis.speak(ut);
    }
};

document.getElementById('speedRange').oninput = (e) => {
    const speed = e.target.value;
    document.getElementById('speedDisplay').textContent = speed + "x";
    
    const audioEl = document.getElementById('articleAudio');
    if(audioEl) {
         audioEl.playbackRate = speed;
    }
};

document.getElementById('loginBtn').onclick = (e) => {
    isLoggedIn = !isLoggedIn;
    e.target.textContent = isLoggedIn ? "Logout" : "Login";
    render();
};

// データの読み込みを実行
loadArticles();