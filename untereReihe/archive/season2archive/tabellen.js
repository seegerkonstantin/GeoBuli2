class LeagueTable {
    constructor(sheetID, name, sheetName, dataRange, matchRange, keyIndex) {
        this.sheetID = sheetID;
        this.name = name;
        this.sheetName = sheetName;
        this.dataRange = dataRange;
        this.matchRange = matchRange;
        this.cacheKeyTable = keyIndex + "_table";
        this.cacheKeyMatches = keyIndex + "_match";
        this.cacheKeyRescheduled = keyIndex + "_rescheduled";
        this.rescheduleRanges = [];
        this.cacheDuration =  1000 * 60 * 5; // 5 Minuten Cache-Dauer
    }


    getURL(range) {
        return `https://docs.google.com/spreadsheets/d/${this.sheetID}/gviz/tq?sheet=${this.sheetName}&range=${range}`;
    }

    fetchAndRenderData(url, cacheKey, renderFunction) {
        fetch(url)
            .then(res => res.text())
            .then(rep => {
                let jsonData = JSON.parse(rep.substr(47).slice(0, -2));

                // Speichere die Daten im Cache (localStorage)
                let cacheData = {
                    data: jsonData,
                    expiry: Date.now() + this.cacheDuration
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));

                // Render die Tabelle mit den Daten
                renderFunction(jsonData);
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der Daten: ', error);
            });
    }

    isCacheValid(cacheKey) {
        let cached = JSON.parse(localStorage.getItem(cacheKey));
        if (!cached) return false;
        return Date.now() < cached.expiry;
    }

    renderLeagueTable(jsonData) {
        let rows = jsonData.table.rows;
        let tableBody = document.querySelector('.league-table tbody');
        tableBody.innerHTML = ''; // Platzhalter löschen

        rows.forEach(row => {
            let newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${row.c[0].v}</td>
                <td>${row.c[1].v}</td>
                <td>${row.c[7].v}</td>
                <td>${row.c[3].v}</td>
                <td>${row.c[4].v}</td>
                <td>${row.c[5].v}</td>
                <td>${row.c[6].v}</td>
                <td>${row.c[8].v}</td>
                <td>${parseFloat(row.c[9]?.v).toFixed(2)}</td>
            `;
            tableBody.appendChild(newRow);
        });

        // Füge der Tabelle den roten Hintergrund für die letzten drei hinzu
        let allRows = tableBody.querySelectorAll('tr');
        let lastThreeRows = [...allRows].slice(-3);

        let firstFourRows = [...allRows].slice(0, 4);
        let firstThreeRows = [...allRows].slice(0, 3);
        
        //unterschiedliche Färbung der Tabellenplätze

        if(this.name == 'liga1'){
            firstFourRows.forEach(row => row.classList.add('final-four'));
        }

        if (this.name == 'liga1' || this.name == 'liga2'){
            lastThreeRows.forEach(row => row.classList.add('last-three'));

            if (allRows[allRows.length - 4]) {
                allRows[allRows.length - 4].classList.add('relegation-bottom');
            }
        }

        if (this.name == 'liga2' || this.name == 'liga3'){
            firstThreeRows.forEach(row => row.classList.add('first-three'));

            if (allRows[3]) {
                allRows[3].classList.add('relegation');
            }
        }
    }

    renderMatchTable(jsonData) {
        let rows = jsonData.table.rows;
        let tableBody = document.querySelector('.match-table:first-of-type tbody');
        tableBody.innerHTML = ''; // Platzhalter löschen

        rows.forEach(row => {
            let newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${row.c[1]?.v || '-'}</td>
                <td>${row.c[2]?.v || '-'}</td>
                <td>${row.c[3]?.v || '-'}</td>
                <td>${row.c[4]?.v || '-'}</td>
            `;
            tableBody.appendChild(newRow);
        });
    }
    
    loadTableData() {
        if (this.isCacheValid(this.cacheKeyTable)) {
            let cachedData = JSON.parse(localStorage.getItem(this.cacheKeyTable)).data;
            this.renderLeagueTable(cachedData);
        } else {
            this.fetchAndRenderData(this.getURL(this.dataRange), this.cacheKeyTable, this.renderLeagueTable.bind(this));
        }
    }

    loadMatchData() {
        if (this.isCacheValid(this.cacheKeyMatches)) {
            let cachedData = JSON.parse(localStorage.getItem(this.cacheKeyMatches)).data;
            console.log(cachedData)
            this.renderMatchTable(cachedData);
        } else {
            // Verwende die dynamisch berechnete Match-Range
            console.log(this.matchRange + "neuladung")

            this.fetchAndRenderData(this.getURL(this.matchRange), this.cacheKeyMatches, this.renderMatchTable.bind(this));
        }
    }
    

    updateSpielwoche() {
        const spielwoche = getSpielwoche();
        if (!spielwoche) return;
    
        const wocheNummer = spielwoche.week;
        const wocheStart = formatDate(spielwoche.start);
        const wocheEnde = formatDate(spielwoche.end);

        //arrays mit anzahl der spiele pro spielwoche
        const liga12Games = [3, 3, 3, 2, 2];
        const liga3Games = [3, 3, 3, 3, 3];
        
        // arrays mit jeweiligen offsets für jede spielwoche
        const liga12Offsets = this.calculateOffsets(liga12Games);
        const liga3Offsets = this.calculateOffsets(liga3Games);
    
        //überschrift
        const headerElement = document.querySelector(".week");
        const datumSubHeader = document.querySelector(".date");
    
        if (headerElement) {
            headerElement.textContent = `Spielwoche ${wocheNummer}`;
        }
        if (datumSubHeader) {
            datumSubHeader.textContent = `${wocheStart} - ${wocheEnde}`;
        }
    
        let startRow = 0;
        let endRow = 0;
        // Dynamische Match-Range basierend auf der Liga
        if(this.name == "liga1" || this.name == "liga2"){
            startRow = liga12Offsets[wocheNummer - 1];// Offset für die aktuelle Woche
            endRow = liga12Games[wocheNummer - 1] * 7 + startRow - 1;
        } else {
            startRow = liga3Offsets[wocheNummer - 1];// Offset für die aktuelle Woche
            endRow = liga3Games[wocheNummer - 1] * 7 + startRow - 1;
        } 
        this.matchRange = `B${startRow}:E${endRow}`;
    }
    

    //hilfsfunktion
    calculateOffsets(gamesPerWeek, spieleProTag = 7) {
        let offsets = [];
        let currentOffset = 3;
    
        for (let i = 0; i < gamesPerWeek.length; i++) {
            offsets.push(currentOffset); // Offset für die aktuelle Woche speichern
            currentOffset += gamesPerWeek[i] * spieleProTag; // Nächsten Offset berechnen
        }
    
        return offsets;
    }   
    

    initialize(){
        this.updateSpielwoche();
        this.loadMatchData();
        this.loadTableData();
    }
}

// Hilfsfunktionen (z. B. für die Spielwochenberechnung)
function getSpielwoche() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Setzt die Zeit auf Mitternacht
    const spielwochen = [
        { start: new Date("2024-11-11"), end: new Date("2024-11-24"), week: 1 },
        { start: new Date("2024-11-25"), end: new Date("2024-12-08"), week: 2 },
        { start: new Date("2024-12-09"), end: new Date("2025-01-05"), week: 3 },
        { start: new Date("2025-01-06"), end: new Date("2025-01-19"), week: 4 },
        { start: new Date("2025-01-20"), end: new Date("2025-02-22"), week: 5 }
    ];

    // Setzt ebenfalls die Zeit aller Start- und Enddaten auf Mitternacht
    spielwochen.forEach(sw => {
        sw.start.setHours(0, 0, 0, 0);
        sw.end.setHours(23, 59, 59, 0);
    });

    // Rückgabe der passenden Spielwoche
    return spielwochen.find(sw => today >= sw.start && today <= sw.end) || null;
}


function formatDate(date) {
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}

