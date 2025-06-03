const meteoToken = "726b1c99c171e7c9d93155a0b1721f138a48d4c33ad10e533f84fbbd55d62140";
let map = null;
let marker = null;
let currentTileLayer = null;

// Stockage des recherches récentes
let searchHistory = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le thème
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon();

    // Initialiser l'historique
    updateHistoryDisplay();
});

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const newTheme = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Mettre à jour l'icône après le changement de thème
    updateThemeIcon();
    
    // Mettre à jour la carte si elle est visible (mais elle reste en mode clair)
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }
}

function updateThemeIcon() {
    const themeButton = document.querySelector(".theme-toggle button");
    const current = document.documentElement.getAttribute("data-theme");
    
    // Si le thème est sombre, afficher l'icône du soleil
    if (current === "dark") {
        themeButton.innerHTML = "☀️";
        themeButton.setAttribute("aria-label", "Basculer en mode clair");
    } else {
        // Sinon (mode clair ou pas de thème défini), afficher l'icône de la lune
        themeButton.innerHTML = "🌙";
        themeButton.setAttribute("aria-label", "Basculer en mode sombre");
    }
}

function selectDays(button, days) {
    // Désactiver tous les boutons
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
    });
    
    // Activer le bouton sélectionné
    button.classList.add('active');
    button.setAttribute('aria-checked', 'true');
    
    // Mettre à jour la valeur cachée
    document.getElementById('days-count').value = days;
}

function toggleHistory() {
    const historyPanel = document.getElementById('history-panel');
    historyPanel.classList.toggle('active');
}

function formatDate(dateString) {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

function getWeatherIcon(weatherCode, avgTemp) {
    // Codes météo liés à la neige
    const snowCodes = [14, 15, 16, 21, 43, 44, 60, 61, 62, 63, 64, 65, 66, 67, 68, 73, 75, 76];
    
    // Correspondance entre les codes météo et les icônes
    const weatherIcons = {
        0: "fas fa-sun", // Soleil
        1: "fas fa-cloud-sun", // Peu nuageux
        2: "fas fa-cloud", // Ciel voilé
        3: "fas fa-cloud", // Nuageux
        4: "fas fa-cloud", // Très nuageux
        5: "fas fa-smog", // Brouillard
        6: "fas fa-cloud-rain", // Brouillard givrant
        7: "fas fa-cloud-showers-heavy", // Pluie légère
        8: "fas fa-cloud-showers-heavy", // Pluie modérée
        9: "fas fa-cloud-showers-heavy", // Pluie forte
        10: "fas fa-cloud-rain", // Pluie verglaçante
        11: "fas fa-cloud-rain", // Pluie faible intermittente
        12: "fas fa-cloud-showers-heavy", // Pluie modérée intermittente
        13: "fas fa-cloud-showers-heavy", // Pluie forte intermittente
        14: "fas fa-snowflake", // Neige légère
        15: "fas fa-snowflake", // Neige modérée
        16: "fas fa-snowflake", // Neige forte
        20: "fas fa-cloud-meatball", // Averses de pluie
        21: "fas fa-cloud-meatball", // Averses de neige
        22: "fas fa-poo-storm", // Orage
        30: "fas fa-smog", // Tempête de sable
        31: "fas fa-smog", // Brume sèche
        32: "fas fa-wind", // Brume humide
        40: "fas fa-cloud-rain", // Pluie
        41: "fas fa-cloud-rain", // Bruine
        42: "fas fa-cloud-rain", // Pluie verglaçante
        43: "fas fa-snowflake", // Neige fondante
        44: "fas fa-snowflake", // Neige
        45: "fas fa-cloud-meatball", // Grêle
        46: "fas fa-cloud-meatball", // Grésil
        47: "fas fa-poo-storm", // Orage
        48: "fas fa-bolt", // Orages
        60: "fas fa-snowflake", // Neige légères
        61: "fas fa-snowflake", // Neige modérée
        62: "fas fa-snowflake", // Neige forte
        63: "fas fa-snowflake", // Blizzard
        64: "fas fa-snowflake", // Neige fondue
        65: "fas fa-snowflake", // Pluie et neige mêlées
        66: "fas fa-snowflake", // Neige mouillée
        67: "fas fa-snowflake", // Granules de glace
        68: "fas fa-snowflake", // Grêle
        70: "fas fa-cloud-meatball", // Bruine verglaçante
        71: "fas fa-cloud-meatball", // Pluie verglaçante
        72: "fas fa-cloud-meatball", // Pluie et neige mêlées verglaçantes
        73: "fas fa-cloud-meatball", // Neige verglaçante
        74: "fas fa-cloud-meatball", // Pluie forte verglaçante
        75: "fas fa-cloud-meatball", // Neige forte verglaçante
        76: "fas fa-cloud-meatball", // Diamond dust
        100: "fas fa-tornado", // Tornade
        101: "fas fa-hurricane", // Dépression tropicale
        102: "fas fa-hurricane", // Tempête tropicale
        103: "fas fa-hurricane", // Ouragan
        104: "fas fa-hurricane", // Cyclone
        235: "fas fa-question", // Non déterminé
        // Par défaut
        default: "fas fa-cloud"
    };

    // Si c'est un code neige mais que la température est > 1°C, afficher de la pluie à la place
    if (snowCodes.includes(weatherCode) && avgTemp > 1) {
        return "fas fa-cloud-rain";
    }

    return weatherIcons[weatherCode] || weatherIcons.default;
}

function getWindDirection(degrees) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    const index = Math.round(degrees % 360 / 22.5);
    return directions[index % 16];
}

