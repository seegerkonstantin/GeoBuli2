class NewestGameInfos {
  constructor(sheetID, sheetName, dataRange, matchRange, keyIndex) {
    this.sheetID = sheetID;
    this.sheetName = sheetName;
    this.dataRange = dataRange;
    this.matchRange = matchRange;
    this.cacheKeyTable = keyIndex + "_table";
    this.cacheDuration = 1 * 60 * 5; // 5 Minuten Cache-Dauer
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

  renderUpcomingTable(jsonData) {
    let rows = jsonData.table.rows;
    this.sheetData = rows;

    let newestResultsList = document.querySelector("#newest-games-list");

    rows.forEach((row) => {
      if (row.c[0]) {
        let li = document.createElement("li");
        li.innerHTML = `${
          row.c[19].v == 0
            ? "in " + row.c[20].v + "min"
            : "in " + row.c[19].v + "h"
        } (${row.c[17].f}) - ${row.c[18].v} - ${
          row.c[0].v
        } <span style="font-style: italic;">${"vs."}</span> ${row.c[1].v}`;
        newestResultsList.appendChild(li);
      }
    });
  }

  renderStatsTable(jsonData) {
    let rows = jsonData.table.rows;
    this.sheetData = rows;

    let newestResultsList = document.querySelector("#newest-games-list");

    rows.forEach((row) => {
      if (row.c[0]) {
        let li = document.createElement("li");
        li.innerHTML = `${
          row.c[18].v == 0
            ? "vor " + row.c[19].v + "min"
            : "vor " + row.c[18].v + "h"
        } - ${row.c[17].v} - ${row.c[0].v} <span style="font-style: italic;">${
          row.c[3].v
        }</span> ${row.c[1].v}`;
        newestResultsList.appendChild(li);
      }
    });
  }

  initialize() {
    this.loadTableData();
  }

  loadTableData() {
    if (this.isCacheValid(this.cacheKeyTable)) {
      // lade die Daten aus localStorage (Cache)
      let cachedData = JSON.parse(
        localStorage.getItem(this.cacheKeyTable)
      ).data;
      this.renderUpcomingTable(cachedData);
    } else {
      // Lade die Daten aus dem Google Sheet
      this.fetchAndRenderData(
        this.getURL(this.dataRange),
        this.cacheKeyTable,
        this.renderUpcomingTable.bind(this)
      );
    }
  }
}
