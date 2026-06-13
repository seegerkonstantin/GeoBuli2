class GameInfos {
  constructor(config) {
    this.sheetID = config.sheetID;
    this.sheetName = config.sheetName;
    this.dataRange = config.dataRange;
    this.cacheKeyTable = config.key + "_table";
    this.cacheDuration = 1 * 60 * 5; // 5 Minuten Cache-Dauer
    this.targetElement = document.querySelector(config.target);
    this.renderMode = config.renderMode || "stats"; // 'stats' oder 'upcoming'
  }

  getURL(range) {
    return `https://docs.google.com/spreadsheets/d/${this.sheetID}/gviz/tq?sheet=${this.sheetName}&range=${range}`;
  }

  fetchAndRenderData(url, cacheKey, renderFunction) {
    fetch(url)
      .then((res) => res.text())
      .then((rep) => {
        let jsonData = JSON.parse(rep.substr(47).slice(0, -2));

        // Cache speichern
        let cacheData = {
          data: jsonData,
          expiry: Date.now() + this.cacheDuration,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        renderFunction(jsonData);
      })
      .catch((error) =>
        console.error("Fehler beim Abrufen der Daten: ", error)
      );
  }

  isCacheValid(cacheKey) {
    let cached = JSON.parse(localStorage.getItem(cacheKey));
    if (!cached) return false;
    return Date.now() < cached.expiry;
  }

  createMatchItem(metaItems, leftPlayer, centerText, rightPlayer) {
    let li = document.createElement("li");
    li.className = "match-item";

    let meta = document.createElement("div");
    meta.className = "match-meta";
    metaItems.forEach((item) => {
      let pill = document.createElement("span");
      pill.className = "match-pill";
      pill.textContent = item;
      meta.appendChild(pill);
    });

    let line = document.createElement("div");
    line.className = "match-line";

    let left = document.createElement("span");
    left.className = "match-player";
    left.textContent = leftPlayer;
    left.title = leftPlayer;

    let center = document.createElement("span");
    center.className = "match-score";
    center.textContent = centerText;

    let right = document.createElement("span");
    right.className = "match-player";
    right.textContent = rightPlayer;
    right.title = rightPlayer;

    line.append(left, center, right);
    li.append(meta, line);
    return li;
  }

  renderStatsTable(jsonData) {
    let rows = jsonData.table.rows;
    this.targetElement.innerHTML = "";
    this.targetElement.classList.add("match-list");

    let visibleRows = rows.filter((row) => row.c[0]);
    if (visibleRows.length === 0) {
      let empty = document.createElement("li");
      empty.className = "match-empty";
      empty.textContent = "Keine Ergebnisse in den letzten 24h.";
      this.targetElement.appendChild(empty);
      return;
    }

    visibleRows.forEach((row) => {
      let timeText =
        row.c[18].v == 0
          ? "vor " + row.c[19].v + "min"
          : "vor " + row.c[18].v + "h";

      let li = this.createMatchItem(
        [timeText, row.c[17].v],
        row.c[0].v,
        row.c[3].v,
        row.c[1].v
      );
      this.targetElement.appendChild(li);
    });
  }

  renderUpcomingTable(jsonData) {
    let rows = jsonData.table.rows;
    this.targetElement.innerHTML = "";
    this.targetElement.classList.add("match-list");

    let visibleRows = rows.filter((row) => row.c[0]);
    if (visibleRows.length === 0) {
      let empty = document.createElement("li");
      empty.className = "match-empty";
      empty.textContent = "Keine anstehenden Matches.";
      this.targetElement.appendChild(empty);
      return;
    }

    visibleRows.forEach((row) => {
      let timeText =
        row.c[19].v == 0
          ? "in " + row.c[20].v + "min"
          : "in " + row.c[19].v + "h";

      let li = this.createMatchItem(
        [timeText, row.c[17].f + " Uhr", row.c[18].v],
        row.c[0].v,
        "vs.",
        row.c[1].v
      );
      this.targetElement.insertBefore(li, this.targetElement.firstChild);
    });
  }

  initialize() {
    if (this.isCacheValid(this.cacheKeyTable)) {
      let cachedData = JSON.parse(
        localStorage.getItem(this.cacheKeyTable)
      ).data;
      this.render(cachedData);
    } else {
      this.fetchAndRenderData(
        this.getURL("B2:U100"),
        this.cacheKeyTable,
        this.render.bind(this)
      );
    }
  }

  render(jsonData) {
    if (this.renderMode === "upcoming") this.renderUpcomingTable(jsonData);
    else this.renderStatsTable(jsonData);
  }
}