async function getWeather() {
    const zip = document.getElementById("zipcode").value.trim();
    const daysCount = parseInt(document.getElementById("days-count").value);
    const resultDiv = document.getElementById("result");
    const mapContainer = document.getElementById("map-container");
    
    // Options supplémentaires sélectionnées
    const showLat = document.getElementById("show-lat").checked;
    const showLng = document.getElementById("show-lng").checked;
    const showRain = document.getElementById("show-rain").checked;
    const showWind = document.getElementById("show-wind").checked;
    const showWindDir = document.getElementById("show-wind-dir").checked;

    resultDiv.innerHTML = "<div class='loader' aria-label='Chargement des données météo'></div>";
    mapContainer.style.display = 'none';

    try {
        // 1. Obtenir les informations de la commune depuis l'API Geo
        const geoRes = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${zip}&fields=nom,centre&format=json`);
        const communes = await geoRes.json();

        if (!communes.length) {
            resultDiv.innerHTML = "<p>Aucune commune trouvée pour ce code postal.</p>";
            return;
        }

        const { nom, centre } = communes[0];
        const [lng, lat] = centre.coordinates;

        // 2. Obtenir les données météo depuis l'API Meteo Concept
        const meteoRes = await fetch(`https://api.meteo-concept.com/api/forecast/daily?token=${meteoToken}&latlng=${lat},${lng}`);
        const meteoData = await meteoRes.json();
        
        // Limiter le nombre de jours aux données disponibles ou au maximum demandé
        const actualDays = Math.min(daysCount, meteoData.forecast.length);
        
        // 3. Afficher la carte si demandé
        if (showLat || showLng) {
            // Initialiser la carte si elle n'existe pas déjà
            initMap(lat, lng, nom);
            mapContainer.style.display = 'block';
        } else if (map) {
            // Si la carte existe mais n'est pas demandée, cacher le conteneur
            mapContainer.style.display = 'none';
        }

        // 4. Enregistrer dans l'historique
        saveToHistory(zip, nom, lat, lng);

        // 5. Générer le contenu HTML pour chaque jour
        let forecastHTML = `<h2>Météo pour ${nom}</h2>`;
        
        for (let i = 0; i < actualDays; i++) {
            const day = meteoData.forecast[i];
            const date = new Date(day.datetime);
            const formattedDate = formatDate(day.datetime);
            const isToday = i === 0;
            
            forecastHTML += `
            <div class="weather-card">
                <h3>${isToday ? "Aujourd'hui" : formattedDate}</h3>
                <div class="weather-details">
                    <div class="weather-temp">
                        <div class="temp-value">
                            <i class="${getWeatherIcon(day.weather)}" aria-hidden="true"></i>
                            ${Math.round((day.tmin + day.tmax) / 2)}°C
                        </div>
                        <div class="temp-minmax">
                            <div class="temp-min">Min: <span class="min-value">${day.tmin}°C</span></div>
                            <div class="temp-max">Max: <span class="max-value">${day.tmax}°C</span></div>
                        </div>
                    </div>
                    <div class="weather-stats">
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-label">Probabilité de pluie</span>
                                <span class="stat-value"><i class="fas fa-tint" aria-hidden="true"></i> ${day.probarain}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Ensoleillement</span>
                                <span class="stat-value"><i class="fas fa-sun" aria-hidden="true"></i> ${day.sun_hours}h</span>
                            </div>`;
            
            // Ajouter les informations supplémentaires si sélectionnées
            if (showRain) {
                forecastHTML += `
                            <div class="stat-item">
                                <span class="stat-label">Cumul de pluie</span>
                                <span class="stat-value"><i class="fas fa-cloud-rain" aria-hidden="true"></i> ${day.rr10 || 0} mm</span>
                            </div>`;
            }
            
            if (showWind) {
                forecastHTML += `
                            <div class="stat-item">
                                <span class="stat-label">Vent moyen</span>
                                <span class="stat-value"><i class="fas fa-wind" aria-hidden="true"></i> ${day.wind10m} km/h</span>
                            </div>`;
            }
            
            if (showWindDir) {
                const direction = getWindDirection(day.dirwind10m);
                forecastHTML += `
                            <div class="stat-item">
                                <span class="stat-label">Direction du vent</span>
                                <span class="stat-value wind-direction">
                                    <i class="fas fa-location-arrow wind-arrow" style="transform: rotate(${day.dirwind10m}deg)" aria-hidden="true"></i>
                                    ${direction} (${day.dirwind10m}°)
                                </span>
                            </div>`;
            }
            
            if (showLat) {
                forecastHTML += `
                            <div class="stat-item">
                                <span class="stat-label">Latitude</span>
                                <span class="stat-value"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${lat.toFixed(4)}</span>
                            </div>`;
            }
            
            if (showLng) {
                forecastHTML += `
                            <div class="stat-item">
                                <span class="stat-label">Longitude</span>
                                <span class="stat-value"><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${lng.toFixed(4)}</span>
                            </div>`;
            }
            
            forecastHTML += `
                        </div>
                    </div>
                </div>
            </div>`;
        }

        resultDiv.innerHTML = forecastHTML;
        resultDiv.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error("Erreur lors de la récupération des données météo:", error);
        resultDiv.innerHTML = "<p>Erreur lors de la récupération des données météo. Veuillez réessayer.</p>";
    }
}

