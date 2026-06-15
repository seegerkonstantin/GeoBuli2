function formatMatchType(matchtype) {
  if (matchtype == "move") return "Moving";
  if (matchtype == "ppd") return "Pinpointing Duel";
  if (matchtype == "no move") return "NM";
  return "NMPZ";
}

function getPlayedMatchStats(matchData) {
  const isOpenValue = (value) =>
    value === undefined || value === null || value === "" || value === "N/A" || value === "-";
  const punkteBlauValue = Number(matchData.punkteBlau);
  const punkteRotValue = Number(matchData.punkteRot);
  const healthBlauValue = Number(matchData.healthBlau);
  const healthRotValue = Number(matchData.healthRot);
  const hasPoints =
    Number.isFinite(punkteBlauValue) &&
    Number.isFinite(punkteRotValue) &&
    !(punkteBlauValue === 0 && punkteRotValue === 0);
  const hasHealth = Number.isFinite(healthBlauValue) && Number.isFinite(healthRotValue);
  const played = !isOpenValue(matchData.ergebnis);
  let punkteText = "Offen";
  let lebenText = "Offen";

  if (hasPoints) {
    let punkteBlau = punkteBlauValue;
    let punkteRot = punkteRotValue;

    if (punkteBlau > punkteRot) {
      punkteBlau += 1;
    } else if (punkteRot > punkteBlau) {
      punkteRot += 1;
    }

    punkteText = `${punkteBlau.toFixed(2)} : ${punkteRot.toFixed(2)}`;
  }

  if (hasHealth) {
    lebenText = `${healthBlauValue} : ${healthRotValue}`;
  }

  return {
    played,
    ergebnisText: played ? matchData.ergebnis : "Noch offen",
    punkteText,
    lebenText,
  };
}

function renderMatchMaps(maps) {
  if (!maps || maps.length === 0) {
    return `
      <div id="maps-container" class="maps-container empty">
        <div class="game-empty-state">Noch keine Mapdetails verfügbar.</div>
      </div>
    `;
  }



  /*return `
    <div id="maps-container" class="maps-container">
      ${maps
        .map(([mapName, winner, matchtype, health, link], index) => {
          const winnerClass =
            winner === "blue" ? "blue-win" : winner === "red" ? "red-win" : "";
          const mapCardContent = `
            <span class="map-number">Map ${index + 1}</span>
            <strong>${mapName}</strong>
            <span class="map-meta">${formatMatchType(matchtype)}</span>
          `;

          return link
            ? `<a class="map-card ${winnerClass}" href="${link}" target="_blank" rel="noopener">${mapCardContent}</a>`
            : `<div class="map-card ${winnerClass}">${mapCardContent}</div>`;
        })
        .join("")}
    </div>
  `;
}*/
const rows = [maps.slice(0, 2), maps.slice(2, 5), maps.slice(5)];
  const renderMapCard = ([mapName, winner, matchtype, health, link], index) => {
    const winnerClass =
      winner === "blue" ? "blue-win" : winner === "red" ? "red-win" : "";
    const mapCardContent = `
      <span class="map-number">Map ${index + 1}</span>
      <strong>${mapName}</strong>
      <span class="map-meta">${formatMatchType(matchtype)}${
      health ? ` · ${health} Health` : ""
    }</span>
    `;

    return link
      ? `<a class="map-card ${winnerClass}" href="${link}" target="_blank" rel="noopener">${mapCardContent}</a>`
      : `<div class="map-card ${winnerClass}">${mapCardContent}</div>`;
  };

  return `
    <div id="maps-container" class="maps-container">
      ${rows
        .map((row, rowIndex) => {
          const previousMaps = rows
            .slice(0, rowIndex)
            .reduce((total, previousRow) => total + previousRow.length, 0);

          return row.length
            ? `<div class="maps-row maps-row-${row.length}">${row
                .map((mapInfo, mapIndex) =>
                  renderMapCard(mapInfo, previousMaps + mapIndex)
                )
                .join("")}</div>`
            : "";
        })
        .join("")}
    </div>
  `;
}

function renderGameModal(matchData) {
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDetails = document.getElementById("modalDetails");
  const stats = getPlayedMatchStats(matchData);
  const statusClass = stats.played ? "played" : "open";

 
  modalDetails.innerHTML = `
    <div class="game-profile ${statusClass}">
      <div>
        <span class="stats-eyebrow">${stats.played ? "Gespielt" : "Ausstehend"}</span>
        <div class="game-player-line">
          <span class="blue-player">${matchData.blau}</span>
          <span>vs</span>
          <span class="red-player">${matchData.rot}</span>
        </div>
      </div>
      <span class="game-status">${stats.ergebnisText}</span>
    </div>

    <section class="stats-section">
      <h3>Match</h3>
      <div class="game-stat-grid ${stats.played ? "" : "open-match"}">
        <div class="stats-stat">
          <span class="stats-stat-label">Match ID</span>
          <strong class="stats-stat-value">${matchData.id || "N/A"}</strong>
        </div>
        <div class="stats-stat">
          <span class="stats-stat-label">Punkte</span>
          <strong class="stats-stat-value">${stats.punkteText}</strong>
        </div>
        <div class="stats-stat">
          <span class="stats-stat-label">Leben</span>
          <strong class="stats-stat-value">${stats.lebenText}</strong>
        </div>
      </div>
    </section>

    <section class="stats-section">
      <h3>Maps</h3>
      ${renderMatchMaps(matchData.maps)}
    </section>
  `;
  modal.style.display = "flex";
}

