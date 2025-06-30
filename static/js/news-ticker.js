// Static News Data for GitHub Pages
// This file contains sample news data when API is not available

const STATIC_NEWS_TICKER_DATA = {
    success: true,
    count: 8,
    ticker_news: [
        {
            title: "İzmir'de orman yangını kontrol altına alındı",
            source: "Anadolu Ajansı",
            link: "#"
        },
        {
            title: "Antalya'da yangın söndürme çalışmaları devam ediyor",
            source: "TRT Haber",
            link: "#"
        },
        {
            title: "Manisa'da çıkan yangın itfaiye ekiplerince söndürüldü",
            source: "Sözcü",
            link: "#"
        },
        {
            title: "AFAD ekipleri yangın bölgesinde çalışıyor",
            source: "Hürriyet",
            link: "#"
        },
        {
            title: "Helikopterler yangın söndürme operasyonuna katıldı",
            source: "Milliyet",
            link: "#"
        },
        {
            title: "Yangın riski yüksek bölgelerde uyarı yapıldı",
            source: "Habertürk",
            link: "#"
        },
        {
            title: "Kızılay yangın bölgesine yardım malzemesi gönderdi",
            source: "CNN Türk",
            link: "#"
        },
        {
            title: "Meteoroloji yangın riski için uyarı yayınladı",
            source: "NTV",
            link: "#"
        }
    ],
    last_updated: new Date().toISOString()
};

// Function to get static news data
function getStaticNewsTickerData() {
    return STATIC_NEWS_TICKER_DATA;
}

// Function to load static news ticker
function loadStaticNewsTicker() {
    const tickerContent = document.getElementById('newsTickerContent');
    const data = getStaticNewsTickerData();
    
    if (data.success && data.ticker_news.length > 0) {
        let newsHtml = '';
        
        data.ticker_news.forEach((news, index) => {
            newsHtml += `
                <a href="${news.link}" target="_blank" class="news-item" title="${news.title}">
                    <span>${news.title}</span>
                    <span class="news-source">${news.source}</span>
                </a>
                ${index < data.ticker_news.length - 1 ? '<span class="news-separator">•</span>' : ''}
            `;
        });
        
        newsHtml = newsHtml + newsHtml;
        
        tickerContent.innerHTML = newsHtml;
        
        tickerContent.style.animation = 'none';
        setTimeout(() => {
            tickerContent.style.animation = 'scroll-left 60s linear infinite';
        }, 100);
        
        console.log('✅ Statik haber şeridi yüklendi:', data.count, 'haber');
    } else {
        tickerContent.innerHTML = `
            <div class="news-item loading">
                <i class="fas fa-info-circle"></i>
                <span>Şu anda yangın haberi bulunmuyor</span>
            </div>
        `;
    }
}

// Enhanced news ticker function with static fallback
function loadNewsTicker() {
    // GitHub Pages için statik mod kontrolü
    if (window.location.hostname === 'github.io' || window.location.hostname.includes('github-pages')) {
        console.log('GitHub Pages modu - statik haberler kullanılıyor');
        loadStaticNewsTicker();
        return;
    }
    
    const tickerContent = document.getElementById('newsTickerContent');
    
    fetch('/api/news/ticker')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.ticker_news.length > 0) {
                let newsHtml = '';
                
                data.ticker_news.forEach((news, index) => {
                    newsHtml += `
                        <a href="${news.link}" target="_blank" class="news-item" title="${news.title}">
                            <span>${news.title}</span>
                            <span class="news-source">${news.source}</span>
                        </a>
                        ${index < data.ticker_news.length - 1 ? '<span class="news-separator">•</span>' : ''}
                    `;
                });
                
                newsHtml = newsHtml + newsHtml;
                
                tickerContent.innerHTML = newsHtml;
                
                tickerContent.style.animation = 'none';
                setTimeout(() => {
                    tickerContent.style.animation = 'scroll-left 60s linear infinite';
                }, 100);
                
                console.log('✅ Haber şeridi güncellendi:', data.count, 'haber');
            } else {
                tickerContent.innerHTML = `
                    <div class="news-item loading">
                        <i class="fas fa-info-circle"></i>
                        <span>Şu anda yangın haberi bulunmuyor</span>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Haber yükleme hatası:', error);
            console.log('API hatası - statik haberler kullanılıyor');
            loadStaticNewsTicker();
        });
}

// Enhanced refresh function with static fallback
function refreshNews() {
    // GitHub Pages için statik mod kontrolü
    if (window.location.hostname === 'github.io' || window.location.hostname.includes('github-pages')) {
        console.log('GitHub Pages modu - statik haberler yenileniyor');
        loadStaticNewsTicker();
        return;
    }
    
    fetch('/api/news/refresh')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadNewsTicker();
                console.log('Haberler yenilendi:', data.count, 'haber');
            } else {
                console.error('Haber yenileme hatası:', data.message);
                loadStaticNewsTicker();
            }
        })
        .catch(error => {
            console.error('Haber yenileme fetch hatası:', error);
            loadStaticNewsTicker();
        });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STATIC_NEWS_TICKER_DATA,
        getStaticNewsTickerData,
        loadStaticNewsTicker,
        loadNewsTicker,
        refreshNews
    };
} 