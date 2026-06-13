(function () {
    function Spielplaene(sheetID, spreadsheetName, totalDays, cacheKeyPrefix) {
        this.sheetID = sheetID;
        this.spreadsheetName = spreadsheetName;
        this.totalDays = totalDays;
        this.cacheKeyPrefix = cacheKeyPrefix;
        this.currentDay = 1; // Startet mit dem ersten Spieltag
        this.cacheDuration = 5 * 60 * 1000; // Cache für 5 Minuten
    }

    Spielplaene.prototype.initialize = function () {
        const _this = this;
    
        // Buttons verknüpfen
        document.querySelector('.arrow-left').addEventListener('click', function () {
            _this.prevSlide();
        });
    
        document.querySelector('.arrow-right').addEventListener('click', function () {
            _this.nextSlide();
        });
    
        // Event-Listener für das Schließen des Modals
        const modal = document.getElementById('gameModal');
        const closeModalButton = modal.querySelector('.close');
        closeModalButton.addEventListener('click', function () {
            modal.style.display = 'none'; // Modal ausblenden
        });
    
        // Optional: Modal schließen, wenn außerhalb des Inhalts geklickt wird
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                modal.style.display = 'none'; // Modal ausblenden
            }
        });
    
        // Lade die Daten des aktuellen Spieltags
        this.loadMatchData(this.currentDay);
    };
    

    // Modal-Handling
    Spielplaene.prototype.openModal = function (matchData) {
        const modal = document.getElementById('gameModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDetails = document.getElementById('modalDetails');

        modalTitle.textContent = `${matchData.blau} vs ${matchData.rot}`;
        modalDetails.innerHTML = `
            <strong>Match ID:</strong> ${matchData.id}<br>
            <strong>Ergebnis:</strong> ${matchData.ergebnis || 'Noch nicht verfügbar'}
        `;

        const mapsContainer = document.createElement('div');
        mapsContainer.id = 'maps-container';
        mapsContainer.style.marginTop = '20px';

        if (matchData.maps && matchData.maps.length > 0) {
            const maps = matchData.maps;
            const rows = [[], [], []];

            for (let i = 0; i < maps.length; i++) {
                if (i < 2) rows[0].push(maps[i]);
                else if (i < 5) rows[1].push(maps[i]);
                else rows[2].push(maps[i]);
            }

            rows.forEach(row => {
                if (row.length > 0) {
                    const rowDiv = document.createElement('div');
                    rowDiv.className = 'maps-row';
                    rowDiv.style.display = 'flex';
                    rowDiv.style.justifyContent = 'space-around';
                    rowDiv.style.marginBottom = '10px';

                    row.forEach(mapInfo => {
                        const [mapName, winner, moveType, link] = mapInfo;

                        const mapBox = document.createElement('a');
                        mapBox.href = link;
                        mapBox.target = '_blank';
                        mapBox.textContent = mapName;
                        mapBox.style.padding = '10px';
                        mapBox.style.border = '2px solid';
                        mapBox.style.borderRadius = '5px';
                        mapBox.style.backgroundColor = '#f9f9f9';
                        mapBox.style.textDecoration = 'none';
                        mapBox.style.color = '#333';
                        mapBox.style.display = 'inline-block';
                        mapBox.style.minWidth = '120px';
                        mapBox.style.textAlign = 'center';

                        if (winner === 'blue') {
                            mapBox.style.borderColor = 'blue';
                        } else if (winner === 'red') {
                            mapBox.style.borderColor = 'red';
                        }

                        rowDiv.appendChild(mapBox);
                    });

                    mapsContainer.appendChild(rowDiv);
                }
            });
        } else {
            mapsContainer.innerHTML = '<em>Keine Maps verfügbar</em>';
        }

        modalDetails.appendChild(mapsContainer);
        modal.style.display = 'flex';
    };

    Spielplaene.prototype.renderMatchTable = function (jsonData) {
        const rows = jsonData.table.rows;
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';

        const spieltagCell = document.createElement('td');
        spieltagCell.setAttribute('rowspan', rows.length);
        spieltagCell.textContent = `Spieltag ${this.currentDay}`;
        spieltagCell.style.textAlign = 'center';
        spieltagCell.style.fontWeight = 'bold';
        spieltagCell.style.verticalAlign = 'middle';

        const firstRow = document.createElement('tr');
        firstRow.appendChild(spieltagCell);

        firstRow.innerHTML += `
            <td>${rows[0].c[0]?.v || '-'}</td>
            <td>${rows[0].c[1]?.v || '-'}</td>
            <td>${rows[0].c[2]?.v || '-'}</td>
            <td>${rows[0].c[3]?.v || '-'}</td>
        `;

        firstRow.addEventListener('click', () => {
            this.openModal({
                blau: rows[0].c[0]?.v || 'N/A',
                rot: rows[0].c[1]?.v || 'N/A',
                id: rows[0].c[2]?.v || 'N/A',
                ergebnis: rows[0].c[3]?.v || 'N/A',
                maps: JSON.parse(rows[0].c[11]?.v || '[]')
            });
        });

        tableBody.appendChild(firstRow);

        for (let i = 1; i < rows.length; i++) {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${rows[i].c[0]?.v || '-'}</td>
                <td>${rows[i].c[1]?.v || '-'}</td>
                <td>${rows[i].c[2]?.v || '-'}</td>
                <td>${rows[i].c[3]?.v || '-'}</td>
            `;

            newRow.addEventListener('click', () => {
                this.openModal({
                    blau: rows[i].c[0]?.v || 'N/A',
                    rot: rows[i].c[1]?.v || 'N/A',
                    id: rows[i].c[2]?.v || 'N/A',
                    ergebnis: rows[i].c[3]?.v || 'N/A',
                    maps: JSON.parse(rows[i].c[11]?.v || '[]')
                });
            });

            tableBody.appendChild(newRow);
        }
    };

    Spielplaene.prototype.loadMatchData = function (day) {
        const dataRangeDay = `B${(day - 1) * 7 + 3}:M${(day - 1) * 7 + 6 + 3}`;
        const URL = `https://docs.google.com/spreadsheets/d/${this.sheetID}/gviz/tq?sheet=${this.spreadsheetName}&range=${dataRangeDay}`;
        const cacheKey = `${this.cacheKeyPrefix}_day_${day}`;

        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const cachedData = JSON.parse(cached);
            if (Date.now() < cachedData.expiry) {
                this.renderMatchTable(cachedData.data);
                return;
            }
        }

        fetch(URL)
            .then(res => res.text())
            .then(rep => {
                const jsonData = JSON.parse(rep.substr(47).slice(0, -2));
                const cacheData = { data: jsonData, expiry: Date.now() + this.cacheDuration };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                this.renderMatchTable(jsonData);
            })
            .catch(error => console.error('Fehler beim Abrufen der Daten: ', error));
    };

    Spielplaene.prototype.prevSlide = function () {
        this.currentDay = this.currentDay - 1 < 1 ? this.totalDays : this.currentDay - 1;
        this.loadMatchData(this.currentDay);
    };

    Spielplaene.prototype.nextSlide = function () {
        this.currentDay = this.currentDay + 1 > this.totalDays ? 1 : this.currentDay + 1;
        this.loadMatchData(this.currentDay);
    };

    window.Spielplaene = Spielplaene; // Globale Registrierung
})();