class LeagueTable {
  constructor(
    sheetID,
    name,
    sheetName,
    dataRange,
    matchRange,
    keyIndex,
    leagueSize
  ) {
    this.sheetID = sheetID;
    this.name = name;
    this.sheetName = sheetName;
    this.dataRange = dataRange;
    this.matchRange = matchRange;
    this.cacheKeyTable = keyIndex + "_table";
    this.cacheKeyMatches = keyIndex + "_match";
    this.cacheKeyRescheduled = keyIndex + "_rescheduled";
    this.spielplanName = keyIndex + "_spielplan";
    this.rescheduleRanges = [];
    this.cacheDuration = 1000 * 60 * 5; // 5 Minuten Cache-Dauer
    this.leagueSize = leagueSize;

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

  getURLStats(sheetID, sheetName, range) {
    // for stats data
    return `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetName}&range=${range}`;
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

        // Render die Tabelle mit den Daten
        renderFunction(jsonData);
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Daten: ", error);
      });
  }

  fetchAndReturnStatsData(url, cacheKey) {
    let jsonData;
    fetch(url)
      .then((res) => res.text())
      .then((rep) => {
        jsonData = JSON.parse(rep.substr(47).slice(0, -2));

        // Speichere die Daten im Cache (localStorage)
        let cacheData = {
          data: jsonData,
          expiry: Date.now() + this.cacheDuration,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      })
      .catch((error) => {
        console.error("Fehler beim Abrufen der Daten: ", error);
      });
    return jsonData;
  }

  isCacheValid(cacheKey) {
    let cached = JSON.parse(localStorage.getItem(cacheKey));
    if (!cached) return false;
    return Date.now() < cached.expiry;
  }

  renderLeagueTable(jsonData) {
    let rows = jsonData.table.rows;
    let tableBody = document.querySelector(".league-table tbody");
    tableBody.innerHTML = ""; // Platzhalter löschen

    rows.forEach((row) => {
      let newRow = document.createElement("tr");
      newRow.innerHTML = `
                <td>${row.c[0].v}</td>
                <td>${row.c[1].v}</td>
                <td>${row.c[2].v}</td>
                <td>${row.c[3].v}</td>
                <td>${row.c[4].v}</td>
                <td>${row.c[5].v}</td>
                <td>${row.c[6].v}</td>
                <td>${row.c[7].v}</td>
                <td>${parseFloat(row.c[8]?.v).toFixed(2)}</td>
            `;
      newRow.addEventListener("click", () => {
        this.openStatsModalForName(row.c[1].v);
      });
      newRow.classList.add("league-table-row");
      tableBody.appendChild(newRow);
    });

    // Füge der Tabelle den roten Hintergrund für die letzten drei hinzu
    let allRows = tableBody.querySelectorAll("tr");

    //unterschiedliche Färbung der Tabellenplätze

    if (this.name == "liga1") {
      let firstFourRows = [...allRows].slice(0, 5);
      firstFourRows.forEach((row) => row.classList.add("final-four"));
    }

    if (
      this.name == "liga1") {
      let lastThreeRows = [...allRows].slice(-3);
      lastThreeRows.forEach((row) => row.classList.add("last-three"));

      if (allRows[allRows.length - 4]) {
        allRows[allRows.length - 4].classList.add("relegation-bottom");
      }
    }

    if (this.name == "liga2") {
      let lastFourRows = [...allRows].slice(-4);
      lastFourRows.forEach((row) => row.classList.add("last-three"));

      if (allRows[3]) {
        allRows[allRows.length - 5].classList.add("relegation-bottom");
      }
    }

    if (this.name == "liga2") {
      let firstFourRows = [...allRows].slice(0, 3);
      firstFourRows.forEach((row) => row.classList.add("first-three"));

      if (allRows[3]) {
        allRows[3].classList.add("relegation");
      }
    }

    if (this.name == "liga3") {
      let firstTwoRows = [...allRows].slice(0, 3);
      firstTwoRows.forEach((row) => row.classList.add("first-three"));

      if (allRows[3]) {
        allRows[3].classList.add("relegation");
      }
    }

    if (
      this.name == "liga3") {
      let lastThreeRows = [...allRows].slice(-6);
      lastThreeRows.forEach((row) => row.classList.add("last-three"));

      if (allRows[allRows.length - 7]) {
        allRows[allRows.length - 7].classList.add("relegation-bottom");
      }
    }

    if (this.name == "liga4") {
      let firstThreeRows = [...allRows].slice(0, 6);
      firstThreeRows.forEach((row) => row.classList.add("first-three"));

      if (allRows[6]) {
        allRows[6].classList.add("relegation");
      }
    }

    if (this.name == "liga4") {
      let lastFourRows = [...allRows].slice(-7);
      lastFourRows.forEach((row) => row.classList.add("last-three"));

      if (allRows[7]) {
        allRows[allRows.length - 7].classList.add("relegation-bottom");
      }
    }

    if (this.name == "liga5") {
      let firstThreeRows = [...allRows].slice(0, 7);
      firstThreeRows.forEach((row) => row.classList.add("first-three"));

      if (allRows[7]) {
        allRows[7].classList.add("relegation");
      }
    }

  }

  openModal(matchData) {
    renderGameModal(matchData);
  }

  renderMatchTable(jsonData) {
    let rows = jsonData.table.rows;
    let tableBody = document.querySelector(".match-table tbody");
    tableBody.innerHTML = "";

    rows.forEach((row) => {
      let newRow = document.createElement("tr");
      newRow.classList.add("match-row");

      // 🗓️ Datum aus Spalte 16 holen und formatieren
      let formattedDate = "-";

      if (row.c[17]?.v) {
        let rawDate = row.c[17].v;

        // Wenn es sich um ein echtes Datum-Objekt handelt
        if (typeof rawDate === "object" && rawDate instanceof Date) {
          formattedDate = rawDate
            .toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              /*year: "numeric",*/
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(",", "");
        }
        // Wenn es als String "Date(YYYY,MM,DD,...)" geliefert wird
        else if (typeof rawDate === "string" && rawDate.startsWith("Date(")) {
          try {
            // Werte aus der Google-"Date(...)"-Notation extrahieren
            const parts = rawDate
              .replace("Date(", "")
              .replace(")", "")
              .split(",")
              .map(Number);
            const jsDate = new Date(
              parts[0],
              parts[1],
              parts[2],
              parts[3],
              parts[4],
              parts[5]
            ); // Monat ist 0-basiert!
            formattedDate = jsDate
              .toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                /*year: "numeric",*/
                hour: "2-digit",
                minute: "2-digit",
              })
              .replace(",", "");
          } catch (e) {
            formattedDate = rawDate;
          }
        }
        // Falls es ein String im Format "TT.MM.JJJJ HH:MM:SS" ist
        else if (typeof rawDate === "string" && rawDate.includes(" ")) {
          formattedDate = rawDate;
        }
        // Oder wenn Google das formatierte Feld bereitstellt (z. B. row.c[16].f)
        else if (row.c[17]?.f) {
          formattedDate = row.c[17].f;
        }
      }

      newRow.innerHTML = `
                <td>${formattedDate}</td>
                <td>${row.c[0]?.v || "-"}</td>
                <td>${row.c[1]?.v || "-"}</td>
                <td>${row.c[2]?.v || "-"}</td>
                <td>${row.c[3]?.v || "-"}</td>
            `;

      newRow.addEventListener("click", () => {
        this.openModal({
          blau: row.c[0]?.v || "N/A",
          rot: row.c[1]?.v || "N/A",
          id: row.c[2]?.v || "N/A",
          ergebnis: row.c[3]?.v || "N/A",
          punkteBlau: row.c[4]?.v != null ? parseFloat(row.c[4].v) : undefined,
          punkteRot: row.c[5]?.v != null ? parseFloat(row.c[5].v) : undefined,
          healthBlau: row.c[8]?.v || "N/A",
          healthRot: row.c[9]?.v || "N/A",
          maps: JSON.parse(row.c[10]?.v || "[]"),
        });
      });

      tableBody.appendChild(newRow);
    });
  }

  renderRescheduleTable(jsonData) {
    let offset;
    if (this.name === "liga1" ||
        this.name === "liga2"
    ) {
      offset =
        this.getAmountOfGamesPerWeekAndOffsets().liga12Offsets[
          getSpielwoche().week - 1
        ] - 3;
    } else if (
      this.name === "liga3" ||
      this.name === "liga4"
    ) {
      offset =
        this.getAmountOfGamesPerWeekAndOffsets().liga34Offsets[
          getSpielwoche().week - 1
        ] - 3;
    } else if (this.name === "liga5") {
      offset =
        this.getAmountOfGamesPerWeekAndOffsets().liga5Offsets[
          getSpielwoche().week - 1
        ] - 3;
    }

    let rows = jsonData.table.rows;
    let tableBody = document.querySelector("#nachholspiele tbody");
    tableBody.innerHTML = ""; // Platzhalter löschen
    rows = rows.slice(0, offset);

    rows.forEach((row) => {
      if (!row.c[4]?.v) {
        // Prüfen, ob Spalte E leer ist
        let newRow = document.createElement("tr");
        newRow.innerHTML = `
                    <td>${row.c[1]?.v || "-"}</td>
                    <td>${row.c[2]?.v || "-"}</td>
                    <td>${row.c[3]?.v || "-"}</td>
                    <td>${row.c[4]?.v || "-"}</td>
                `;
        tableBody.appendChild(newRow);
      }
    });
  }

  loadTableData() {
    if (this.isCacheValid(this.cacheKeyTable)) {
      let cachedData = JSON.parse(
        localStorage.getItem(this.cacheKeyTable)
      ).data;
      this.renderLeagueTable(cachedData);
    } else {
      this.fetchAndRenderData(
        this.getURL(this.dataRange),
        this.cacheKeyTable,
        this.renderLeagueTable.bind(this)
      );
    }
  }

  loadAndReturnStatsTableData() {
    if (this.isCacheValid("PlayerStats_table")) {
      let cachedData = JSON.parse(
        localStorage.getItem("PlayerStats_table")
      ).data;
      return cachedData;
    } else {
      return this.fetchAndReturnStatsData(
        this.getURLStats(
          "1Ign2YJZ0edrj6ZH1Kd3d3qJ4dr4XWSiAAofW94hIobE",
          "Player_stats",
          "A3:AA200"
        ),
        "PlayerStats_table"
      );
    }
  }

  openStatsModalForName(name) {
    let jsonData = this.loadAndReturnStatsTableData();
    let rows = jsonData.table.rows;
    rows.forEach((row) => {
      if (row.c[2]?.v == name) {
        this.openStatsModal(row);
      }
    });
  }

  // copied from stats page
  openStatsModal(sheetRow) {
    const modal = document.getElementById("statsModal");
    const modalTitle = document.getElementById("statsModalTitle");
    const modalDetails = document.getElementById("statsModalDetails");
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
          <span class="stats-stat-sub">${played} Spiele · ${health} Health</span>
        </div>
      `;
    };

    modalTitle.innerHTML = `${this.getPlayerSubdivisionIcon(region)} ${playerName}`;
    modalDetails.innerHTML = `
      <div class="stats-profile">
        <div>
          <span class="stats-eyebrow">Spielerprofil</span>
          <div class="stats-player-name">${playerName}</div>
          <div class="stats-player-meta">Discordname: ${getValue(
            this.statsSheetColDiscordName
          )} · ${region === "base" ? "-" : region}</div>
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
    return;

    modalTitle.innerHTML = `Statistiken für ${this.getPlayerSubdivisionIcon(
      sheetRow.c[this.statsSheetColSubdivision]?.v || "base"
    )} ${sheetRow.c[this.statsSheetColGGName].v}`;

    modalDetails.innerHTML = `
      <table class="player-info" style="background-color: #d4d4d4">
        <tr>
          <td class="label">Discord</td>
          <td>${sheetRow.c[this.statsSheetColDiscordName].v}</td>
        </tr>
        <tr>
          <td class="label">Profillink</td>
          <td><a href="${sheetRow.c[this.statsSheetColGGLink].v}">Link</a></td>
        </tr>
        <tr>
          <td class="label">Region</td>
          <td>${sheetRow.c[this.statsSheetColSubdivision]?.v || "-"}</td>
        </tr>
        <tr>
          <td class="label">Saisonteilnahmen</td>
          <td>${
            sheetRow.c[this.statsSheetColLeagueParticipations]?.v || "-"
          }</td>
        </tr>
        <tr>
          <td class="label">Beste Platzierung <br> reguläre Seasons</td>
          <td>${sheetRow.c[this.statsSheetColPB]?.v || "-"}</td>
        </tr>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
        <tr><td></td><td></td></tr>
        <tr>
          <td class="label">Platzierung in Liga</td>
          <td>${sheetRow.c[this.statsSheetColPlacement]?.v || "-"}</td>
        </tr>
        <tr>
          <td class="label">Punkte</td>
          <td>${
            Math.round(sheetRow.c[this.statsSheetColPoints]?.v * 100) / 100
          }</td>
        </tr>
        <tr>
          <td class="label">Anzahl 5k</td>
          <td>${sheetRow.c[this.statsSheetCol5ks]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">Anzahl 4800+</td>
          <td>${sheetRow.c[this.statsSheetCol4800]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">Extensions</td>
          <td>${sheetRow.c[this.statsSheetColExt]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">Gelbe Karten</td>
          <td>${sheetRow.c[this.statsSheetColYellowCards]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">Moving-Duels (${
            sheetRow.c[this.statsSheetColMPlayed]?.v || "0"
          })</td>
          <td>${sheetRow.c[this.statsSheetColMWon]?.v || "0"}-${
      sheetRow.c[this.statsSheetColMPlayed]?.v -
      sheetRow.c[this.statsSheetColMWon]?.v
    } / ${sheetRow.c[this.statsSheetColMHealth]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">NM-Duels (${
            sheetRow.c[this.statsSheetColNMPlayed]?.v || "0"
          })</td>
          <td>${sheetRow.c[this.statsSheetColNMWon]?.v || "0"}-${
      sheetRow.c[this.statsSheetColNMPlayed]?.v -
      sheetRow.c[this.statsSheetColNMWon]?.v
    } / ${sheetRow.c[this.statsSheetColNMHealth]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">NMPZ-Duels (${
            sheetRow.c[this.statsSheetColNMPZPlayed]?.v || "0"
          })</td>
          <td>${sheetRow.c[this.statsSheetColNMPZWon]?.v || "0"}-${
      sheetRow.c[this.statsSheetColNMPZPlayed]?.v -
      sheetRow.c[this.statsSheetColNMPZWon]?.v
    } / ${sheetRow.c[this.statsSheetColNMPZHealth]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">DACH-Duels (${
            sheetRow.c[this.statsSheetColDACHPlayed]?.v || "0"
          })</td>
          <td>${sheetRow.c[this.statsSheetColDACHWon]?.v || "0"}-${
      sheetRow.c[this.statsSheetColDACHPlayed]?.v -
      sheetRow.c[this.statsSheetColDACHWon]?.v
    } / ${sheetRow.c[this.statsSheetColDACHHealth]?.v || "0"}</td>
        </tr>
        <tr>
          <td class="label">Lieblingsmodus</td>
          <td>${sheetRow.c[this.statsSheetColFavMode]?.v || "-"}</td>
        </tr>
      </table>
    `;
    modal.style.display = "flex";
  }

  getPlayerSubdivisionIcon(playerSubdivision) {
    return `<img src="./../img/herzen/${playerSubdivision}.png" alt="${playerSubdivision}" style="height: 1em; vertical-align: middle;" />`;
  }

  loadMatchData() {
    if (this.isCacheValid(this.cacheKeyMatches)) {
      let cachedData = JSON.parse(
        localStorage.getItem(this.cacheKeyMatches)
      ).data;
      console.log(cachedData);
      this.renderMatchTable(cachedData);
    } else {
      // Verwende die dynamisch berechnete Match-Range
      console.log(this.matchRange + "neuladung");

      this.fetchAndRenderData(
        this.getURL(this.matchRange),
        this.cacheKeyMatches,
        this.renderMatchTable.bind(this)
      );
    }
  }

  loadRescheduleData() {
    if (this.isCacheValid(this.cacheKeyRescheduled)) {
      let cachedData = JSON.parse(
        localStorage.getItem(this.cacheKeyRescheduled)
      ).data;
      this.renderRescheduleTable(cachedData);
    } else {
      // Verwende die dynamisch berechnete Match-Range
      this.fetchAndRenderData(
        this.getURL(this.rescheduleRanges),
        this.cacheKeyRescheduled,
        this.renderRescheduleTable.bind(this)
      );
    }
  }

  // define amounts of games per spielwoche and offsets for each spielwoche
  getAmountOfGamesPerWeekAndOffsets() {
    let gpwAndOffsets = {
      liga12Games: [3, 3, 3, 2, 2, 2], //von liga1Games
      liga34Games: [2, 2, 2, 2, 2, 2], //von liga23Games
      liga5Games: [2, 2, 2, 2, 2, 2], //von liga4Games
    };
    gpwAndOffsets.liga12Offsets = this.calculateOffsets(
      gpwAndOffsets.liga12Games,
      8
    );
    gpwAndOffsets.liga34Offsets = this.calculateOffsets(
      gpwAndOffsets.liga34Games,
      18
    );
    gpwAndOffsets.liga5Offsets = this.calculateOffsets(
      gpwAndOffsets.liga5Games,
      17
    );
    return gpwAndOffsets;
  }

  updateSpielwoche() {
    const spielwoche = getSpielwoche();
    if (!spielwoche) return;

    const wocheNummer = spielwoche.week;
    const wocheStart = formatDate(spielwoche.start);
    const wocheEnde = formatDate(spielwoche.end);

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
    if (this.name == "liga1" ||
        this.name == "liga2"
    ) {
      startRow =
        this.getAmountOfGamesPerWeekAndOffsets().liga12Offsets[wocheNummer - 1]; // Offset für die aktuelle Woche
      endRow =
        this.getAmountOfGamesPerWeekAndOffsets().liga12Games[wocheNummer - 1] *
          8 +
        startRow -
        1;
    } else if (
      this.name == "liga3" ||
      this.name == "liga4"
    ) {
      startRow =
        this.getAmountOfGamesPerWeekAndOffsets().liga34Offsets[wocheNummer - 1]; // Offset für die aktuelle Woche
      endRow =
        this.getAmountOfGamesPerWeekAndOffsets().liga34Games[wocheNummer - 1] *
          18 +
        startRow -
        1;
    } else {
      startRow =
        this.getAmountOfGamesPerWeekAndOffsets().liga5Offsets[wocheNummer - 1]; // Offset für die aktuelle Woche
      endRow =
        this.getAmountOfGamesPerWeekAndOffsets().liga5Games[wocheNummer - 1] *
          17 +
        startRow -
        1;
    }
    this.matchRange = `B${startRow}:S${endRow}`;
  }

  //hilfsfunktion
  calculateOffsets(gamesPerWeek, spieleProTag) {
    let offsets = [];
    let currentOffset = 3;

    for (let i = 0; i < gamesPerWeek.length; i++) {
      offsets.push(currentOffset); // Offset für die aktuelle Woche speichern
      currentOffset += gamesPerWeek[i] * spieleProTag; // Nächsten Offset berechnen
    }

    return offsets;
  }

  initialize() {
    this.updateSpielwoche();
    this.loadMatchData();
    this.loadTableData();
    this.loadRescheduleData();

    //seite 2
    //variable tabellengröße bei unterschiedlicher ligagröße
    let dataRange1 = "AD3:AG" + (this.leagueSize + 3 - 1);
    let dataRange2 = "AL3:AO" + (this.leagueSize + 3 - 1);
    let dataRange3 = "AQ3:AT" + (this.leagueSize + 3 - 1);

    // Event-Listener für das Schließen des Modals
    let modal = document.getElementById("gameModal");
    let closeModalButton = modal.querySelector(".close");
    closeModalButton.addEventListener("click", function () {
      modal.style.display = "none"; // Modal ausblenden
    });

    // Optional: Modal schließen, wenn außerhalb des Inhalts geklickt wird
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        modal.style.display = "none"; // Modal ausblenden
      }
    });

    // Event-Listener für das Schließen des Modals
    let statsModal = document.getElementById("statsModal");
    let closeStatsModalButton = statsModal.querySelector(".close");
    closeStatsModalButton.addEventListener("click", function () {
      statsModal.style.display = "none"; // Modal ausblenden
    });

    // Optional: Modal schließen, wenn außerhalb des Inhalts geklickt wird
    statsModal.addEventListener("click", function (event) {
      if (event.target === statsModal) {
        statsModal.style.display = "none"; // Modal ausblenden
      }
    });

    // horizontale slideshow mit extra daten
    fetchAndRenderTable(
      "1Ign2YJZ0edrj6ZH1Kd3d3qJ4dr4XWSiAAofW94hIobE",
      this.spielplanName,
      dataRange1,
      "pinpointTable"
    );
    fetchAndRenderTable(
      "1Ign2YJZ0edrj6ZH1Kd3d3qJ4dr4XWSiAAofW94hIobE",
      this.spielplanName,
      dataRange2,
      "yellowCards"
    );
    fetchAndRenderTable(
      "1Ign2YJZ0edrj6ZH1Kd3d3qJ4dr4XWSiAAofW94hIobE",
      this.spielplanName,
      dataRange3,
      "extensions"
    );

    // Liga Spieltage rendern
    fetchAndRenderMatchdayTables(
      "1Ign2YJZ0edrj6ZH1Kd3d3qJ4dr4XWSiAAofW94hIobE",
      this.spielplanName,
      this.leagueSize
    );
  }
}

