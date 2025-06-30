// Global değişkenler
let map;
let fireMarkers = [];
let heatLayer = null;
let lastUpdateTime = null;
let isHeatMapMode = true; // Varsayılan olarak heat map modu

// Cache değişkenleri - veriyi sakla
let cachedFireData = [];
let cachedHeatMapData = [];
let isDataLoaded = false;

// GitHub Pages için statik veri kontrolü
let isStaticMode = false;

// Harita başlatma
function initMap() {
    // Türkiye merkezli harita oluştur
    map = L.map('map', {
        center: [38.5, 35.0], // Türkiye merkezi
        zoom: 6,
        zoomControl: false, // Zoom kontrollerini kaldır
        attributionControl: true
    });

    // OpenStreetMap katmanı ekle
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Alternatif harita katmanları
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Yazılı etiketler için overlay layer
    const labelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png', {
        attribution: '© CARTO',
        pane: 'shadowPane'
    });

    // Uydu + etiketler birleşik layer
    const satelliteWithLabels = L.layerGroup([satelliteLayer, labelsLayer]);

    // Katman kontrolü ekle
    const baseMaps = {
        "Sokak Haritası": osmLayer,
        "Uydu Görüntüsü": satelliteWithLabels
    };

    L.control.layers(baseMaps).addTo(map);

    // İlk veri yüklemesi
    loadFireData();
    
    // Otomatik yenileme (5 dakikada bir)
    setInterval(loadFireData, 5 * 60 * 1000);
}

// Yangın verilerini yükle (cache ile)
async function loadFireData() {
    showLoading(true);
    
    try {
        console.log('Yangın verileri yükleniyor...');
        
        // GitHub Pages için statik mod kontrolü
        if (window.location.hostname === 'github.io' || window.location.hostname.includes('github-pages')) {
            console.log('GitHub Pages modu - statik veriler kullanılıyor');
            isStaticMode = true;
            loadStaticData();
            return;
        }
        
        // Her iki API'den de veriyi paralel olarak çek (timeout ile)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout
        
        const [heatResponse, fireResponse] = await Promise.all([
            fetch('/api/heatmap', { signal: controller.signal }),
            fetch('/api/fires', { signal: controller.signal })
        ]);
        
        clearTimeout(timeoutId);
        
        const heatData = await heatResponse.json();
        const fireData = await fireResponse.json();
        
        if (heatData.success && fireData.success) {
            // Veriyi cache'le
            cachedHeatMapData = heatData.heatmap_data || [];
            cachedFireData = fireData.fires || [];
            isDataLoaded = true;
            
            console.log(`Cache güncellendi: ${cachedHeatMapData.length} heat noktası, ${cachedFireData.length} yangın`);
            
            // Aktif moda göre göster
            displayCurrentMode();
            
            updateStats();
            updateFireCount(Math.max(heatData.count, fireData.count));
            lastUpdateTime = new Date();
            updateLastUpdateTime();
            showToast('Yangın verileri başarıyla güncellendi!', 'success');
        } else {
            showToast('Veri yüklenirken hata oluştu!', 'error');
        }
    } catch (error) {
        console.error('API Error:', error);
        console.log('API hatası - statik veriler kullanılıyor');
        loadStaticData();
    } finally {
        showLoading(false);
    }
}

// Statik verileri yükle (GitHub Pages için)
function loadStaticData() {
    try {
        console.log('Statik veriler yükleniyor...');
        
        // fire-data.js dosyasından statik verileri al
        if (typeof getStaticFireData !== 'undefined' && typeof getStaticHeatmapData !== 'undefined') {
            const staticFireData = getStaticFireData();
            const staticHeatmapData = getStaticHeatmapData();
            const staticStatsData = getStaticStatsData();
            
            cachedFireData = staticFireData.fires || [];
            cachedHeatMapData = staticHeatmapData.heatmap_data || [];
            isDataLoaded = true;
            
            console.log(`Statik veriler yüklendi: ${cachedHeatMapData.length} heat noktası, ${cachedFireData.length} yangın`);
            
            displayCurrentMode();
            updateStatsWithStaticData(staticStatsData);
            updateFireCount(staticFireData.count);
            lastUpdateTime = new Date();
            updateLastUpdateTime();
            showToast('Statik veriler yüklendi!', 'info');
        } else {
            console.error('Statik veri fonksiyonları bulunamadı!');
            showToast('Veri yüklenemedi!', 'error');
        }
    } catch (error) {
        console.error('Statik veri yükleme hatası:', error);
        showToast('Veri yüklenemedi!', 'error');
    }
}

