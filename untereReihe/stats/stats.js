class StatsTable {
  constructor(sheetID, sheetName, dataRange, matchRange, keyIndex) {
    this.sheetID = sheetID;
    this.sheetName = sheetName;
    this.dataRange = dataRange;
    this.matchRange = matchRange;
    this.cacheKeyTable = keyIndex + "_table_currentSeason";
    this.cacheDuration = 1 * 60 * 5 * 1000; // 5 Minuten Cache-Dauer

    // Spalten im Google Sheet
    this.statsSheetColLigaNumber = 0; // Spalte A
    this.statsSheetColDiscordName = 1; // Spalte B
    this.statsSheetColGGName = 2;
    this.statsSheetColGGLink = 3;
    this.statsSheetColSubdivision = 3 + 1; // usw.
    this.statsSheetColLeagueParticipations = 4 + 1;
    this.statsSheetColPB = 5 + 1;
    this.statsSheetColWordsOfWisdom = 6 + 1;
    this.statsSheetColPlacement = 7 + 1;
    this.statsSheetColPoints = 8 + 1;
    this.statsSheetCol5ks = 9 + 1;
    this.statsSheetCol4800 = 10 + 1;
    this.statsSheetColExt = 11 + 1;
    this.statsSheetColYellowCards = 12 + 1;
    this.statsSheetColMPlayed = 13 + 1;
    this.statsSheetColMWon = 14 + 1;
    this.statsSheetColMHealth = 15 + 1;
    this.statsSheetColNMPlayed = 16 + 1;
    this.statsSheetColNMWon = 17 + 1;
    this.statsSheetColNMHealth = 18 + 1;
    this.statsSheetColNMPZPlayed = 19 + 1;
    this.statsSheetColNMPZWon = 20 + 1;
    this.statsSheetColNMPZHealth = 21 + 1;
    this.statsSheetColDACHPlayed = 22 + 1;
    this.statsSheetColDACHWon = 23 + 1;
    this.statsSheetColDACHHealth = 24 + 1;
    this.statsSheetColFavMode = 6 + 1;
    this.sheetData;
  }

  getURL(range) {
    return `https://docs.google.com/spreadsheets/d/${this.sheetID}/gviz/tq?sheet=${this.sheetName}&range=${range}`;
  }

  fetchAndRenderData(url, cacheKey, renderFunction) {
    fetch(url)
      .then((res) => res.text())
      .then((rep) => {
        let jsonData = JSON.parse(rep.substr(47).slice(0, -2));

        // Speichere die Daten im Cache (localStorage)
        let cacheData = {
          data: jsonData,
          expiry: Date.now() + this.cacheDuration,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        // Rendere die Tabelle mit den Daten
        renderFunction(jsonData);
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Daten: ", error);
      });
  }

  isCacheValid(cacheKey) {
    let cached = JSON.parse(localStorage.getItem(cacheKey));
    if (!cached) return false;
    return Date.now() < cached.expiry;
  }

  renderStatsTable(jsonData) {
    let rows = jsonData.table.rows;
    this.sheetData = rows;
    let tableBody;
    let tableId = "#table-body-";
    let ligaCounter = "0";
    let ligaRows = [];

    rows.forEach((row) => {
      if (row.c[this.statsSheetColLigaNumber]) {
        // Spalte A enthält "Liga X" in der ersten Zeile jeder Liga
        // sortiere die für diese Liga gesammelten Zeilen
        ligaRows.sort(
          (a, b) =>
            a.children[0].childNodes[0].nodeValue.trim() -
            b.children[0].childNodes[0].nodeValue.trim(),
        );
        // füge die für diese Liga gesammelten Zeilen ein
        ligaRows.forEach((ligaRow) => {
          tableBody?.appendChild(ligaRow);
        });

        ligaCounter++;
        tableBody = document.querySelector(tableId + ligaCounter.toString());
        if (tableBody) {
          tableBody.innerHTML = ""; // Platzhalter löschen
        }

        ligaRows = [];
      }

      if (row.c[this.statsSheetColDiscordName]) {
        let newRow = document.createElement("tr");
        let playerSubdivision =
          row.c[this.statsSheetColSubdivision]?.v || "base";
        let playerSubdivisionIcon = getPlayerSubdivisionIcon(playerSubdivision);
        newRow.innerHTML = `
              <td>${row.c[this.statsSheetColPlacement]?.v || " "}</td>
              <td style="text-align: right">${
                row.c[this.statsSheetColDiscordName].v
              }</td>
              <td style="text-align: left">${playerSubdivisionIcon} ${
                row.c[this.statsSheetColGGName].v
              }</td>
              <td>${(
                Math.round(row.c[this.statsSheetColPoints]?.v * 100) / 100
              ).toFixed(2)}</td>
          `;

        newRow.classList.add("hoverable");
        newRow.addEventListener("click", () => {
          this.openModal(row);
        });
        ligaRows.push(newRow);
      }
    });
    // sortiere die für diese Liga gesammelten Zeilen
    ligaRows.sort(
      (a, b) =>
        a.children[0].childNodes[0].nodeValue.trim() -
        b.children[0].childNodes[0].nodeValue.trim(),
    );
    // füge die für diese Liga gesammelten Zeilen ein
    ligaRows.forEach((ligaRow) => {
      tableBody?.appendChild(ligaRow);
    });

    // Füge der Tabelle den roten Hintergrund für die letzten drei hinzu
    // TODO: für mehrere Tabellen auf einer Seite, css befindet sich noch in liga1.css
    /*let allRows = tableBody.querySelectorAll("tr");
    let lastThreeRows = [...allRows].slice(-3);

    let firstFourRows = [...allRows].slice(0, 4);
    let firstThreeRows = [...allRows].slice(0, 3);

    // unterschiedliche Färbung der Tabellenplätze
    if (this.name == "liga1") {
      firstFourRows.forEach((row) => row.classList.add("final-four"));
    }

    if (this.name == "liga1" || this.name == "liga2") {
      lastThreeRows.forEach((row) => row.classList.add("last-three"));

      if (allRows[allRows.length - 4]) {
        allRows[allRows.length - 4].classList.add("relegation-bottom");
      }
    }

    if (this.name == "liga2" || this.name == "liga3") {
      firstThreeRows.forEach((row) => row.classList.add("first-three"));

      if (allRows[3]) {
        allRows[3].classList.add("relegation");
      }
    }*/
  }

  openModal(sheetRow) {
    const modal = document.getElementById("statsModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalDetails = document.getElementById("modalDetails");
    const getValue = (column, fallback = "-") => sheetRow.c[column]?.v ?? fallback;
    const getNumber = (column) => Number(sheetRow.c[column]?.v) || 0;
    const playerName = getValue(this.statsSheetColGGName);
    const region = getValue(this.statsSheetColSubdivision, "base");
    const profileLink = getValue(this.statsSheetColGGLink, "#");
    const points = getNumber(this.statsSheetColPoints);
    const statCard = (label, value) => `
      <div class="stats-stat">
        <span class="stats-stat-label">${label}</span>
        <strong class="stats-stat-value">${value}</strong>
      </div>
    `;
    const duelCard = (label, playedColumn, wonColumn, healthColumn) => {
      const played = getNumber(playedColumn);
      const won = getNumber(wonColumn);
      const lost = Math.max(played - won, 0);
      const health = getValue(healthColumn, "0");

      return `
        <div class="stats-duel-card">
          <span class="stats-stat-label">${label}</span>
          <strong class="stats-stat-value">${won}-${lost}</strong>
          <span class="stats-stat-sub">${played} Spiele &middot; ${health} Health</span>
        </div>
      `;
    };

    modalTitle.innerHTML = `${getPlayerSubdivisionIcon(region)} ${playerName}`;
    modalDetails.innerHTML = `
      <div class="stats-profile">
        <div>
          <span class="stats-eyebrow">Spielerprofil</span>
          <div class="stats-player-name">${playerName}</div>
          <div class="stats-player-meta">Discord: ${getValue(
            this.statsSheetColDiscordName,
          )} &middot ${region === "base" ? "-" : region}</div>
        </div>
        <a class="stats-profile-link" href="${profileLink}" target="_blank" rel="noopener">GeoGuessr Profil</a>
      </div>

      <section class="stats-section">
        <h3>Saison</h3>
        <div class="stats-grid">
          ${statCard("Platzierung", getValue(this.statsSheetColPlacement))}
          ${statCard("Punkte", Math.round(points * 100) / 100)}
          ${statCard("5ks", getValue(this.statsSheetCol5ks, "0"))}
          ${statCard("4800+", getValue(this.statsSheetCol4800, "0"))}
          ${statCard("Extensions", getValue(this.statsSheetColExt, "0"))}
          ${statCard("Gelbe Karten", getValue(this.statsSheetColYellowCards, "0"))}
        </div>
      </section>

      <section class="stats-section">
        <h3>Historie</h3>
        <div class="stats-grid compact">
          ${statCard("Saisonteilnahmen", getValue(this.statsSheetColLeagueParticipations))}
          ${statCard("Beste Platzierung", getValue(this.statsSheetColPB))}
          ${statCard("Lieblingsmodus", getValue(this.statsSheetColFavMode))}
        </div>
      </section>

      <section class="stats-section">
        <h3>Duelle</h3>
        <div class="stats-duel-grid">
          ${duelCard("Moving", this.statsSheetColMPlayed, this.statsSheetColMWon, this.statsSheetColMHealth)}
          ${duelCard("NM", this.statsSheetColNMPlayed, this.statsSheetColNMWon, this.statsSheetColNMHealth)}
          ${duelCard("NMPZ", this.statsSheetColNMPZPlayed, this.statsSheetColNMPZWon, this.statsSheetColNMPZHealth)}
          ${duelCard("DACH", this.statsSheetColDACHPlayed, this.statsSheetColDACHWon, this.statsSheetColDACHHealth)}
        </div>
      </section>
    `;
    modal.style.display = "flex";
  }

  loadTableData() {
    if (this.isCacheValid(this.cacheKeyTable)) {
      // lade die Daten aus localStorage (Cache)
      let cachedData = JSON.parse(
        localStorage.getItem(this.cacheKeyTable),
      ).data;
      this.renderStatsTable(cachedData);
    } else {
      // Lade die Daten aus dem Google Sheet
      this.fetchAndRenderData(
        this.getURL(this.dataRange),
        this.cacheKeyTable,
        this.renderStatsTable.bind(this),
      );
    }
  }

  initialize() {
    this.loadTableData();
  }
}

function getPlayerSubdivisionIcon(playerSubdivision) {
  return `<img src="./../../img/herzen/${playerSubdivision}.png" alt="${playerSubdivision}" style="height: 1em; vertical-align: middle;" />`;
}

function fetchAndRenderTable(sheetID, sheetName, dataRange, tableID) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetName}&range=${dataRange}`;

  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      let jsonData = JSON.parse(data.substr(47).slice(0, -2));
      let rows = jsonData.table.rows;
      let tableBody = document.querySelector(`#${tableID} tbody`);

      if (!tableBody) {
        console.error(`Tabelle mit ID '${tableID}' nicht gefunden.`);
        return;
      }

      tableBody.innerHTML = "";
      rows.forEach((row) => {
        let newRow = document.createElement("tr");
        newRow.innerHTML = row.c
          .map((cell) => {
            let value = cell?.v || "" || "-";

            // Prüfen, ob der Wert ein Datum-Objekt ist
            if (cell?.f && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(cell.f)) {
              value = cell.f; // Der formatierte Wert ist bereits im gewünschten Format
            }

            return `<td>${value}</td>`;
          })
          .join("");
        tableBody.appendChild(newRow);
      });
    })
    .catch((error) => console.error("Fehler beim Abrufen der Tabelle:", error));
}

document.addEventListener("DOMContentLoaded", function () {
  // Event-Listener für das Schließen des Modals
  const modal = document.getElementById("statsModal");
  const closeModalButton = modal.querySelector(".close");
  closeModalButton.addEventListener("click", function () {
    modal.style.display = "none"; // Modal ausblenden
  });

  // Optional: Modal schließen, wenn außerhalb des Inhalts geklickt wird
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none"; // Modal ausblenden
    }
  });
});
