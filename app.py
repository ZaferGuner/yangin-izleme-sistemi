from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import requests
import csv
import io
from datetime import datetime, timedelta
import os
import math
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
from difflib import SequenceMatcher
import threading
from urllib.parse import urljoin, urlparse

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configuration from environment variables
NASA_API_KEY = os.environ.get('NASA_API_KEY', '')
NEWS_CACHE_DURATION = int(os.environ.get('NEWS_CACHE_DURATION', '600'))
NEWS_TIMEOUT = int(os.environ.get('NEWS_TIMEOUT', '15'))
MAX_NEWS_ITEMS = int(os.environ.get('MAX_NEWS_ITEMS', '20'))

app = Flask(__name__)
CORS(app)

def get_fire_data():
    """NASA FIRMS API'den Türkiye'deki yangın verilerini çeker"""
    try:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/country/csv/{NASA_API_KEY}/VIIRS_SNPP_NRT/TUR/1"
        
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        
        response_text = response.text.strip()
        
        if 'Invalid' in response_text or 'Error' in response_text:
            print(f"API Hatası: {response_text}")
            return []
        
        if not response_text or len(response_text) < 10:
            print("API'den boş response alındı")
            return []
        
        fires = []
        csv_data = io.StringIO(response_text)
        reader = csv.DictReader(csv_data)
        
        for row in reader:
            try:
                if 'brightness' in row:
                    brightness = float(row['brightness'])
                elif 'bright_ti4' in row:
                    brightness = float(row['bright_ti4'])
                else:
                    brightness = 300.0
                
                if 'bright_t31' in row:
                    bright_t31 = float(row['bright_t31'])
                elif 'bright_ti5' in row:
                    bright_t31 = float(row['bright_ti5'])
                else:
                    bright_t31 = 290.0
                
                frp_value = float(row['frp']) if row['frp'] and row['frp'] != '' else 0
                
                fire = {
                    'lat': float(row['latitude']),
                    'lon': float(row['longitude']),
                    'brightness': brightness,
                    'scan': float(row['scan']),
                    'track': float(row['track']),
                    'acq_date': row['acq_date'],
                    'acq_time': row['acq_time'],
                    'satellite': row['satellite'],
                    'confidence': row['confidence'],
                    'version': row['version'],
                    'bright_t31': bright_t31,
                    'frp': frp_value,
                    'daynight': row['daynight'],
                    'intensity': calculate_heat_intensity(brightness, frp_value)
                }
                fires.append(fire)
            except (KeyError, ValueError) as e:
                continue
        
        print(f"✅ Başarıyla {len(fires)} yangın verisi alındı")
        return fires
    
    except Exception as e:
        print(f"Veri çekme hatası: {str(e)}")
        return []

def calculate_heat_intensity(brightness, frp):
    """Yangın şiddeti için heat map yoğunluk değeri hesapla"""
    brightness_normalized = min(max((brightness - 300) / 67, 0), 1)
    frp_normalized = min(max(frp / 100, 0), 1)
    
    intensity = (brightness_normalized * 0.3) + (frp_normalized * 0.7)
    return min(max(intensity, 0.1), 1.0)

news_cache = {'data': [], 'last_update': None}
CACHE_DURATION = NEWS_CACHE_DURATION