// Aktif moda göre görünümü değiştir (API çağrısı YOK!)
function displayCurrentMode() {
    if (!isDataLoaded) {
        console.log('Veri henüz cache\'lenmedi');
        return;
    }
    
    if (isHeatMapMode) {
        console.log('Heat map modu aktif - cache\'den gösteriliyor');
        clearPointMarkers();
        displayHeatMapFromCache();
    } else {
        console.log('Nokta modu aktif - cache\'den gösteriliyor');
        clearHeatMap();
        displayPointMarkersFromCache();
    }
}

// Cache'den heat map göster
function displayHeatMapFromCache() {
    if (cachedHeatMapData.length > 0) {
        console.log(`Cache'den ${cachedHeatMapData.length} yangın heat map olarak gösteriliyor`);
        displayHeatMap(cachedHeatMapData);
    } else {
        console.log('Cache\'de heat map verisi yok');
        clearHeatMap();
    }
}

// Cache'den nokta markerları göster
function displayPointMarkersFromCache() {
    if (cachedFireData.length > 0) {
        console.log(`Cache'den ${cachedFireData.length} yangın nokta olarak gösteriliyor`);
        displayPointMarkers(cachedFireData);
    } else {
        console.log('Cache\'de nokta verisi yok');
        clearPointMarkers();
    }
}

// Heat map göster
function displayHeatMap(heatData) {
    console.log('displayHeatMap çağrıldı, veri sayısı:', heatData.length);
    console.log('Örnek veri:', heatData.slice(0, 3));
    
    // Önceki heat layer'ı temizle
    clearHeatMap();
    
    if (heatData.length === 0) {
        console.log('Heat map verisi boş');
        return;
    }
    
    // L.heatLayer kontrol et
    if (typeof L.heatLayer === 'undefined') {
        console.error('L.heatLayer tanımlı değil! Leaflet heat plugin yüklenmedi.');
        console.log('Fallback: Yoğunluğa göre renkli marker\'lar kullanılacak');
        displayIntensityMarkers(heatData);
        return;
    }
    
    try {
        // Heat map layer oluştur - daha görünür ayarlarla
        heatLayer = L.heatLayer(heatData, {
            radius: 40,        // Daha büyük radius
            blur: 25,          // Daha büyük blur
            maxZoom: 18,
            max: 0.8,          // Max değeri düşür (daha yoğun renkler)
            minOpacity: 0.4,   // Minimum opacity ekle
            gradient: {
                0.0: 'blue',
                0.2: 'cyan', 
                0.4: 'lime',
                0.6: 'yellow',
                0.8: 'orange',
                1.0: 'red'
            }
        });
        
        console.log('Heat layer oluşturuldu:', heatLayer);
        heatLayer.addTo(map);
        
        // Z-index ayarla ve tema bağımsız renk koruması
        setTimeout(() => {
            if (heatLayer._canvas) {
                heatLayer._canvas.style.zIndex = 1000;
                heatLayer._canvas.style.opacity = '1.0';
                heatLayer._canvas.style.filter = 'none'; // Tema filtrelerinden koruma
                heatLayer._canvas.style.mixBlendMode = 'normal';
                heatLayer._canvas.classList.add('heat-layer-protected');
                console.log('Heat canvas bulundu ve korundu:', heatLayer._canvas);
            } else {
                console.log('Heat canvas bulunamadı!');
            }
            
            // Tüm heat canvas'ları koruma altına al
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach((canvas, index) => {
                if (canvas.parentElement && canvas.parentElement.classList.contains('leaflet-heatmap-layer')) {
                    canvas.style.filter = 'none !important';
                    canvas.style.zIndex = 999;
                    canvas.classList.add('heat-layer-protected');
                }
            });
        }, 500);
        
        console.log('Heat layer haritaya eklendi');
    } catch (error) {
        console.error('Heat map oluşturma hatası:', error);
        showToast('Termal harita oluşturulamadı: ' + error.message, 'error');
    }
}