// Hilfsfunktionen (z. B. für die Spielwochenberechnung)
function getSpielwoche() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Setzt die Zeit auf Mitternacht
  const spielwochen = [
    { start: new Date("2026-05-17"), end: new Date("2026-05-31"), week: 1 },
    { start: new Date("2026-06-01"), end: new Date("2026-06-14"), week: 2 },
    { start: new Date("2026-06-15"), end: new Date("2026-06-28"), week: 3 },
    { start: new Date("2026-06-29"), end: new Date("2026-07-12"), week: 4 },
    { start: new Date("2026-07-13"), end: new Date("2026-07-26"), week: 5 },
    { start: new Date("2026-07-27"), end: new Date("2026-08-09"), week: 6 },
    /*{ start: new Date("2025-06-30"), end: new Date("2025-07-13"), week: 7 },*/
  ];

  // Setzt ebenfalls die Zeit aller Start- und Enddaten auf Mitternacht
  spielwochen.forEach((sw) => {
    sw.start.setHours(0, 0, 0, 0);
    sw.end.setHours(23, 59, 59, 0);
  });

  // Rückgabe der passenden Spielwoche
  //return spielwochen.find((sw) => today >= sw.start && today <= sw.end) || null;

  const aktuelleWoche = spielwochen.find(
    (sw) => today >= sw.start && today <= sw.end
  );

  // Nach der letzten Spielwoche, wird der letzte Spieltag zurückgegeben
  if (!aktuelleWoche && today > spielwochen[spielwochen.length - 1].end) {
    return spielwochen[spielwochen.length - 1];
  }

  return aktuelleWoche || null;
}

