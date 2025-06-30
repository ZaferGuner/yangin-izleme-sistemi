// Static Fire Data for GitHub Pages
// This file contains sample fire data when API is not available

const STATIC_FIRE_DATA = {
    success: true,
    count: 5,
    fires: [
        {
            lat: 38.4192,
            lon: 27.1287,
            brightness: 320.5,
            scan: 0.5,
            track: 0.5,
            acq_date: "2025-01-01",
            acq_time: "14:30:00",
            satellite: "NPP",
            confidence: "high",
            version: "2.0NRT",
            bright_t31: 295.2,
            frp: 45.8,
            daynight: "D",
            intensity: 0.7
        },
        {
            lat: 36.8969,
            lon: 30.7133,
            brightness: 315.2,
            scan: 0.5,
            track: 0.5,
            acq_date: "2025-01-01",
            acq_time: "15:45:00",
            satellite: "NPP",
            confidence: "high",
            version: "2.0NRT",
            bright_t31: 292.8,
            frp: 38.5,
            daynight: "D",
            intensity: 0.6
        },
        {
            lat: 38.7324,
            lon: 27.4242,
            brightness: 325.1,
            scan: 0.5,
            track: 0.5,
            acq_date: "2025-01-01",
            acq_time: "16:20:00",
            satellite: "NPP",
            confidence: "medium",
            version: "2.0NRT",
            bright_t31: 298.5,
            frp: 52.3,
            daynight: "D",
            intensity: 0.8
        },
        {
            lat: 37.0662,
            lon: 27.3833,
            brightness: 318.7,
            scan: 0.5,
            track: 0.5,
            acq_date: "2025-01-01",
            acq_time: "17:10:00",
            satellite: "NPP",
            confidence: "high",
            version: "2.0NRT",
            bright_t31: 294.2,
            frp: 41.6,
            daynight: "D",
            intensity: 0.65
        },
        {
            lat: 39.9334,
            lon: 32.8597,
            brightness: 322.3,
            scan: 0.5,
            track: 0.5,
            acq_date: "2025-01-01",
            acq_time: "18:30:00",
            satellite: "NPP",
            confidence: "medium",
            version: "2.0NRT",
            bright_t31: 296.8,
            frp: 48.9,
            daynight: "D",
            intensity: 0.75
        }
    ],
    last_updated: new Date().toISOString()
};

const STATIC_HEATMAP_DATA = {
    success: true,
    count: 5,
    heatmap_data: [
        [38.4192, 27.1287, 0.7],
        [36.8969, 30.7133, 0.6],
        [38.7324, 27.4242, 0.8],
        [37.0662, 27.3833, 0.65],
        [39.9334, 32.8597, 0.75]
    ],
    last_updated: new Date().toISOString()
};

const STATIC_STATS_DATA = {
    success: true,
    stats: {
        total_fires: 5,
        day_fires: 5,
        night_fires: 0,
        high_confidence: 3,
        avg_brightness: 320.36,
        max_frp: 52.3,
        avg_intensity: 0.7
    }
};

const STATIC_NEWS_DATA = {
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

// Function to get static data when API is not available
function getStaticFireData() {
    return STATIC_FIRE_DATA;
}

function getStaticHeatmapData() {
    return STATIC_HEATMAP_DATA;
}

function getStaticStatsData() {
    return STATIC_STATS_DATA;
}

function getStaticNewsData() {
    return STATIC_NEWS_DATA;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STATIC_FIRE_DATA,
        STATIC_HEATMAP_DATA,
        STATIC_STATS_DATA,
        STATIC_NEWS_DATA,
        getStaticFireData,
        getStaticHeatmapData,
        getStaticStatsData,
        getStaticNewsData
    };
} 