// Nokta markerları göster
function displayPointMarkers(fires) {
    // Önceki markerları temizle
    clearPointMarkers();

    // Her yangın için marker oluştur
    fires.forEach(fire => {
        const marker = createFireMarker(fire);
        fireMarkers.push(marker);
        marker.addTo(map);
    });
    
    console.log(`Nokta markerları gösterildi: ${fires.length} yangın`);
}

// Yangın marker'ı oluştur
function createFireMarker(fire) {
    // Güvenilirlik seviyesine göre renk belirle
    let color, confidenceClass, confidenceText;
    
    switch(fire.confidence.toLowerCase()) {
        case 'high':
        case 'h':
            color = '#ff4444';
            confidenceClass = 'confidence-high';
            confidenceText = 'Yüksek';
            break;
        case 'nominal':
        case 'n':
            color = '#ff8800';
            confidenceClass = 'confidence-medium';
            confidenceText = 'Orta';
            break;
        case 'low':
        case 'l':
        default:
            color = '#ffaa00';
            confidenceClass = 'confidence-low';
            confidenceText = 'Düşük';
            break;
    }

    // Marker boyutunu parlaklığa göre ayarla
    const size = Math.max(6, Math.min(15, fire.intensity * 20));

    // Marker oluştur
    const marker = L.circleMarker([fire.lat, fire.lon], {
        radius: size,
        fillColor: color,
        color: 'white',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    });

    // Popup içeriği oluştur
    const popupContent = createPopupContent(fire, confidenceText, confidenceClass);
    marker.bindPopup(popupContent);

    // Hover efekti
    marker.on('mouseover', function(e) {
        this.setStyle({
            fillOpacity: 1,
            weight: 3
        });
    });

    marker.on('mouseout', function(e) {
        this.setStyle({
            fillOpacity: 0.8,
            weight: 2
        });
    });

    return marker;
}

// Popup içeriği oluştur
function createPopupContent(fire, confidenceText, confidenceClass) {
    const formattedTime = formatDateTime(fire.acq_date, fire.acq_time);
    const dayNightText = fire.daynight === 'D' ? 'Gündüz' : 'Gece';
    
    return `
        <div class="fire-popup">
            <h6><i class="fas fa-fire"></i> Yangın Tespit Noktası</h6>
            
            <div class="info-row">
                <span class="info-label">Koordinat:</span>
                <span class="info-value">${fire.lat.toFixed(4)}, ${fire.lon.toFixed(4)}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Tespit Zamanı:</span>
                <span class="info-value">${formattedTime}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Gün/Gece:</span>
                <span class="info-value">${dayNightText}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Parlaklık:</span>
                <span class="info-value">${fire.brightness.toFixed(1)}K</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">FRP:</span>
                <span class="info-value">${fire.frp.toFixed(1)} MW</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Yoğunluk:</span>
                <span class="info-value">${(fire.intensity * 100).toFixed(1)}%</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Uydu:</span>
                <span class="info-value">${fire.satellite}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Güvenilirlik:</span>
                <span class="confidence-badge ${confidenceClass}">${confidenceText}</span>
            </div>
            
            <div class="mt-2 text-muted small">
                <i class="fas fa-info-circle"></i> Son 24 saat içinde tespit edilmiştir
            </div>
        </div>
    `;
}

// Fallback: Yoğunluğa göre renkli marker'lar göster
function displayIntensityMarkers(heatData) {
    clearPointMarkers();
    
    heatData.forEach(point => {
        const [lat, lon, intensity] = point;
        
        // Yoğunluğa göre renk hesapla
        const color = getIntensityColor(intensity);
        const size = Math.max(4, intensity * 15);
        
        const marker = L.circleMarker([lat, lon], {
            radius: size,
            fillColor: color,
            color: 'white',
            weight: 1,
            opacity: 0.9,
            fillOpacity: 0.7
        });
        
        marker.bindPopup(`
            <div style="text-align: center;">
                <strong>Yangın Noktası</strong><br>
                <small>Koordinat: ${lat.toFixed(4)}, ${lon.toFixed(4)}</small><br>
                <small>Yoğunluk: ${(intensity * 100).toFixed(1)}%</small>
            </div>
        `);
        
        fireMarkers.push(marker);
        marker.addTo(map);
    });
}