// Mettre à jour les tuiles de la carte (toujours en mode clair)
function updateMapTiles() {
    if (!map) return;
    
    // Supprimer l'ancien TileLayer s'il existe
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }
    
    // Toujours utiliser les tuiles en mode clair
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    
    currentTileLayer.addTo(map);
}

function initMap(lat, lng, cityName) {
    const mapContainer = document.getElementById("map");
    
    try {
        // Si la carte n'existe pas, la créer
        if (!map) {
            map = L.map(mapContainer, {
                center: [lat, lng],
                zoom: 12
            });
            
            // Ajouter une tuile de carte initiale
            updateMapTiles();
        } else {
            // Sinon, mettre à jour la vue de la carte
            map.setView([lat, lng], 12);
        }
        
        // Supprimer le marqueur s'il existe
        if (marker) {
            map.removeLayer(marker);
        }
        
        // Ajouter un marqueur à la position
        marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<b>${cityName}</b><br>Latitude: ${lat.toFixed(4)}<br>Longitude: ${lng.toFixed(4)}`).openPopup();
        
        // S'assurer que la carte est correctement affichée
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    } catch (error) {
        console.error("Erreur d'initialisation de la carte:", error);
    }
}

function saveToHistory(zipcode, cityName, lat, lng) {
    // Créer un nouvel élément d'historique
    const historyItem = {
        id: Date.now(),
        zipcode,
        cityName,
        lat,
        lng,
        timestamp: new Date().toISOString()
    };
    
    // Vérifier si cette recherche existe déjà (même code postal)
    const existingIndex = searchHistory.findIndex(item => item.zipcode === zipcode);
    
    if (existingIndex !== -1) {
        // Supprimer l'ancienne entrée
        searchHistory.splice(existingIndex, 1);
    }
    
    // Ajouter la nouvelle recherche au début de l'historique
    searchHistory.unshift(historyItem);
    
    // Limiter l'historique à 10 éléments
    if (searchHistory.length > 10) {
        searchHistory.pop();
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
    
    // Mettre à jour l'affichage de l'historique
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    
    if (!historyList) {
        return;
    }
    
    if (!searchHistory.length) {
        historyList.innerHTML = '<p>Aucun historique disponible.</p>';
        return;
    }
    
    // Trier par date (du plus récent au plus ancien)
    const sortedHistory = [...searchHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Créer le HTML pour chaque élément
    historyList.innerHTML = sortedHistory.map(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
        <div class="history-item" onclick="loadFromHistory('${item.zipcode}')">
            <h3>${item.cityName}</h3>
            <p>Code postal: ${item.zipcode}</p>
            <div class="item-date">${formattedDate}</div>
        </div>
        `;
    }).join('');
}

function loadFromHistory(zipcode) {
    // Remplir le champ de code postal avec la valeur de l'historique
    document.getElementById('zipcode').value = zipcode;
    
    // Déclencher la recherche météo
    getWeather();
    
    // Fermer le panneau d'historique
    document.getElementById('history-panel').classList.remove('active');
}

function clearHistory() {
    // Vider l'historique
    searchHistory = [];
    
    // Mettre à jour le localStorage
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
    
    // Mettre à jour l'affichage
    updateHistoryDisplay();
}