def similarity(a, b):
    """İki string arasındaki benzerlik oranını hesapla"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def is_fire_related(title, content=""):
    """Haberin yangın ile ilgili olup olmadığını kontrol et"""
    fire_keywords = [
        'yangın', 'orman yangını', 'itfaiye', 'alevler', 'duman', 'dumanlar',
        'küllendi', 'yandı', 'tutuştu', 'söndürme', 'söndürüldü', 'söndürüyor',
        'fire', 'wildfire', 'forest fire', 'blaze', 'smoke', 'burn', 'extinguish', 'flames',
        'orman', 'ağaç', 'çalılık', 'çimen', 'ot', 'kuru', 'sıcak', 'kuraklık',
        'afad', 'kızılay', 'helikopter', 'uçak', 'söndürme uçağı', 'yangın söndürme',
        'yangın bölgesi', 'yangın alanı', 'yangın tehlikesi', 'yangın riski',
        'yangın uyarısı', 'yangın alarmı', 'yangın ihbarı', 'yangın raporu',
        'yangın haberi', 'yangın durumu', 'yangın kontrolü', 'yangın yönetimi'
    ]
    
    text = (title + " " + content).lower()
    
    # Ana yangın kelimeleri varsa direkt kabul et
    if any(keyword in text for keyword in ['yangın', 'fire', 'wildfire', 'blaze']):
        return True
    
    # İtfaiye ve söndürme ile ilgili kelimeler varsa kontrol et
    if any(keyword in text for keyword in ['itfaiye', 'söndürme', 'alevler', 'duman']):
        return True
    
    # Orman ve yanma ile ilgili kelimeler varsa kontrol et
    if any(keyword in text for keyword in ['orman', 'ağaç', 'yandı', 'tutuştu', 'küllendi']):
        return True
    
    return False

def clean_and_deduplicate_news(news_list):
    """Haberleri temizle ve benzerleri kaldır"""
    if not news_list:
        return []
    
    fire_news = [news for news in news_list if is_fire_related(news.get('title', ''), news.get('description', ''))]
    
    unique_news = []
    for news in fire_news:
        is_duplicate = False
        for existing in unique_news:
            if similarity(news['title'], existing['title']) > 0.8:
                is_duplicate = True
                break
        
        if not is_duplicate:
            # Başlık temizleme
            title = news['title']
            title = re.sub(r'^\s*\|.*?\|\s*', '', title)  # Site prefiksleri
            title = re.sub(r'^\s*\[.*?\]\s*', '', title)  # Köşeli parantez
            title = re.sub(r'^\s*\(.*?\)\s*', '', title)  # Normal parantez
            title = re.sub(r'^\s*[A-Z]+:\s*', '', title)  # Büyük harf prefiksleri
            title = re.sub(r'\s+', ' ', title)  # Fazla boşlukları temizle
            title = title.strip()
            
            if len(title) > 10:  # Çok kısa başlıkları filtrele
                news['title'] = title
                unique_news.append(news)
    
    # Tarihe göre sırala (en yeni önce)
    unique_news.sort(key=lambda x: x.get('published', ''), reverse=True)
    
    return unique_news[:MAX_NEWS_ITEMS]

def fetch_rss_news(url, source_name):
    """RSS feed'den haber çek"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        
        response = requests.get(url, headers=headers, timeout=NEWS_TIMEOUT)
        response.raise_for_status()
        
        # XML encoding kontrolü
        content = response.content
        if content.startswith(b'\xef\xbb\xbf'):
            content = content[3:]  # BOM kaldır
        
        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            # HTML içeriği olabilir, BeautifulSoup ile parse et
            soup = BeautifulSoup(content, 'html.parser')
            items = soup.find_all(['item', 'entry'])
            if not items:
                return []
            
            news_items = []
            for item in items[:MAX_NEWS_ITEMS]:
                title_elem = item.find(['title', 'h1', 'h2', 'h3'])
                desc_elem = item.find(['description', 'summary', 'content'])
                link_elem = item.find(['link', 'url'])
                pub_elem = item.find(['pubDate', 'published', 'date'])
                
                title = title_elem.get_text(strip=True) if title_elem else ''
                description = desc_elem.get_text(strip=True) if desc_elem else ''
                link = link_elem.get('href') or link_elem.get_text(strip=True) if link_elem else ''
                published = pub_elem.get_text(strip=True) if pub_elem else ''
                
                if title and is_fire_related(title, description):
                    news_items.append({
                        'title': title,
                        'description': description,
                        'link': link,
                        'published': published,
                        'source': source_name
                    })
            
            return news_items
        
        news_items = []
        items = root.findall('.//item')[:MAX_NEWS_ITEMS]
        
        for item in items:
            title_elem = item.find('title')
            desc_elem = item.find('description')
            link_elem = item.find('link')
            pub_elem = item.find('pubDate')
            
            title = title_elem.text if title_elem is not None else ''
            description = desc_elem.text if desc_elem is not None else ''
            link = link_elem.text if link_elem is not None else ''
            published = pub_elem.text if pub_elem is not None else ''
            
            # HTML taglarını temizle
            if description:
                soup = BeautifulSoup(description, 'html.parser')
                description = soup.get_text(strip=True)
            
            # Başlık temizleme
            if title:
                soup = BeautifulSoup(title, 'html.parser')
                title = soup.get_text(strip=True)
            
            if title and is_fire_related(title, description or ""):
                # Link kontrolü
                if not link or link == '':
                    link = '#'
                
                news_items.append({
                    'title': title,
                    'description': description,
                    'link': link,
                    'published': published,
                    'source': source_name
                })
        
        return news_items
    except Exception as e:
        print(f"RSS hata ({source_name}): {str(e)}")
        return []

def fetch_web_news():
    """Web sitelerinden haber çek"""
    news_sources = [
        ('https://www.aa.com.tr/tr/rss/default?cat=gundem', 'Anadolu Ajansı'),
        ('https://www.trthaber.com/xml_mobile.php?kategori=gundem', 'TRT Haber'),
        ('https://www.sozcu.com.tr/kategori/gundem/feed/', 'Sözcü'),
        ('https://www.hurriyet.com.tr/rss/gundem', 'Hürriyet'),
        ('https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml', 'Milliyet'),
        ('https://www.haberturk.com/rss/gundem.xml', 'Habertürk'),
        ('https://www.cnnturk.com/feed/rss/all/news', 'CNN Türk'),
        ('https://www.ntv.com.tr/turkiye.rss', 'NTV'),
        ('https://www.iha.com.tr/rss/gundem.xml', 'İHA'),
        ('https://www.dha.com.tr/rss/gundem.xml', 'DHA'),
        ('https://www.ensonhaber.com/rss/gundem.xml', 'En Son Haber'),
        ('https://www.takvim.com.tr/rss/gundem.xml', 'Takvim'),
        ('https://www.star.com.tr/rss/gundem.xml', 'Star'),
        ('https://www.aksam.com.tr/rss/gundem.xml', 'Akşam'),
    ]
    
    all_news = []
    threads = []
    results = {}
    
    def fetch_source(url, source_name):
        results[source_name] = fetch_rss_news(url, source_name)
    
    for url, source_name in news_sources:
        thread = threading.Thread(target=fetch_source, args=(url, source_name))
        thread.start()
        threads.append(thread)
    
    for thread in threads:
        thread.join(timeout=NEWS_TIMEOUT + 5)
    
    for source_name, news_items in results.items():
        if news_items:
            print(f"✅ {source_name}: {len(news_items)} haber")
        all_news.extend(news_items)
    
    return clean_and_deduplicate_news(all_news)