// Yoğunluğa göre renk hesapla
function getIntensityColor(intensity) {
    // 0-1 arası intensity değerine göre heat map renklerini hesapla
    const colors = [
        '#ffffb2', // 0.0
        '#fed976', // 0.2
        '#feb24c', // 0.4
        '#fd8d3c', // 0.6
        '#fc4e2a', // 0.8
        '#e31a1c', // 0.9
        '#b10026'  // 1.0
    ];
    
    const index = Math.floor(intensity * (colors.length - 1));
    return colors[Math.min(index, colors.length - 1)];
}

// Heat map'i temizle
function clearHeatMap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }
}

// Nokta markerları temizle
function clearPointMarkers() {
    fireMarkers.forEach(marker => map.removeLayer(marker));
    fireMarkers = [];
}

// Heat map ve nokta görünümü arasında HIZLI geçiş (API çağrısı YOK!)
function toggleHeatMap() {
    console.log('Hızlı geçiş başlatılıyor...');
    
    isHeatMapMode = !isHeatMapMode;
    const button = document.getElementById('heatToggle');
    
    // Buton metnini güncelle
    if (isHeatMapMode) {
        button.innerHTML = '<i class="fas fa-fire"></i> <span>Nokta Görünümü</span>';
    } else {
        button.innerHTML = '<i class="fas fa-layer-group"></i> <span>Termal Görünüm</span>';
    }
    
    // Cache'den anında göster (API çağrısı YOK!)
    displayCurrentMode();
    
    console.log(`Hızlı geçiş tamamlandı: ${isHeatMapMode ? 'Heat Map' : 'Nokta'} modu`);
}

// Tarih ve saat formatla
function formatDateTime(date, time) {
    try {
        if (date.includes('-')) {
            // 2025-06-30 formatı
            const parts = date.split('-');
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            
            const hour = time.length >= 2 ? time.substring(0, 2) : '00';
            const minute = time.length >= 4 ? time.substring(2, 4) : '00';
            
            return `${day}.${month}.${year} ${hour}:${minute}`;
        } else {
            // 20250630 formatı
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            
            const hour = time.substring(0, 2);
            const minute = time.substring(2, 4);
            
            return `${day}.${month}.${year} ${hour}:${minute}`;
        }
    } catch (error) {
        return `${date} ${time}`;
    }
}

// İstatistikleri güncelle (hem desktop hem mobile)
async function updateStats() {
    if (isStaticMode) {
        console.log('Statik mod - stats güncellenmiyor');
        return;
    }
    
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Desktop elements
            document.getElementById('totalFires').textContent = stats.total_fires;
            document.getElementById('dayFires').textContent = stats.day_fires;
            document.getElementById('nightFires').textContent = stats.night_fires;
            document.getElementById('highConfidence').textContent = stats.high_confidence;
            document.getElementById('avgBrightness').textContent = stats.avg_brightness + 'K';
            
            // Mobile elements  
            document.getElementById('dayFiresMobile').textContent = stats.day_fires;
            document.getElementById('nightFiresMobile').textContent = stats.night_fires;
            document.getElementById('avgBrightnessMobile').textContent = stats.avg_brightness + 'K';
        }
    } catch (error) {
        console.error('Stats Error:', error);
    }
}

// Statik veriler için stats güncelleme
function updateStatsWithStaticData(staticStatsData) {
    if (staticStatsData && staticStatsData.stats) {
        const stats = staticStatsData.stats;
        
        // Desktop elements
        document.getElementById('totalFires').textContent = stats.total_fires;
        document.getElementById('dayFires').textContent = stats.day_fires;
        document.getElementById('nightFires').textContent = stats.night_fires;
        document.getElementById('highConfidence').textContent = stats.high_confidence;
        document.getElementById('avgBrightness').textContent = stats.avg_brightness + 'K';
        
        // Mobile elements  
        document.getElementById('dayFiresMobile').textContent = stats.day_fires;
        document.getElementById('nightFiresMobile').textContent = stats.night_fires;
        document.getElementById('avgBrightnessMobile').textContent = stats.avg_brightness + 'K';
    }
}

// Yangın sayısını güncelle (hem desktop hem mobile)
function updateFireCount(count) {
    const fireCountElement = document.getElementById('fireCount');
    const fireCountMobileElement = document.getElementById('fireCountMobile');
    fireCountElement.textContent = count;
    fireCountMobileElement.textContent = count;
}

