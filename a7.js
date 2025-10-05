// ===== GLOBAL VARIABLES =====
let map;
let marker;
let currentCity = null;
let aqiChart = null;
let currentPeriod = '24h';

// ===== API KEYS (A better way to handle local keys) =====
// Create a file named 'keys.js' in the same folder with this content:
// const API_KEYS = {
//     OPENWEATHER_API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY', 
//     WAQI_TOKEN: 'YOUR_WAQI_TOKEN',
//     NEWS_API_KEY: 'YOUR_NEWSAPI_KEY'
// };
// Then link it *before* a6.js in your HTML: <script src="keys.js"></script>
// For now, we'll keep the placeholders for a single-file edit.
const API_KEYS = {
    OPENWEATHER_API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY', // Get from https://openweathermap.org/api
    WAQI_TOKEN: 'YOUR_WAQI_TOKEN', // Get from https://aqicn.org/data-platform/token/
    NEWS_API_KEY: 'YOUR_NEWSAPI_KEY' // Get from https://newsapi.org/
};

// ... (AQI LEVELS, GLOBAL RANKINGS, SAMPLE DATA remains unchanged) ...

const aqiLevels = {
    good: { max: 50, emoji: '😊', mood: 'Excellent', color: '#4caf50' },
    moderate: { max: 100, emoji: '😐', mood: 'Moderate', color: '#ffeb3b' },
    unhealthy_sensitive: { max: 150, emoji: '😷', mood: 'Unhealthy for Sensitive', color: '#ff9800' },
    unhealthy: { max: 200, emoji: '😷', mood: 'Unhealthy', color: '#f44336' },
    very_unhealthy: { max: 300, emoji: '🤢', mood: 'Very Unhealthy', color: '#9c27b0' },
    hazardous: { max: 500, emoji: '☠️', mood: 'Hazardous', color: '#795548' }
};

const globalRankings = [
    { country: 'Switzerland', aqi: 18, score: 95 },
    { country: 'Finland', aqi: 22, score: 93 },
    { country: 'Iceland', aqi: 25, score: 92 },
    { country: 'New Zealand', aqi: 28, score: 90 },
    { country: 'Norway', aqi: 30, score: 89 },
    { country: 'Australia', aqi: 35, score: 87 },
    { country: 'Canada', aqi: 38, score: 85 },
    { country: 'Japan', aqi: 45, score: 82 },
    { country: 'USA', aqi: 52, score: 78 },
    { country: 'UK', aqi: 58, score: 75 },
    { country: 'Germany', aqi: 62, score: 72 },
    { country: 'France', aqi: 65, score: 70 },
    { country: 'Spain', aqi: 68, score: 68 },
    { country: 'Italy', aqi: 72, score: 65 },
    { country: 'China', aqi: 95, score: 45 },
    { country: 'India', aqi: 152, score: 30 }
];

const sampleNews = [
    {
        title: 'Global Tree Planting Initiative Reaches 1 Billion Trees',
        description: 'International effort to combat climate change surpasses major milestone with widespread community participation.',
        source: 'Environmental Times',
        url: '#',
        publishedAt: new Date().toISOString(),
        urlToImage: 'https://via.placeholder.com/300x200?text=Tree+Planting'
    },
    {
        title: 'New Study Links Urban Green Spaces to Mental Health Benefits',
        description: 'Research shows that access to parks and nature reduces stress and improves overall wellbeing in city residents.',
        source: 'Health Journal',
        url: '#',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        urlToImage: 'https://via.placeholder.com/300x200?text=Urban+Park'
    },
    {
        title: 'Air Quality Improvements Seen in Major Cities After EV Adoption',
        description: 'Cities reporting significant reduction in air pollution following increased electric vehicle usage and public transit improvements.',
        source: 'Clean Energy News',
        url: '#',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        urlToImage: 'https://via.placeholder.com/300x200?text=Electric+Vehicle'
    }
];

const sampleAlerts = [
    {
        title: 'Wildfire Warning - California',
        description: 'Multiple wildfires affecting air quality across northern California. Residents advised to stay indoors.',
        location: 'California, USA',
        severity: 'high'
    },
    {
        title: 'Flooding Event - Bangladesh',
        description: 'Severe flooding affecting thousands of families. Health concerns due to water contamination.',
        location: 'Dhaka, Bangladesh',
        severity: 'critical'
    },
    {
        title: 'Deforestation Alert - Amazon',
        description: 'Satellite data shows increased deforestation activity in protected areas of the Amazon rainforest.',
        location: 'Amazon Basin, Brazil',
        severity: 'high'
    },
    {
        title: 'Heat Wave Warning - Europe',
        description: 'Extreme temperatures expected across southern Europe. Health authorities issue warnings for vulnerable populations.',
        location: 'Southern Europe',
        severity: 'medium'
    }
];