def get_cached_news():
    """Cache'li haber verilerini getir"""
    global news_cache
    current_time = datetime.now()
    
    if (news_cache['last_update'] is None or 
        (current_time - news_cache['last_update']).seconds > CACHE_DURATION):
        
        print("Haberler güncelleniyor...")
        fresh_news = fetch_web_news()
        
        news_cache['data'] = fresh_news
        news_cache['last_update'] = current_time
        
        print(f"✅ {len(fresh_news)} yangın haberi güncellendi")
    
    return news_cache['data']

@app.route('/')
def index():
    """Ana sayfa"""
    return render_template('index.html')

@app.route('/api/fires')
def api_fires():
    """Yangın verilerini JSON formatında döndürür"""
    fires = get_fire_data()
    return jsonify({
        'success': True,
        'count': len(fires),
        'fires': fires,
        'last_updated': datetime.now().isoformat()
    })

@app.route('/api/heatmap')
def api_heatmap():
    """Heat map için optimize edilmiş yangın verileri"""
    fires = get_fire_data()
    
    heatmap_data = []
    for fire in fires:
        heatmap_data.append([
            fire['lat'],
            fire['lon'], 
            fire['intensity']
        ])
    
    return jsonify({
        'success': True,
        'count': len(heatmap_data),
        'heatmap_data': heatmap_data,
        'last_updated': datetime.now().isoformat()
    })

@app.route('/api/stats')
def api_stats():
    """Yangın istatistiklerini döndürür"""
    fires = get_fire_data()
    
    if not fires:
        return jsonify({
            'success': False,
            'message': 'Veri bulunamadı'
        })
    
    total_fires = len(fires)
    day_fires = len([f for f in fires if f['daynight'] == 'D'])
    night_fires = len([f for f in fires if f['daynight'] == 'N'])
    high_confidence = len([f for f in fires if f['confidence'] in ['high', 'h']])
    
    avg_brightness = sum(f['brightness'] for f in fires) / total_fires if total_fires > 0 else 0
    max_frp = max(f['frp'] for f in fires) if fires else 0
    avg_intensity = sum(f['intensity'] for f in fires) / total_fires if total_fires > 0 else 0
    
    return jsonify({
        'success': True,
        'stats': {
            'total_fires': total_fires,
            'day_fires': day_fires,
            'night_fires': night_fires,
            'high_confidence': high_confidence,
            'avg_brightness': round(avg_brightness, 2),
            'max_frp': round(max_frp, 2),
            'avg_intensity': round(avg_intensity, 3)
        }
    })

@app.route('/api/news')
def api_news():
    """Yangın ile ilgili haberleri döndürür"""
    try:
        news_data = get_cached_news()
        
        return jsonify({
            'success': True,
            'count': len(news_data),
            'news': news_data,
            'last_updated': news_cache['last_update'].isoformat() if news_cache['last_update'] else None,
            'cache_duration': CACHE_DURATION
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Haber çekme hatası: {str(e)}',
            'news': [],
            'count': 0
        })

@app.route('/api/news/ticker')
def api_news_ticker():
    """Haber şeridi için optimize edilmiş format"""
    try:
        news_data = get_cached_news()
        
        ticker_news = []
        for news in news_data:
            ticker_news.append({
                'title': news['title'],
                'source': news['source'],
                'link': news.get('link', '#')
            })
        
        return jsonify({
            'success': True,
            'count': len(ticker_news),
            'ticker_news': ticker_news,
            'last_updated': news_cache['last_update'].isoformat() if news_cache['last_update'] else None
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Ticker hata: {str(e)}',
            'ticker_news': [],
            'count': 0
        })

@app.route('/api/news/refresh')
def api_news_refresh():
    """Haberleri manuel olarak yenile"""
    global news_cache
    
    try:
        news_cache['last_update'] = None
        fresh_news = get_cached_news()
        
        return jsonify({
            'success': True,
            'message': 'Haberler başarıyla yenilendi',
            'count': len(fresh_news),
            'news': fresh_news
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Yenileme hatası: {str(e)}'
        })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 