// Son güncelleme zamanını güncelle (hem desktop hem mobile)
function updateLastUpdateTime() {
    if (lastUpdateTime) {
        const now = new Date();
        const diffMinutes = Math.floor((now - lastUpdateTime) / (1000 * 60));
        
        let timeText;
        if (diffMinutes < 1) {
            timeText = 'Az önce';
        } else if (diffMinutes < 60) {
            timeText = `${diffMinutes} dk önce`;
        } else {
            const diffHours = Math.floor(diffMinutes / 60);
            timeText = `${diffHours} sa önce`;
        }
        
        document.getElementById('lastUpdate').textContent = timeText;
        document.getElementById('lastUpdateMobile').textContent = timeText;
    }
}

// Yükleme durumunu göster/gizle
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
    } else {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Toast bildirim göster (Modern custom toast)
function showToast(message, type = 'info') {
    // Eski toast'ları temizle
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Yeni toast oluştur
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    const icon = type === 'success' ? 'fas fa-check' : 
                 type === 'error' ? 'fas fa-exclamation-triangle' : 
                 type === 'warning' ? 'fas fa-exclamation' : 'fas fa-info';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // CSS için styles ekle
    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .custom-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                box-shadow: var(--shadow);
                padding: 1rem;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 1rem;
                min-width: 300px;
                max-width: 500px;
                animation: slideIn 0.3s ease;
                backdrop-filter: blur(10px);
            }
            
            .custom-toast.toast-success { border-left: 4px solid #10b981; }
            .custom-toast.toast-error { border-left: 4px solid #ef4444; }
            .custom-toast.toast-warning { border-left: 4px solid #f59e0b; }
            .custom-toast.toast-info { border-left: 4px solid #3b82f6; }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                flex: 1;
                color: var(--text-primary);
                font-size: 0.875rem;
            }
            
            .toast-content i {
                font-size: 1rem;
            }
            
            .toast-success .toast-content i { color: #10b981; }
            .toast-error .toast-content i { color: #ef4444; }
            .toast-warning .toast-content i { color: #f59e0b; }
            .toast-info .toast-content i { color: #3b82f6; }
            
            .toast-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .toast-close:hover {
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Verileri yenile (cache'i güncelle)
function refreshData() {
    const refreshIcon = document.getElementById('refreshIcon');
    refreshIcon.classList.add('spin');
    
    console.log('Veriler yenileniyor ve cache güncelleniyor...');
    
    loadFireData().finally(() => {
        setTimeout(() => {
            refreshIcon.classList.remove('spin');
        }, 1000);
    });
}

// Debug function
function debugStatus() {
    console.log('=== DEBUG STATUS ===');
    console.log('Map loaded:', typeof map !== 'undefined');
    console.log('Heat layer plugin:', typeof L.heatLayer !== 'undefined');
    console.log('Data loaded:', isDataLoaded);
    console.log('Heat map mode:', isHeatMapMode);
    console.log('Cached heat data:', cachedHeatMapData.length);
    console.log('Cached fire data:', cachedFireData.length);
    console.log('Fire markers on map:', fireMarkers.length);
    console.log('Heat layer exists:', heatLayer !== null);
    
    // Element kontrolü
    const fireCountEl = document.getElementById('fireCount');
    const loadingEl = document.getElementById('loadingOverlay');
    console.log('Fire count element:', fireCountEl ? fireCountEl.textContent : 'NOT FOUND');
    console.log('Loading overlay display:', loadingEl ? loadingEl.style.display : 'NOT FOUND');
}

// Sayfa yüklendiğinde haritayı başlat
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM yüklendi, harita başlatılıyor...');
    console.log('L.heatLayer mevcut mu?', typeof L.heatLayer);
    
    // 1 saniye sonra debug
    setTimeout(debugStatus, 1000);
    
    initMap();
    
    // Her dakika son güncelleme zamanını güncelle
    setInterval(updateLastUpdateTime, 60000);
    
    // Debug için global erişim
    window.debugStatus = debugStatus;
    window.forceRefresh = function() {
        console.log('Manual refresh triggered...');
        loadFireData();
    };
});

// Pencere boyutu değiştiğinde haritayı yeniden boyutlandır
window.addEventListener('resize', function() {
    if (map) {
        map.invalidateSize();
    }
}); 