// ===== INITIALIZATION & EVENT LISTENERS (NEW/IMPROVED) =====
document.addEventListener('DOMContentLoaded', function() {
    displayRankings();
    setupEventListeners();
});

function setupEventListeners() {
    // 1. Search Button & Input
    document.getElementById('searchButton').addEventListener('click', searchCity);
    document.getElementById('cityInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCity();
        }
    });

    // 2. Navigation Links
    document.getElementById('resourcesLink').addEventListener('click', showResourcesPage);
    document.getElementById('backToMainButton').addEventListener('click', showMainPage);

    // Get all navigation links with data-section
    document.querySelectorAll('.nav-links a[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            scrollToSection(sectionId);
        });
    });

    // 3. Chart Tab Buttons
    document.getElementById('chartTabButtons').addEventListener('click', function(e) {
        const btn = e.target.closest('.tab-btn');
        if (btn && btn.dataset.period) {
            switchChartPeriod(btn.dataset.period);
            // Update active class manually since we removed it from the HTML onclick
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });
}

// ===== MAP FUNCTIONS (No change) =====
function initMap(lat, lon) {
    if (!map) {
        map = L.map('map').setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 25
        }).addTo(map);
    } else {
        map.setView([lat, lon], 13);
    }

    if (marker) {
        map.removeLayer(marker);
    }
    
    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`<b>${currentCity.name}</b><br>AQI: ${currentCity.aqi}`)
        .openPopup();
}

// ===== AQI CALCULATION FUNCTIONS (No change) =====
function getAQILevel(aqi) {
    for (let level in aqiLevels) {
        if (aqi <= aqiLevels[level].max) {
            return aqiLevels[level];
        }
    }
    return aqiLevels.hazardous;
}

function calculateGreenScore(aqi, temp, humidity) {
    let score = 100;
    
    // AQI impact (up to 50 points deduction)
    score -= Math.min(50, aqi * 0.5);
    
    // Temperature impact (optimal: 20-24°C)
    const idealTemp = 22;
    const tempDiff = Math.abs(temp - idealTemp);
    score -= Math.min(20, tempDiff * 2);
    
    // Humidity impact (optimal: 40-60%)
    const idealHumidity = 50;
    const humidityDiff = Math.abs(humidity - idealHumidity);
    score -= Math.min(10, humidityDiff * 0.2);
    
    return Math.max(0, Math.round(score));
}

// ===== CHART FUNCTIONS (Minor change to switchChartPeriod) =====
function generateChartData(period) {
    const labels = [];
    const data = [];
    
    const cityAqi = currentCity ? currentCity.aqi : 50;
    
    if (period === '24h') {
        // Generate 24 hours of data
        for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
            data.push(Math.max(0, cityAqi + Math.random() * 20 - 10));
        }
    } else if (period === 'week') {
        // Generate weekly data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => {
            labels.push(day);
            data.push(Math.max(0, cityAqi + Math.random() * 25 - 12));
        });
    } else if (period === 'year') {
        // Generate yearly data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.forEach(month => {
            labels.push(month);
            data.push(Math.max(0, cityAqi + Math.random() * 30 - 15));
        });
    }

    return { labels, data };
}

function createChart(period) {
    const ctx = document.getElementById('aqiChart').getContext('2d');
    const chartData = generateChartData(period);

    if (aqiChart) {
        aqiChart.destroy();
    }

    aqiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Air Quality Index',
                data: chartData.data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'AQI Level'
                    },
                    ticks: {
                        callback: function(value) {
                            return value;
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: period === '24h' ? 'Hour' : period === 'week' ? 'Day' : 'Month'
                    }
                }
            }
        }
    });
}

// Updated to remove event.target dependency
function switchChartPeriod(period) {
    currentPeriod = period;
    createChart(period);
}