function formatDate(date) {
  let day = String(date.getDate()).padStart(2, "0");
  let month = String(date.getMonth() + 1).padStart(2, "0");
  let year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

//tabellen 2te seite

//extra info tabellen slideshow
let slideIndex = 1;

function plusSlides(n) {
  showSlides((slideIndex += n));
}

function currentSlide(n) {
  showSlides((slideIndex = n));
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("slide");
  let dots = document.getElementsByClassName("dot");
  let tabs = document.getElementsByClassName("table-tab");

  if (!slides.length) return;

  if (n > slides.length) {
    slideIndex = 1;
  }
  if (n < 1) {
    slideIndex = slides.length;
  }
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }
  for (i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle("active", i === slideIndex - 1);
  }
  slides[slideIndex - 1].style.display = "block";

  if (dots[slideIndex - 1]) {
    dots[slideIndex - 1].className += " active";
  }
}

function initExtraInfoTabs() {
  const slideshow = document.querySelector(".table-slideshow");
  const slides = Array.from(document.getElementsByClassName("slide"));

  if (!slideshow || !slides.length || slideshow.querySelector(".table-tabs")) {
    showSlides(slideIndex);
    return;
  }

  const tabs = document.createElement("div");
  tabs.className = "table-tabs";

  slides.forEach((slide, index) => {
    const tableTitle =
      slide.querySelector("thead tr:first-child th")?.textContent.trim() ||
      `Tabelle ${index + 1}`;
    const button = document.createElement("button");

    button.className = "table-tab";
    button.type = "button";
    button.textContent = tableTitle;
    button.addEventListener("click", () => currentSlide(index + 1));
    tabs.appendChild(button);
  });

  slideshow.prepend(tabs);
  slideshow.querySelectorAll(":scope > .prev, :scope > .next").forEach((el) => {
    el.remove();
  });
  slideshow.querySelectorAll(".dot").forEach((el) => {
    el.parentElement?.remove();
  });
  showSlides(slideIndex);
}

