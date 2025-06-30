# Turkey Fire Monitoring System

A real-time interactive web application for monitoring forest fires in Turkey. Uses NASA FIRMS API to fetch fire data and visualizes it on a Leaflet map.

## Features

- Real-time fire data from NASA FIRMS API
- Interactive map with Leaflet.js
- Heat map and point view modes
- News ticker with fire-related news
- Responsive design for mobile and desktop
- Light/dark theme support
- GitHub Pages compatibility

## Live Demo

**GitHub Pages**: https://zaferguner.github.io/yangin-izleme-sistemi

## Data Sources

- **NASA FIRMS API**: Fire detection data
- **Turkish News Sources**: RSS feeds for fire-related news
  - Anadolu Agency
  - TRT News
  - Hurriyet
  - Milliyet
  - Haberturk
  - CNN Turk
  - NTV
  - Sozcu

## Technologies

### Backend
- Flask: Python web framework
- Requests: HTTP requests
- BeautifulSoup: HTML parsing
- XML/CSV: Data processing

### Frontend
- Leaflet.js: Interactive map
- Vanilla JavaScript: Modern ES6+ JavaScript
- CSS3: Responsive design
- Font Awesome: Icons

## Project Structure

```
ormanlar/
├── app.py                 # Flask application
├── config.py             # Configuration file
├── requirements.txt      # Python dependencies
├── .gitignore           # Git ignore file
├── index.html           # Static HTML for GitHub Pages
├── static/
│   ├── css/
│   │   └── style.css    # Main stylesheet
│   └── js/
│       ├── map.js       # Map operations
│       ├── fire-data.js # Static fire data
│       └── news-ticker.js # News ticker operations
└── templates/
    └── index.html       # Flask template
```

## Installation

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/zaferguner/ormanlar.git
cd ormanlar
```

2. **Create Python virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
# Create .env file
NASA_API_KEY=your_nasa_api_key_here
FLASK_SECRET_KEY=your_secret_key_here
```

5. **Run the application**
```bash
python app.py
```

6. **Open in browser**
```
http://localhost:5000
```

### GitHub Pages Deployment

1. **Upload repository to GitHub**
2. **Go to Settings > Pages**
3. **Select main branch as Source**
4. **index.html file will be used as main page automatically**

## API Keys

### NASA FIRMS API
- Get free API key from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/)
- Add to .env file: `NASA_API_KEY=your_key_here`

## Usage

### Map Controls
- **Zoom**: Mouse wheel or +/- buttons
- **Pan**: Mouse drag
- **Layer Change**: Layer control in top right
- **View Toggle**: Button in bottom right

### News Ticker
- **Auto Scroll**: News scroll automatically
- **Refresh**: Refresh button in top right
- **Hide**: Control button to hide ticker

### Mobile Compatibility
- **Responsive Design**: Compatible with all screen sizes
- **Touch Controls**: Touch controls on mobile devices
- **Mobile Menu**: Statistics in hamburger menu

## Security

- API keys stored in .env file
- Sensitive files hidden with .gitignore
- Configurable CORS settings
- Rate limiting and timeout protections

## Performance

- **Caching**: Data cached for 10 minutes
- **Lazy Loading**: Map layers loaded when needed
- **Optimized Images**: Map tiles optimized
- **Minified Assets**: CSS/JS files compressed

## Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Developer

**Zafer Guner**
- Website: https://zaferguner.com
- GitHub: @zaferguner

## Acknowledgments

- **NASA FIRMS**: For fire data
- **Leaflet.js**: For map library
- **OpenStreetMap**: For map data
- **Font Awesome**: For icons

## Contact

For questions:
- Email: contact@zaferguner.com
- GitHub Issues: Project Issues

---

Star this project if you found it useful! 