// ===== MAIN SEARCH FUNCTION (API Key usage update) =====
async function searchCity() {
    const cityName = document.getElementById('cityInput').value.trim();
    
    if (!cityName) {
        alert('Please enter a city name');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultsSection').classList.add('hidden');

    try {
        // Fetch weather data from OpenWeatherMap
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEYS.OPENWEATHER_API_KEY}&units=metric`
        );

        let weatherData;
        let usingFallback = false;

        if (weatherResponse.ok) {
            weatherData = await weatherResponse.json();
        } else {
            // Use fallback data if API fails or key is missing
            console.warn('Weather API failed (check key/city), using sample data');
            usingFallback = true;
            weatherData = getFallbackWeatherData(cityName);
        }

        // Fetch AQI data from WAQI
        let aqi = 45 + Math.floor(Math.random() * 50);
        
        try {
            const aqiResponse = await fetch(
                `https://api.waqi.info/feed/geo:${weatherData.coord.lat};${weatherData.coord.lon}/?token=${API_KEYS.WAQI_TOKEN}`
            );

            if (aqiResponse.ok) {
                const aqiData = await aqiResponse.json();
                if (aqiData.status === 'ok' && aqiData.data && aqiData.data.aqi) {
                    aqi = aqiData.data.aqi;
                }
            }
        } catch (error) {
            console.warn('AQI API failed (check key), using estimated value');
        }

        // Calculate scores and display results
        displayResults(weatherData, aqi, usingFallback);

    } catch (error) {
        console.error('Fatal Error:', error);
        document.getElementById('loading').style.display = 'none';
        
        // Show sample data on a critical error
        alert('Error fetching live data. Showing sample data. Please ensure API keys are correct and the city exists.');
        const fallbackData = getFallbackWeatherData(cityName);
        displayResults(fallbackData, 48, true);
    }
}

// ===== FALLBACK DATA FUNCTION (No change) =====
function getFallbackWeatherData(cityName) {
    // Major cities with approximate coordinates
    const cityCoordinates = {
        'new york': { lat: 40.7128, lon: -74.0060 },
        'london': { lat: 51.5074, lon: -0.1278 },
        'tokyo': { lat: 35.6762, lon: 139.6503 },
        'paris': { lat: 48.8566, lon: 2.3522 },
        'sydney': { lat: -33.8688, lon: 151.2093 },
        'mumbai': { lat: 19.0760, lon: 72.8777 },
        'delhi': { lat: 28.7041, lon: 77.1025 },
        'beijing': { lat: 39.9042, lon: 116.4074 },
        'los angeles': { lat: 34.0522, lon: -118.2437 },
        'singapore': { lat: 1.3521, lon: 103.8198 }
    };

    const normalizedCity = cityName.toLowerCase();
    const coords = cityCoordinates[normalizedCity] || { lat: 40.7128, lon: -74.0060 };

    return {
        coord: coords,
        main: { 
            temp: 20 + Math.random() * 10, 
            humidity: 50 + Math.random() * 20 
        },
        weather: [{ description: 'partly cloudy' }],
        wind: { speed: 3 + Math.random() * 5 },
        name: cityName
    };
}

// ===== DISPLAY RESULTS FUNCTION (No change) =====
function displayResults(weatherData, aqi, usingFallback) {
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const greenScore = calculateGreenScore(aqi, temp, humidity);
    const aqiLevel = getAQILevel(aqi);

    // Store current city data
    currentCity = {
        name: weatherData.name,
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon,
        aqi: aqi,
        temp: temp,
        humidity: humidity,
        conditions: weatherData.weather[0].description,
        windSpeed: weatherData.wind.speed
    };

    // Initialize map
    initMap(weatherData.coord.lat, weatherData.coord.lon);

    // Update Green Score
    const greenCircle = document.getElementById('greenScoreCircle');
    greenCircle.textContent = greenScore;
    
    let greenColor;
    if (greenScore > 70) {
        greenColor = 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)';
    } else if (greenScore > 40) {
        greenColor = 'linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%)';
    } else {
        greenColor = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
    }
    greenCircle.style.background = greenColor;
    
    document.getElementById('greenScoreText').textContent = 
        greenScore > 70 ? 'Excellent Environment' : 
        greenScore > 40 ? 'Moderate Environment' : 
        'Needs Improvement';

    // Update AQI Display
    document.getElementById('moodEmoji').textContent = aqiLevel.emoji;
    document.getElementById('aqiValue').textContent = `AQI: ${Math.round(aqi)}`;
    document.getElementById('aqiStatus').textContent = aqiLevel.mood;
    document.getElementById('aqiStatus').style.color = aqiLevel.color;

    // Update Weather Info
    document.getElementById('temp').textContent = `${temp.toFixed(1)}°C`;
    document.getElementById('humidity').textContent = `${Math.round(humidity)}%`;
    document.getElementById('conditions').textContent = weatherData.weather[0].description;
    document.getElementById('wind').textContent = `${weatherData.wind.speed.toFixed(1)} m/s`;

    // Create chart
    createChart(currentPeriod);

    // Hide loading and show results
    document.getElementById('loading').style.display = 'none';
    document.getElementById('resultsSection').classList.remove('hidden');

    // Show notice if using fallback data
    if (usingFallback) {
        console.log('Displaying sample data. Add API keys for live data.');
    }
}

