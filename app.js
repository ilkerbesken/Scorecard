 const WEATHER_API_KEY = '0d326a8737909da81077f5e2992ea393';

        let currentRoundData = null;
        let savedRounds = [];
        let currentTargetCell = null;

        // --- CORE LOGIC ---
        function switchView(viewName) {
            ['scorecard', 'history', 'stats'].forEach(v => {
                const viewEl = document.getElementById(`${v}-view`);
                if (viewEl) viewEl.classList.add('hidden');
            });
            const targetView = document.getElementById(`${viewName}-view`);
            if (targetView) targetView.classList.remove('hidden');

            if(viewName === 'history') loadHistoryView();
            if(viewName === 'stats') showStats('daily');
        }

        function getRoundConfiguration(roundType) {
            const configurations = {
                'WA720': { name: 'WA 720', numEnds: 12, arrowsPerEnd: 6, description: '12 ends × 6 arrows', distance: '70m' },
                'WA1440': { name: 'WA 1440', numEnds: 24, arrowsPerEnd: 6, description: '24 ends × 6 arrows', distance: '90/70/50/30m' },
                'Indoor18': { name: 'Indoor 18m', numEnds: 20, arrowsPerEnd: 3, description: '20 ends × 3 arrows', distance: '18m' },
                'Indoor18Short': { name: 'Indoor 18m (Short)', numEnds: 10, arrowsPerEnd: 3, description: '10 ends × 3 arrows', distance: '18m' },
                'Indoor25': { name: 'Indoor 25m', numEnds: 20, arrowsPerEnd: 3, description: '20 ends × 3 arrows', distance: '25m' },
                'Custom3': { name: 'Custom (3 arrow)', numEnds: 1, arrowsPerEnd: 3, description: 'Custom Round (3 arrow)', distance: 'Custom' },
                'Custom6': { name: 'Custom (6 arrow)', numEnds: 1, arrowsPerEnd: 6, description: 'Custom Round (6 arrow)', distance: 'Custom' }
            };
            return configurations[roundType] || configurations['Custom6'];
        }

        function createScoreRow(endNumber) {
            const roundConfig = getRoundConfiguration(document.getElementById('roundType').value);
            const arrowsPerEnd = roundConfig.arrowsPerEnd;
            
            let arrowInputsHTML = '';
            for (let i = 1; i <= arrowsPerEnd; i++) {
                arrowInputsHTML += `<td class="border border-gray-300 px-1 py-1 text-center"><div class="score-cell" data-score="-" data-arrow="${i}">-</div></td>`;
            }

            const emptyCellsHTML = arrowsPerEnd < 6 ? Array(6 - arrowsPerEnd).fill('<td class="border border-gray-300 px-1 py-1 text-center bg-gray-100"></td>').join('') : '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="border border-gray-300 px-2 py-2 text-center font-medium bg-gray-50">${endNumber}</td>
                ${arrowInputsHTML}
                ${emptyCellsHTML}
                <td class="border border-gray-300 px-2 py-2 text-center font-medium bg-blue-50 end-total">0</td>
                <td class="border border-gray-300 px-2 py-2 text-center font-medium bg-gray-200 end-hits">0</td>
                <td class="border border-gray-300 px-2 py-2 text-center font-medium bg-gray-200 end-tens">0</td>
                <td class="border border-gray-300 px-2 py-2 text-center font-medium bg-gray-200 end-xs">0</td>
                <td class="border border-gray-300 px-2 py-2 text-center font-medium bg-green-50 running-total">0</td>
            `;
            return row;
        }

        function startNewRound() {
            const archerName = document.getElementById('archer-name').value.trim();
            const date = document.getElementById('date').value;
            const location = document.getElementById('location').value.trim();
            const roundType = document.getElementById('roundType').value;
            
            if (!date || !location || !archerName) {
                alert('Please fill in Archer Name, Date, and Location.');
                    return;
                }
            
            const roundConfig = getRoundConfiguration(roundType);
            
            currentRoundData = {
                id: Date.now(),
                archer: archerName,
                date,
                location,
                type: roundType,
                name: roundConfig.name,
                description: roundConfig.description,
                distance: roundConfig.distance,
                ends: [],
                totalScore: 0, totalHits: 0, totalTens: 0, totalXs: 0,
            };

            const tbody = document.getElementById('scoreTableBody');
            tbody.innerHTML = '';
            
            // For custom rounds, start with 1 end, allow Add End to add more
            let initialEnds = (roundType === 'Custom3' || roundType === 'Custom6') ? 1 : roundConfig.numEnds;
            for (let i = 1; i <= initialEnds; i++) {
                tbody.appendChild(createScoreRow(i));
            }

            updateFinalTotals();
            document.getElementById('scorecard-wrapper').classList.remove('hidden');
            
            if (window.innerWidth <= 768) {
                document.getElementById('scorecard-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            updateScoreCellActivation();
        }
        
        function updateEndTotals(cell) {
            const row = cell.closest('tr');
            if (!row) return;

            const scoreCells = row.querySelectorAll('.score-cell');
            let total = 0, hits = 0, tens = 0, xs = 0;

            scoreCells.forEach(scoreCell => {
                const scoreValue = scoreCell.dataset.score;
                if (scoreValue !== '-') {
                    const score = parseInt(scoreValue);
                    total += score;
                    if (score > 0) hits++;
                    if (score === 10) tens++;
                    if (scoreCell.textContent.toUpperCase() === 'X') xs++;
                }
            });

            row.querySelector('.end-total').textContent = total;
            row.querySelector('.end-hits').textContent = hits;
            row.querySelector('.end-tens').textContent = tens;
            row.querySelector('.end-xs').textContent = xs;
            
            updateFinalTotals();
            updateScoreCellActivation();
        }

        function updateFinalTotals() {
            const allRows = document.querySelectorAll('#scoreTableBody tr');
            let runningTotal = 0, finalScore = 0, totalHits = 0, totalTens = 0, totalXs = 0;

            allRows.forEach(row => {
                const endTotal = parseInt(row.querySelector('.end-total').textContent) || 0;
                finalScore += endTotal;
                totalHits += parseInt(row.querySelector('.end-hits').textContent) || 0;
                totalTens += parseInt(row.querySelector('.end-tens').textContent) || 0;
                totalXs += parseInt(row.querySelector('.end-xs').textContent) || 0;
                runningTotal += endTotal;
                row.querySelector('.running-total').textContent = runningTotal;
            });

            document.getElementById('finalScore').textContent = finalScore;
            document.getElementById('totalHits').textContent = totalHits;
            document.getElementById('totalTens').textContent = totalTens;
            document.getElementById('totalXs').textContent = totalXs;
        }

        // --- DATA PERSISTENCE ---
        function updateCurrentRoundDataFromDOM() {
            if (!currentRoundData) {
                console.error("No active round to update data from.");
                return false;
            }
            const roundConfig = getRoundConfiguration(document.getElementById('roundType').value);
            currentRoundData.archer = document.getElementById('archer-name').value.trim();
            currentRoundData.date = document.getElementById('date').value;
            currentRoundData.location = document.getElementById('location').value.trim();
            currentRoundData.type = document.getElementById('roundType').value;
            currentRoundData.name = roundConfig.name;
            currentRoundData.description = roundConfig.description;
            currentRoundData.distance = roundConfig.distance;
            
            currentRoundData.ends = [];
            document.querySelectorAll('#scoreTableBody tr').forEach(row => {
                const scores = Array.from(row.querySelectorAll('.score-cell')).map(cell => cell.textContent.trim());
                currentRoundData.ends.push({
                    scores: scores,
                    endTotal: parseInt(row.querySelector('.end-total').textContent) || 0,
                    hits: parseInt(row.querySelector('.end-hits').textContent) || 0,
                    tens: parseInt(row.querySelector('.end-tens').textContent) || 0,
                    xs: parseInt(row.querySelector('.end-xs').textContent) || 0,
                });
            });

            currentRoundData.totalScore = parseInt(document.getElementById('finalScore').textContent) || 0;
            currentRoundData.totalHits = parseInt(document.getElementById('totalHits').textContent) || 0;
            currentRoundData.totalTens = parseInt(document.getElementById('totalTens').textContent) || 0;
            currentRoundData.totalXs = parseInt(document.getElementById('totalXs').textContent) || 0;
            
            return true;
        }
        
        function clearRound() {
            if (confirm('Are you sure you want to clear the current scorecard? Unsaved progress will be lost.')) {
                currentRoundData = null;
                document.getElementById('scoreTableBody').innerHTML = '';
                updateFinalTotals();
                document.getElementById('scorecard-wrapper').classList.add('hidden');
            }
        }
        
        function saveRound() {
            if (!currentRoundData) {
                alert('Please start a round before saving.');
                return;
            }
            if (!updateCurrentRoundDataFromDOM()) {
                 alert('Could not gather round data. Please check the console for errors.');
                return;
            }
             if (currentRoundData.totalScore === 0) {
                if(!confirm("You are saving a round with a score of 0. Continue?")){
                    return;
                }
            }
            const existingRoundIndex = savedRounds.findIndex(r => r.id === currentRoundData.id);
            if (existingRoundIndex > -1) {
                savedRounds[existingRoundIndex] = { ...currentRoundData };
            } else {
                savedRounds.push({ ...currentRoundData });
            }
            try {
            localStorage.setItem('archeryScores', JSON.stringify(savedRounds));
                // --- Motivational Feedback ---
                let feedback = '';
                const previousScores = savedRounds
                    .filter(r => r.id !== currentRoundData.id && r.totalScore > 0)
                    .map(r => r.totalScore);
                const newScore = currentRoundData.totalScore;
                if (previousScores.length === 0) {
                    feedback = 'İlk kaydın! Başarılarının devamını dileriz.';
                } else {
                    const best = Math.max(...previousScores);
                    const avg = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
                    if (newScore > best) {
                        feedback = 'Harika! Bu senin şimdiye kadarki en iyi puanın! 🎉';
                    } else if (newScore < avg) {
                        feedback = 'Daha sıkı çalışmaya devam! Her atış bir deneyimdir. 💪';
                    } else {
                        feedback = 'İyi iş! Sonuçların gelişiyor. 👏';
                    }
                }
                alert('Round saved successfully!\n' + feedback);
            clearRound();
            switchView('history');
            } catch (e) {
                console.error("Error saving to localStorage:", e);
                alert("Could not save the round. Your browser's storage might be full.");
            }
        }

        function loadSavedRounds() {
            const roundsJSON = localStorage.getItem('archeryScores');
            if (roundsJSON) {
                try {
                    savedRounds = JSON.parse(roundsJSON);
                } catch(e) {
                    console.error("Could not parse saved rounds:", e);
                    savedRounds = [];
                }
            }
        }

        // --- HISTORY & STATS VIEWS ---
        function loadHistoryView() {
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';
            if (savedRounds.length === 0) {
                historyList.innerHTML = '<li class="p-4 text-center text-gray-500" data-i18n="no_saved_rounds">No saved rounds found.</li>';
                return;
            }
            const sortedRounds = [...savedRounds].sort((a,b) => new Date(b.date) - new Date(a.date));
            sortedRounds.forEach(round => {
                const li = document.createElement('li');
                li.className = 'p-4 hover:bg-gray-50 flex justify-between items-center flex-wrap';
                li.innerHTML = `
                    <div class="flex-grow">
                        <p class="font-semibold">${round.archer || 'N/A'} - ${round.name || round.type}</p>
                        <p class="text-sm text-gray-600">${round.date} at ${round.location || 'N/A'}</p>
                        <p class="text-sm text-gray-500 mt-1">Score: <span class="font-bold">${round.totalScore}</span> | Hits: ${round.totalHits || 0} | 10s: ${round.totalTens || 0} | Xs: ${round.totalXs || 0}</p>
                    </div>
                    <div class="flex-shrink-0 mt-2 sm:mt-0">
                        <button onclick="viewRoundDetails(${round.id})" class="text-blue-500 hover:underline mr-4 text-sm" data-i18n="view">View</button>
                        <button onclick="deleteRound(${round.id})" class="text-red-500 hover:underline text-sm" data-i18n="delete">Delete</button>
                    </div>
                `;
                historyList.appendChild(li);
            });
        }
        
        function viewRoundDetails(roundId) {
            const round = savedRounds.find(r => r.id === roundId);
            if (!round) return;
            document.getElementById('modal-title').textContent = `Details for ${round.name || round.type} on ${round.date}`;
            let endsHtml = '<div class="space-y-2">';
            if (round.ends && round.ends.length > 0) {
            round.ends.forEach((end, index) => {
                    const scores = (end.scores && Array.isArray(end.scores)) ? end.scores.join(', ') : 'N/A';
                    endsHtml += `<div class="p-2 bg-gray-100 rounded"><strong>End ${index + 1}:</strong> ${scores} | <strong>Total:</strong> ${end.endTotal || 0} | <strong>Hits:</strong> ${end.hits || 0}</div>`;
                });
            } else {
                endsHtml += '<p>No end data available.</p>';
            }
            endsHtml += '</div>';
            document.getElementById('modal-content').innerHTML = `
                <p><strong>Archer:</strong> ${round.archer || 'N/A'}</p>
                <p><strong>Round:</strong> ${round.name || round.type}</p>
                <p><strong>Location:</strong> ${round.location || 'N/A'}</p>
                <p class="mt-4 font-bold text-lg"><strong>Final Score: ${round.totalScore}</strong></p>
                <p class="text-sm">Hits: ${round.totalHits || 0} | 10s: ${round.totalTens || 0} | Xs: ${round.totalXs || 0}</p>
                <hr class="my-4">
                <h4 class="text-md font-semibold mb-2">End Scores:</h4>
                ${endsHtml}
            `;
            document.getElementById('round-modal').classList.remove('hidden');
        }

        function deleteRound(roundId) {
            if (confirm('Are you sure you want to delete this round?')) {
                savedRounds = savedRounds.filter(r => r.id !== roundId);
                localStorage.setItem('archeryScores', JSON.stringify(savedRounds));
                loadSavedRounds();
                loadHistoryView();
                // Modal açıksa kapat
                const modal = document.getElementById('round-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            }
        }
        window.deleteRound = deleteRound;
        
        function showStats(period) {
            const now = new Date();
            let filteredRounds = [];

            loadSavedRounds(); 

            if (period === 'daily') {
                const todayStr = new Date().toISOString().slice(0, 10);
                filteredRounds = savedRounds.filter(r => r.date === todayStr);
            } else if (period === 'weekly') {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
                startOfWeek.setHours(0, 0, 0, 0);
                filteredRounds = savedRounds.filter(r => new Date(r.date) >= startOfWeek);
            } else if (period === 'monthly') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                filteredRounds = savedRounds.filter(r => new Date(r.date) >= startOfMonth);
            }

            renderStats(filteredRounds, period);
        }

        function renderStats(rounds, period) {
            const statsContent = document.getElementById('stats-content');
            if (!rounds || rounds.length === 0) {
                statsContent.innerHTML = `<p class="text-center text-gray-500">No rounds shot in this ${period}.</p>`;
                return;
            }

            // Her round type için ayrı istatistik kutuları
            const statsByRoundType = rounds.reduce((acc, round) => {
                const type = round.name || round.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(round);
                return acc;
            }, {});

            let html = '';
            for (const type in statsByRoundType) {
                const typeRounds = statsByRoundType[type];
                const totalRounds = typeRounds.length;
                const totalScore = typeRounds.reduce((sum, r) => sum + (r.totalScore || 0), 0);
                const totalArrows = typeRounds.reduce((sum, r) => sum + (r.totalHits || 0), 0);
                const averageScore = totalRounds > 0 ? (totalScore / totalRounds).toFixed(2) : '0.00';
                const highestScore = Math.max(...typeRounds.map(r => r.totalScore || 0));
                html += `
                    <div class="bg-white shadow-md rounded-lg p-4 mb-6">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">${type}</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div class="bg-blue-100 p-4 rounded-lg">
                        <p class="text-sm text-blue-800 font-semibold">Total Rounds</p>
                        <p class="text-3xl font-bold">${totalRounds}</p>
                    </div>
                     <div class="bg-green-100 p-4 rounded-lg">
                        <p class="text-sm text-green-800 font-semibold">Average Score</p>
                        <p class="text-3xl font-bold">${averageScore}</p>
                    </div>
                     <div class="bg-yellow-100 p-4 rounded-lg">
                        <p class="text-sm text-yellow-800 font-semibold">Highest Score</p>
                        <p class="text-3xl font-bold">${highestScore}</p>
                    </div>
                     <div class="bg-indigo-100 p-4 rounded-lg">
                                <p class="text-sm text-indigo-800 font-semibold">Total Arrows</p>
                                <p class="text-3xl font-bold">${totalArrows}</p>
                    </div>
                </div>
                    </div>
                `;
            }
            statsContent.innerHTML = html;
        }

        // --- SCORE SELECTOR ---
        function showScoreSelector(event) {
            if (event.target.classList.contains('inactive')) return;
            currentTargetCell = event.target;
            const selector = document.getElementById('scoreSelector');
            const rect = currentTargetCell.getBoundingClientRect();
            
            selector.style.top = `${rect.bottom + window.scrollY}px`;
            selector.style.left = `${rect.left + window.scrollX}px`;
            selector.style.display = 'grid';

            setTimeout(() => document.addEventListener('click', hideScoreSelector, { once: true }), 0);
            event.stopPropagation();
        }

        function hideScoreSelector(event) {
            const selector = document.getElementById('scoreSelector');
            if (event && event.target.closest('#scoreSelector')) {
                setTimeout(() => document.addEventListener('click', hideScoreSelector, { once: true }), 0);
                return;
            }
            selector.style.display = 'none';
        }

        function selectScore(score, displayText) {
            if (currentTargetCell) {
                currentTargetCell.textContent = displayText;
                currentTargetCell.dataset.score = score;
                
                const colorClasses = ['score-yellow', 'score-red', 'score-blue', 'score-black', 'score-white', 'score-green'];
                currentTargetCell.classList.remove(...colorClasses);

                if (score >= 9) currentTargetCell.classList.add('score-yellow');
                else if (score >= 7) currentTargetCell.classList.add('score-red');
                else if (score >= 5) currentTargetCell.classList.add('score-blue');
                else if (score >= 3) currentTargetCell.classList.add('score-black');
                else if (score >= 1) currentTargetCell.classList.add('score-white');
                else if (score === 0) currentTargetCell.classList.add('score-green');
                
                updateEndTotals(currentTargetCell);
            }
        }

        // --- END ACTIVATION LOGIC ---
        function updateScoreCellActivation() {
            const rows = Array.from(document.querySelectorAll('#scoreTableBody tr'));
            let firstIncompleteIndex = rows.findIndex(row => {
                return Array.from(row.querySelectorAll('.score-cell')).some(cell => {
                    const s = cell.dataset.score;
                    if ((typeof s === 'string' && s.trim().toUpperCase() === 'M') || s === '-' || s === '' || s === undefined) {
                return true;
                    }
                    return false;
                });
            });
            if (firstIncompleteIndex === -1) firstIncompleteIndex = rows.length - 1;
            rows.forEach((row, idx) => {
                row.querySelectorAll('.score-cell').forEach(cell => {
                    // Eğer bu seri (row) tamamen boşsa ve sırası gelmemişse, silik ve tıklanamaz yap
                    const allEmpty = Array.from(row.querySelectorAll('.score-cell')).every(cell => {
                        const s = cell.dataset.score;
                        if ((typeof s === 'string' && s.trim().toUpperCase() === 'M') || s === '-' || s === '' || s === undefined) {
                            return true;
                        }
                        return false;
                    });
                    if (idx === firstIncompleteIndex) {
                        cell.classList.remove('inactive');
                    } else if (idx > firstIncompleteIndex && allEmpty) {
                        cell.classList.add('inactive');
                    } else {
                        cell.classList.remove('inactive');
                    }
                });
            });
        }

        // --- WEATHER & GPS FUNCTIONS ---
        async function getCurrentLocation() {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by this browser.');
                        return;
                    }
            const locationBtn = document.getElementById('getLocationBtn');
            const originalText = locationBtn.textContent;
            locationBtn.disabled = true;
            locationBtn.textContent = '...';
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                });
                const { latitude, longitude } = position.coords;
                const locationName = await getLocationNameFromCoords(latitude, longitude);
                document.getElementById('location').value = locationName;
                const weatherData = await getWeatherDataFromCoords(latitude, longitude);
                updateWeatherDisplay(weatherData);
                updateDateFromTimezone(weatherData.timezone);
            } catch (error) {
                console.error('Error getting location:', error);
                alert('Could not get location. Please enter it manually.');
            } finally {
                locationBtn.disabled = false;
                locationBtn.textContent = originalText;
            }
        }
        
        async function getWeatherForLocation() {
            const location = document.getElementById('location').value.trim();
            if (!location) {
                alert('Please enter a location first.');
                return;
            }
                const weatherBtn = document.getElementById('getWeatherBtn');
                const originalText = weatherBtn.textContent;
            weatherBtn.textContent = 'Loading...';
                weatherBtn.disabled = true;
            try {
                const coords = await getCoordinatesFromLocation(location);
                const weatherData = await getWeatherDataFromCoords(coords.lat, coords.lon);
                updateWeatherDisplay(weatherData);
                updateDateFromTimezone(weatherData.timezone);
            } catch (error) {
                console.error('Error getting weather for location:', error);
                alert('Could not get weather data for the specified location.');
            } finally {
                weatherBtn.textContent = originalText;
                weatherBtn.disabled = false;
            }
        }
        
        async function getCoordinatesFromLocation(location) {
                const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${WEATHER_API_KEY}`;
                const response = await fetch(url);
            if (!response.ok) throw new Error('Geocoding failed');
            const data = await response.json();
            if (!data || data.length === 0) throw new Error('Location not found');
            return { lat: data[0].lat, lon: data[0].lon };
        }

        async function getLocationNameFromCoords(lat, lon) {
            const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                const data = await response.json();
                if (data && data.length > 0) {
                const loc = data[0];
                return [loc.name, loc.state, loc.country].filter(Boolean).join(', ');
            }
            return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }

        async function getWeatherDataFromCoords(lat, lon) {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Weather data fetch failed');
            const data = await response.json();
            const weatherEmojis = { 'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️', 'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️' };
                    return {
                speed: data.wind.speed.toFixed(1),
                direction: degToCompass(data.wind.deg),
                temperature: Math.round(data.main.temp),
                weather: {
                    name: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1),
                    emoji: weatherEmojis[data.weather[0].main] || '🌤️'
                },
                timezone: data.timezone
            };
        }

        function degToCompass(num) {
            const val = Math.floor((num / 22.5) + 0.5);
            const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
            return arr[(val % 16)];
        }

        function updateWeatherDisplay(weatherData) {
            document.getElementById('windInfo').textContent = `${weatherData.speed} m/s`;
            document.getElementById('windDirection').textContent = weatherData.direction;
            document.getElementById('temperature').textContent = `${weatherData.temperature}°C`;
            document.getElementById('weatherCondition').textContent = `${weatherData.weather.emoji} ${weatherData.weather.name}`;
            document.getElementById('weatherInfo').classList.remove('hidden');
        }

        function updateDateFromTimezone(timezoneOffset) {
            const localTime = new Date(new Date().getTime() + timezoneOffset * 1000);
            document.getElementById('date').value = localTime.toISOString().split('T')[0];
        }

        async function getLocationSuggestions(query) {
                const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${WEATHER_API_KEY}`;
                const response = await fetch(url);
            if (!response.ok) return;
                const data = await response.json();
                showLocationSuggestions(data);
        }
        
        function showLocationSuggestions(suggestions) {
            const suggestionsDiv = document.getElementById('locationSuggestions');
            if (suggestions.length === 0) {
                suggestionsDiv.classList.add('hidden');
                return;
            }
            suggestionsDiv.innerHTML = suggestions.map(s => {
                const displayName = [s.name, s.state, s.country].filter(Boolean).join(', ');
                return `<div class="suggestion-item px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm">${displayName}</div>`;
            }).join('');
            suggestionsDiv.classList.remove('hidden');
            
            suggestionsDiv.querySelectorAll('.suggestion-item').forEach((item, index) => {
                item.addEventListener('click', function() {
                    document.getElementById('location').value = item.textContent;
                    suggestionsDiv.classList.add('hidden');
                });
            });
        }
        
        function hideLocationSuggestions() {
            document.getElementById('locationSuggestions').classList.add('hidden');
        }

        // --- I18N SYSTEM ---
        function applyTranslations(dict) {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = dict[key];
                    } else if (el.tagName === 'OPTION') {
                        el.textContent = dict[key];
                    } else {
                        el.textContent = dict[key];
                    }
                }
            });
        }
           function loadLanguage() {
       let lang = localStorage.getItem('archeryAppLang') || 'en';
       const langSelect = document.getElementById('lang-select');
       if (langSelect) langSelect.value = lang;
       fetch(`lang_${lang}.json`)
           .then(r => r.json())
           .then(dict => {
               applyTranslations(dict);
               document.body.style.display = '';
           })
           .catch(() => {
               document.body.style.display = '';
           });
   }
        document.addEventListener('DOMContentLoaded', loadLanguage);

        // Dil seçici değiştiğinde dili kaydet ve yükle
        document.addEventListener('DOMContentLoaded', function() {
            const langSelect = document.getElementById('lang-select');
            if (langSelect) {
                langSelect.addEventListener('change', function() {
                    localStorage.setItem('archeryAppLang', langSelect.value);
                    loadLanguage();
                });
            }
        });

        // --- INITIALIZATION ---
        function setupEventListeners() {
            document.getElementById('startRoundBtn').addEventListener('click', startNewRound);
            const addEndBtn = document.getElementById('addEndBtn');
            addEndBtn.addEventListener('click', () => {
                const roundType = document.getElementById('roundType').value;
                if (roundType !== 'Custom3' && roundType !== 'Custom6') return;
                const tbody = document.getElementById('scoreTableBody');
                tbody.appendChild(createScoreRow(tbody.children.length + 1));
                updateScoreCellActivation();
            });
            document.getElementById('saveRoundBtn').addEventListener('click', saveRound);
            document.getElementById('clearRoundBtn').addEventListener('click', clearRound);
            document.getElementById('close-modal-btn').addEventListener('click', () => document.getElementById('round-modal').classList.add('hidden'));

            document.getElementById('scoreTableBody').addEventListener('click', function(event) {
                if (event.target.classList.contains('score-cell')) {
                    showScoreSelector(event);
                }
            });
            
            document.getElementById('scoreSelector').addEventListener('click', function(event){
                if(event.target.classList.contains('score-option')){
                    selectScore(event.target.dataset.score, event.target.dataset.display);
                    hideScoreSelector();
                }
            });
            
            document.getElementById('getLocationBtn').addEventListener('click', getCurrentLocation);
            document.getElementById('getWeatherBtn').addEventListener('click', getWeatherForLocation);

            const locationInput = document.getElementById('location');
            let debounceTimer;
            locationInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (this.value.length >= 2) {
                        getLocationSuggestions(this.value);
            } else {
                        hideLocationSuggestions();
                    }
                }, 300);
            });
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#locationSuggestions')) {
                    hideLocationSuggestions();
                }
            });

            function updateAddEndBtnVisibility() {
                const val = document.getElementById('roundType').value;
                if (val === 'Custom3' || val === 'Custom6') {
                    addEndBtn.classList.remove('hidden');
            } else {
                    addEndBtn.classList.add('hidden');
                }
            }
            updateAddEndBtnVisibility();
            document.getElementById('roundType').addEventListener('change', updateAddEndBtnVisibility);
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            loadSavedRounds();
            setupEventListeners();
            switchView('scorecard');
            updateScoreCellActivation();
            // Ensure Add End button visibility is correct on load
            if (typeof updateAddEndBtnVisibility === 'function') updateAddEndBtnVisibility();
        });