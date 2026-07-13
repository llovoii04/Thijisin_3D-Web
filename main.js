import { zodiacCards, heritageData } from './data.js?v=65';
import { storyData } from './storyData.js?v=65';

// 3D 모델 에러 글로벌 처리 (콘솔 빨간줄 방지)
document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'MODEL-VIEWER') {
        console.warn(`[Model Viewer] 모델 로딩 실패: ${e.target.src}. 대체 이미지를 띄우거나 관리자에게 문의하세요.`);
        e.preventDefault(); // 기본 에러 출력 방지 시도
    }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    // 화면 전환 관련 DOM
    const viewHome = document.getElementById('view-home');
    const viewList = document.getElementById('view-list');
    const viewDetail = document.getElementById('view-detail');
    const viewStorybookFlip = document.getElementById('view-storybook-flip');
    const viewNotice = document.getElementById('view-notice');
    
    const btnNavHome = document.getElementById('nav-home');
    const btnNavList = document.getElementById('nav-list');
    const navStorybook = document.getElementById('nav-storybook');
    
    // 데이터 렌더링 컨테이너
    const homeCardsContainer = document.getElementById('home-tarot-cards');
    const coverflowTrack = document.getElementById('coverflow-track');
    const heritageGrid = document.getElementById('heritage-grid');
    const listTotalCount = document.getElementById('list-total-count');
    
    // 내비게이션 로직
    function switchView(viewId) {
        [viewHome, viewList, viewDetail, viewStorybookFlip, viewNotice].forEach(v => {
            if (v) v.classList.remove('active');
        });
        const targetView = document.getElementById(viewId);
        if(targetView) targetView.classList.add('active');
        window.scrollTo(0, 0);
        
        // 메뉴 활성 상태 관리
        document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));
        if (viewId === 'view-home') btnNavHome?.classList.add('active');
        if (viewId === 'view-list') btnNavList?.classList.add('active');
        if (viewId === 'view-storybook-flip') navStorybook?.classList.add('active');
    }

    btnNavHome.addEventListener('click', () => switchView('view-home'));
    btnNavList.addEventListener('click', () => switchView('view-list'));
    
    if (navStorybook) {
        navStorybook.addEventListener('click', () => {
            switchView('view-storybook-flip');
            initFlipbook();
        });
    }

    // 홈 화면 공지사항 클릭 시
    document.getElementById('home-notice-1')?.addEventListener('click', () => { switchView('view-notice'); });
    document.getElementById('home-notice-2')?.addEventListener('click', () => { switchView('view-notice'); });

    // 공지사항 닫기 및 바로가기
    document.getElementById('btn-close-notice')?.addEventListener('click', () => { switchView('view-home'); });
    document.getElementById('btn-go-exhibition-from-notice')?.addEventListener('click', () => { switchView('view-list'); });

    // 1. 홈 화면 타로카드 렌더링
    function renderHomeCards() {
        homeCardsContainer.innerHTML = '';
        zodiacCards.forEach(card => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '10px';
            wrapper.style.cursor = 'pointer';

            const div = document.createElement('div');
            div.className = 'tarot-card';
            div.style.backgroundColor = card.bgColor;
            div.innerHTML = `
                <div class="tarot-badge" style="position: absolute; top: 10px; left: 10px;">${card.name.charAt(0)}</div>
                <img src="${card.image}" alt="${card.character}" style="width: 100%; height: 100%; object-fit: cover;">
            `;
            div.style.position = 'relative';
            
            const nameBadge = document.createElement('div');
            nameBadge.style.background = '#FFF';
            nameBadge.style.border = '2px solid #8B5A2B';
            nameBadge.style.borderRadius = '20px';
            nameBadge.style.padding = '5px 20px';
            nameBadge.style.fontWeight = 'bold';
            nameBadge.style.fontSize = '1.2rem';
            nameBadge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            nameBadge.innerText = card.character;

            wrapper.appendChild(div);
            wrapper.appendChild(nameBadge);

            wrapper.addEventListener('click', () => {
                switchView('view-list');
                const idx = zodiacCards.findIndex(c => c.id === card.id);
                updateCoverflow(idx);
            });
            homeCardsContainer.appendChild(wrapper);
        });
    }

    // 2. 목록 화면 커버플로우 렌더링
    let currentCoverflowIndex = 0;
    function renderCoverflow() {
        coverflowTrack.innerHTML = '';
        zodiacCards.forEach((card, idx) => {
            const div = document.createElement('div');
            div.className = 'cf-card';
            div.innerHTML = `
                <img src="${card.image}" alt="${card.character}" style="width: 100%; height: 100%; object-fit: contain;">
            `;
            
            div.addEventListener('click', () => {
                updateCoverflow(idx);
            });
            
            coverflowTrack.appendChild(div);
        });
        updateCoverflow(currentCoverflowIndex);
    }

    function updateCoverflow(activeIndex) {
        currentCoverflowIndex = activeIndex;
        const cards = Array.from(coverflowTrack.children);
        const total = cards.length;
        
        cards.forEach((card, idx) => {
            // 위치 계산 (단순하게 좌우 2개씩 보여주기)
            let diff = idx - activeIndex;
            if (diff === 0) {
                card.setAttribute('data-pos', 'center');
            } else if (diff === -1) {
                card.setAttribute('data-pos', 'left1');
            } else if (diff === -2) {
                card.setAttribute('data-pos', 'left2');
            } else if (diff === 1) {
                card.setAttribute('data-pos', 'right1');
            } else if (diff === 2) {
                card.setAttribute('data-pos', 'right2');
            } else {
                card.setAttribute('data-pos', 'hidden');
            }
        });
        
        // 커버플로우 변경 시 하단 리스트도 해당 동물의 유물만 렌더링하도록 연동
        renderHeritageList(zodiacCards[activeIndex].character);
    }

    // 3. 목록 화면 하단 문화유산 렌더링
    let currentFilteredList = [];
    
    function renderHeritageList(filterCategory = '') {
        heritageGrid.innerHTML = '';
        
        let filteredData = heritageData;
        if (filterCategory) {
            filteredData = heritageData.filter(item => item.category === filterCategory);
        }
        currentFilteredList = filteredData;
        
        listTotalCount.textContent = filteredData.length;
        
        filteredData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'h-card';
            
            let mediaHtml = '';
            if (item.modelPath) {
                // 목록에서는 회전이나 조작을 못하도록 옵션 제거 및 pointer-events 제어
                mediaHtml = `<model-viewer src="${item.modelPath}" style="width:100%; height:100%; min-height:350px; pointer-events:none;"></model-viewer>`;
            } else if (item.imagePath) {
                mediaHtml = `<img src="${item.imagePath}" style="width:100%; height:100%; object-fit:contain;">`;
            } else {
                mediaHtml = `<div style="color: #999;">데이터 준비중</div>`;
            }

            div.innerHTML = `
                <div style="background: ${item.tagColor};" class="h-card-tag">${item.tag}</div>
                <div class="h-card-img-area">
                    ${mediaHtml}
                </div>
                <div class="h-card-info">
                    <div class="h-card-title" title="${item.title}">${item.title}</div>
                    <div class="h-card-specs">
                        <div><span class="spec-label">구축유형</span>${item.buildType}</div>
                        <div><span class="spec-label">파일형태</span>${item.fileType}</div>
                        <div><span class="spec-label">데이터용량</span>${item.dataSize}</div>
                        <div><span class="spec-label">생산년도</span>${item.year}</div>
                    </div>
                    <div style="text-align: right; margin-top: 10px; font-size: 0.9rem; color: #4A7A57; cursor: pointer;" class="btn-more">더보기 &gt;</div>
                </div>
            `;
            
            // 더보기 클릭 시 상세 페이지로 이동
            div.querySelector('.btn-more').addEventListener('click', () => openDetail(item));
            
            // 제목 클릭 시 상세 페이지로 이동 (마우스 오버 시 포인터 커서 적용)
            const titleEl = div.querySelector('.h-card-title');
            titleEl.style.cursor = 'pointer';
            titleEl.addEventListener('click', () => openDetail(item));
            
            heritageGrid.appendChild(div);
        });
    }

    // 4. 상세 페이지 열기 (와이드 2단 레이아웃 버전)
    let currentDetailIndex = -1;
    
    function openDetail(item) {
        currentDetailIndex = currentFilteredList.findIndex(i => i.id === item.id);
        if (currentDetailIndex === -1) {
            currentFilteredList = heritageData; // 필터 안 된 경우 폴백
            currentDetailIndex = currentFilteredList.findIndex(i => i.id === item.id);
        }

        document.getElementById('detail-title-main').textContent = item.title;
        document.getElementById('detail-title-side').textContent = item.title;
        
        // 뱃지에는 '카테고리(예: 쥐)' 할당
        document.getElementById('detail-tag-badge').textContent = item.category;
        document.getElementById('detail-tag-side').textContent = item.category;

        // 상징 단어 할당
        const zodiacMatch = zodiacCards.find(z => z.character === item.category);
        document.getElementById('detail-symbol-main').textContent = zodiacMatch ? zodiacMatch.symbol : '';

        const yearText = item.year ? item.year : '시대 미상';
        
        document.getElementById('detail-spec-location').textContent = item.tag;
        document.getElementById('detail-spec-year').textContent = yearText;
        document.getElementById('detail-spec-size').textContent = item.itemSize || '상세 정보 참조';
        let sourceText = item.itemSource || '디지털 헤리티지 가상전시';
        sourceText = sourceText.split('>')[0].split('-')[0].trim();
        document.getElementById('detail-spec-source').textContent = sourceText;
        
        // 뷰어
        const heroArea = document.getElementById('detail-hero-area');
        if (item.modelPath) {
            heroArea.innerHTML = `<model-viewer src="${item.modelPath}" auto-rotate camera-controls style="width:100%; height:100%; min-height:350px;"></model-viewer>`;
        } else if (item.imagePath) {
            heroArea.innerHTML = `<img src="${item.imagePath}" style="width:100%; height:100%; object-fit:contain;">`;
        } else {
            heroArea.innerHTML = `<p style="font-size: 1.5rem; color: #999;">데이터 준비 중!</p>`;
        }

        // 설명 파싱 로직
        let descText = item.description || '';
        let descParts = descText.split('<br>');
        descParts = descParts.map(p => p.replace(/^- /, '').trim()).filter(p => p.length > 0);
        
        if (descParts.length > 0) {
            let listHtml = '';
            for (let i = 0; i < descParts.length; i++) {
                listHtml += `<li>${descParts[i]}</li>`;
            }
            document.getElementById('detail-desc-list').innerHTML = listHtml;
        } else {
            document.getElementById('detail-desc-list').innerHTML = "<li>내용 없음</li>";
        }
        
        switchView('view-detail');
    }

    // 하단 네비게이션 버튼 (이전/다음)
    document.getElementById('btn-nav-prev').addEventListener('click', () => {
        if (currentDetailIndex > 0) {
            openDetail(currentFilteredList[currentDetailIndex - 1]);
        } else {
            alert('현재 목록의 첫 번째 유물입니다.');
        }
    });

    document.getElementById('btn-nav-next').addEventListener('click', () => {
        if (currentDetailIndex < currentFilteredList.length - 1) {
            openDetail(currentFilteredList[currentDetailIndex + 1]);
        } else {
            alert('현재 목록의 마지막 유물입니다.');
        }
    });

    document.getElementById('btn-bottom-list').addEventListener('click', () => switchView('view-list'));

    // 초기화
    renderHomeCards();
    renderCoverflow();

    // ==========================================
    // 5. 스토리북 아카이브 플립북 로직
    // ==========================================
    let pageFlip = null;

    document.getElementById("btn-go-storybook").addEventListener("click", () => {
        switchView("view-storybook-flip");
        initFlipbook();
    });

    document.getElementById("btn-flip-close").addEventListener("click", () => {
        switchView("view-home");
    });

    function initFlipbook() {
        const flipbookEl = document.getElementById("flipbook");
        if (pageFlip !== null) return; // 이미 초기화된 경우 스킵
        
        // 페이지 돔 생성
        flipbookEl.innerHTML = "";

        // 앞표지 (Page 1: 표지 앞면, Page 2: 표지 뒷면)
        flipbookEl.innerHTML += `
            <div class="page hard">
                <div class="page-content" style="justify-content: center; background-image: url('images/bg_landscape.jpg'); background-size: cover;">
                    <div style="background: rgba(0,0,0,0.6); padding: 40px; border-radius: 15px; border: 2px solid #EAE0C8;">
                        <h1 class="cover-title" style="font-size: 3.5rem;">십이지신<br>비밀 이야기</h1>
                        <p class="cover-subtitle" style="text-align:center; font-size: 1.5rem; margin-top: 20px;">동물 수호신들의 전설을 펼쳐보세요</p>
                    </div>
                </div>
            </div>
            <div class="page hard">
                <div class="page-content">
                    <!-- 표지 안쪽 (비어있음) -->
                </div>
            </div>
        `;

        // 속지 첫 장 (Page 3: 우측 페이지)
        // 이 페이지를 추가해야 다음 장(Page 4)부터 좌측으로 시작합니다.
        flipbookEl.innerHTML += `
            <div class="page">
                <div class="page-content" style="text-align:center; justify-content:center;">
                    <h2 style="font-size: 3rem; color: #4A5B4D;">십이지신 동화책</h2>
                    <p style="font-size: 1.5rem; color: #666; margin-top: 20px;">책장을 넘겨서 이야기를 시작해 보세요 ▶</p>
                </div>
            </div>
        `;

        if (typeof storyData !== 'undefined' && storyData.length > 0) {
            storyData.forEach((story) => {
                // 좌측 페이지 (일러스트) - 짝수 쪽
                flipbookEl.innerHTML += `
                    <div class="page --left">
                        <div class="page-content" style="padding: 0; background-color: #F8F5E9;">
                            <img src="${story.image}" alt="${story.name}" class="page-img" style="border-radius: 0; box-shadow: none;">
                        </div>
                    </div>
                `;
                // 우측 페이지 (스토리) - 홀수 쪽
                flipbookEl.innerHTML += `
                    <div class="page --right">
                        <div class="page-content">
                            <h2 style="font-size: 2.8rem; margin-bottom: 5px;">${story.name}</h2>
                            <h4 style="font-size: 1.4rem; color: #777; margin-bottom: 25px;">${story.tagline}</h4>
                            <div class="book-divider" style="margin: 0 auto 30px; width: 60px; height: 3px; background: #C5B396;"></div>
                            <p style="font-size: 1.3rem; line-height: 2; word-break: keep-all; text-align: justify; flex: 1;">${story.story}</p>
                            <p class="book-source" style="margin-top: 30px; width: 100%; font-size: 1.1rem; color: #999;">${story.source}</p>
                        </div>
                    </div>
                `;
            });
        }

        // 뒷표지 안쪽과 뒷표지
        flipbookEl.innerHTML += `
            <div class="page">
                <div class="page-content" style="text-align:center; justify-content:center;">
                    <h2 style="font-size: 2rem; color: #4A5B4D;">마지막 페이지입니다.</h2>
                </div>
            </div>
            <div class="page hard">
                <div class="page-content">
                </div>
            </div>
            <div class="page hard">
                <div class="page-content" style="background-image: url('images/bg_landscape.jpg'); background-size: cover;">
                    <div style="background: rgba(0,0,0,0.6); padding: 40px; border-radius: 15px;">
                        <h1 class="cover-title">끝</h1>
                    </div>
                </div>
            </div>
        `;

        // St.PageFlip 초기화
        pageFlip = new St.PageFlip(flipbookEl, {
            width: 700,        // 기존 500에서 700으로 확대 (양면 1400)
            height: 850,       // 기존 600에서 850으로 확대
            size: "stretch",
            minWidth: 280,     // 모바일 화면용 축소 (기존 400)
            maxWidth: 1200,
            minHeight: 350,    // 모바일 화면용 축소 (기존 500)
            maxHeight: 1600,
            maxShadowOpacity: 0.3, // 그림자 조금 더 부드럽게
            showCover: true,
            mobileScrollSupport: false,
            usePortrait: true  // 모바일 기기(작은 화면)에서는 한 페이지(세로)로 표시
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    }

});