initExtraInfoTabs();

function fetchAndRenderTable(
  sheetID,
  sheetName,
  dataRange,
  tableID,
  onRowClick
) {
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
          .slice(0, 4)
          .map((cell) => {
            let value = cell?.v || "-";

            // Prüfen, ob der Wert ein Datum-Objekt ist
            if (cell?.f && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(cell.f)) {
              value = cell.f; // Der formatierte Wert ist bereits im gewünschten Format
            }

            return `<td>${value}</td>`;
          })
          .join("");

        if (typeof onRowClick === "function") {
          newRow.addEventListener("click", () => onRowClick(row));
          newRow.classList.add("clickable"); // CSS-Stil hinzufügen
        }

        tableBody.appendChild(newRow);
      });
    })
    .catch((error) => console.error("Fehler beim Abrufen der Tabelle:", error));
}

// Vertikale Slideshow für Spieltage
function fetchAndRenderMatchdayTables(sheetID, sheetName, leagueSize) {
  if (leagueSize % 2 === 0) {
    matchdaySize = leagueSize / 2; // Anzahl der Spiele pro Spieltag
    totalMatchdays = leagueSize - 1; // Anzahl der Spieltage (keine Rückrunde)
  } else {
    matchdaySize = leagueSize / 2 - 0.5; // Anzahl der Spiele pro Spieltag
    totalMatchdays = leagueSize; // Anzahl der Spieltage (keine Rückrunde)
  }

  if (totalMatchdays > 20) totalMatchdays = 12; // Swiss System

  const slideshowContainer = document.querySelector(".matchday-slideshow");
  const prevButton = document.querySelector(".prevDay");
  const nextButton = document.querySelector(".nextDay");
  const matchdayList = document.getElementById("matchday-list");

  let currentIndex = 1;

  function createMatchdayTable(index) {
    const startRow = 3 + (index - 1) * matchdaySize;
    const endRow = startRow + matchdaySize - 1;
    const dataRange = `B${startRow}:S${endRow}`;
    const tableID = `matchday-${index}`;

    const table = document.createElement("table");
    table.id = tableID;
    table.classList.add("matchday-table");
    if (index !== currentIndex) {
      table.classList.add("faded");
    }
    table.innerHTML = `<thead><tr><th colspan='4'>Spieltag ${index}</th></tr></thead><tbody></tbody>`;

    // ✨ Hier der wichtige Teil:
    fetchAndRenderTable(sheetID, sheetName, dataRange, tableID, (row) => {
      const blau = row.c[0]?.v || "N/A";
      const rot = row.c[1]?.v || "N/A";
      const id = row.c[2]?.v || "N/A";
      const ergebnis = row.c[3]?.v || "N/A";
      //const punkteBlau = parseFloat(row.c[4]?.v) || "N/A";
      //const punkteRot = parseFloat(row.c[5]?.v) || "N/A";
      const punkteBlau =
        row.c[4]?.v != null ? parseFloat(row.c[4].v) : undefined;
      const punkteRot =
        row.c[5]?.v != null ? parseFloat(row.c[5].v) : undefined;
      const healthBlau = row.c[8]?.v || "N/A";
      const healthRot = row.c[9]?.v || "N/A";
      const maps = JSON.parse(row.c[10]?.v || "[]");

      openModal({
        blau,
        rot,
        id,
        ergebnis,
        punkteBlau,
        punkteRot,
        healthBlau,
        healthRot,
        maps,
      });
    });

    return table;
  }

  function getWrappedIndex(index) {
    if (index < 1) return totalMatchdays;
    if (index > totalMatchdays) return 1;
    return index;
  }

  function renderMatchdayTables() {
    slideshowContainer.innerHTML = "";
    slideshowContainer.appendChild(prevButton);

    const prevIndex = getWrappedIndex(currentIndex - 1);
    const activeIndex = getWrappedIndex(currentIndex);
    const nextIndex = getWrappedIndex(currentIndex + 1);

    const prevTable = createMatchdayTable(prevIndex);
    prevTable.classList.add("previousTable");
    slideshowContainer.appendChild(prevTable);

    const activeTable = createMatchdayTable(activeIndex);
    activeTable.classList.add("activeTable");
    slideshowContainer.appendChild(activeTable);

    const nextTable = createMatchdayTable(nextIndex);
    nextTable.classList.add("nextTable");
    slideshowContainer.appendChild(nextTable);

    slideshowContainer.appendChild(nextButton);
    updateMatchdayView();
  }

  prevButton.addEventListener("click", function () {
    currentIndex = getWrappedIndex(currentIndex - 1);
    renderMatchdayTables();
  });

  nextButton.addEventListener("click", function () {
    currentIndex = getWrappedIndex(currentIndex + 1);
    renderMatchdayTables();
  });

  function generateMatchdayList() {
    for (let i = 1; i <= totalMatchdays; i++) {
      const li = document.createElement("li");
      const button = document.createElement("button");

      button.textContent = i;
      button.classList.add("matchday-btn");
      button.addEventListener("click", () => goToMatchday(i));

      li.appendChild(button);
      matchdayList.appendChild(li);
    }
  }

  function goToMatchday(matchday) {
    currentIndex = matchday;
    renderMatchdayTables();
  }

  function updateMatchdayView() {
    document.querySelectorAll(".matchday-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (parseInt(btn.textContent) === currentIndex) {
        btn.classList.add("active");
      }
    });
  }

  function openModal(matchData) {
    renderGameModal(matchData);
  }

  generateMatchdayList();
  renderMatchdayTables();

  // Sortierfunktion für Tabellen "Gelbe Karten" und "Meiste Pinpoints"
  function makeSortable(tableId, sortableCols) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headerRow = table.querySelector("thead tr:last-child");
    if (!headerRow) return;
    const headers = headerRow.querySelectorAll("th");

    sortableCols.forEach((colIndex) => {
      let asc = false;
      const header = headers[colIndex];
      if (!header) return;

      header.style.cursor = "pointer";
      header.addEventListener("click", (event) => {
        event.stopPropagation();

        const tbody = table.querySelector("tbody");
        const rowsArray = Array.from(tbody.querySelectorAll("tr")).filter(
          (tr) => tr.querySelectorAll("td").length > 1
        );

        rowsArray.sort((a, b) => {
          const aText = (a.children[colIndex]?.textContent || "").trim();
          const bText = (b.children[colIndex]?.textContent || "").trim();

          const parseNum = (txt) => {
            if (!txt) return 0;
            const cleaned = txt.replace(/[^\d\-,.]/g, "").replace(",", ".");
            const n = parseFloat(cleaned);
            return Number.isNaN(n) ? 0 : n;
          };

          const aVal = parseNum(aText);
          const bVal = parseNum(bText);

          return asc ? aVal - bVal : bVal - aVal;
        });

        rowsArray.forEach((row, i) => {
          if (row.children[0]) row.children[0].textContent = i + 1;
          tbody.appendChild(row);
        });

        asc = !asc;

        headers.forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
        header.classList.add(asc ? "sort-asc" : "sort-desc");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    makeSortable("yellowCards", [2, 3]);
    makeSortable("pinpointTable", [2, 3]);
  });
}