// ===== RANKINGS DISPLAY (No change) =====
function displayRankings() {
    const rankingsList = document.getElementById('rankingsList');
    rankingsList.innerHTML = globalRankings.map((item, index) => {
        const level = getAQILevel(item.aqi);
        return `
            <div class="ranking-item">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="rank-number">#${index + 1}</span>
                    <div>
                        <strong>${item.country}</strong>
                        <div style="color: #666; font-size: 0.9rem;">Health Score: ${item.score}/100</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: ${level.color}">AQI: ${item.aqi}</div>
                    <div style="font-size: 0.9rem; color: #666;">${level.mood}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== NEWS FUNCTIONS (API Key usage update, added image fallback) =====
async function loadNews() {
    const newsFeed = document.getElementById('newsFeed');
    newsFeed.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading environmental news...</p>';

    try {
        // Try to fetch real news
        const response = await fetch(
            `https://newsapi.org/v2/everything?q=environment+climate+pollution&sortBy=publishedAt&language=en&apiKey=${API_KEYS.NEWS_API_KEY}`
        );

        let articles;
        if (response.ok) {
            const data = await response.json();
            // Filter articles that have a title and image for better display
            articles = data.articles
                .filter(a => a.title && a.urlToImage)
                .slice(0, 9);
        } else {
            // Use sample news if API fails or key is missing
            articles = sampleNews;
        }

        displayNews(articles);
    } catch (error) {
        console.error('News fetch error:', error);
        displayNews(sampleNews);
    }
}

function displayNews(articles) {
    const newsFeed = document.getElementById('newsFeed');
    
    if (articles.length === 0) {
        newsFeed.innerHTML = '<p style="text-align: center; color: #666;">No news articles available.</p>';
        return;
    }

    newsFeed.innerHTML = articles.map(article => {
        const date = new Date(article.publishedAt);
        const timeAgo = getTimeAgo(date);
        
        // Added default image for robustness
        const imageUrl = article.urlToImage && article.urlToImage !== 'null' 
            ? article.urlToImage 
            : 'https://via.placeholder.com/300x200?text=News+Image'; 
        
        return `
            <div class="news-card">
                <div class="news-image" style="background-image: url('${imageUrl}')"></div>
                <div class="news-content">
                    <h3 class="news-title">${article.title || 'Environmental News'}</h3>
                    <p class="news-source">
                        <i class="fas fa-newspaper"></i>
                        ${article.source.name || article.source || 'News Source'}
                    </p>
                    <p class="news-description">${article.description || 'Click to read more about this environmental story.'}</p>
                    <p class="news-date"><i class="far fa-clock"></i> ${timeAgo}</p>
                    <a href="${article.url || '#'}" target="_blank" class="news-link">
                        Read Full Article <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// ===== ALERTS FUNCTIONS (No change) =====
function displayAlerts() {
    const alertsFeed = document.getElementById('alertsFeed');
    
    alertsFeed.innerHTML = sampleAlerts.map(alert => {
        const severityColors = {
            critical: '#d32f2f',
            high: '#f44336',
            medium: '#ff9800',
            low: '#ffc107'
        };
        
        return `
            <div class="alert-item" style="border-left-color: ${severityColors[alert.severity]}">
                <div class="alert-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${alert.title}
                </div>
                <p class="alert-description">${alert.description}</p>
                <p class="alert-location">
                    <i class="fas fa-map-marker-alt"></i> ${alert.location}
                </p>
            </div>
        `;
    }).join('');
}

// ===== UTILITY FUNCTIONS (No change) =====
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== PAGE NAVIGATION (No change) =====
function showResourcesPage() {
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('resourcesPage').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Load news and alerts when page is shown
    loadNews();
    displayAlerts();
}

function showMainPage() {
    document.getElementById('resourcesPage').classList.add('hidden');
    document.getElementById('mainPage').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}