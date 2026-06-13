const sheetID = '1LSKX1Nx3OIUcUc8D24b-BA_IGCqEo_FA-6ey0LbpLAo';
const sheetName = 'Twitch_live';
const sheetNameYT = 'YT_content';
const range = 'B2:E'; 
const rangeYT = 'B2:B'; 
const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetName}&range=${range}`;
const gvizUrlYT = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetNameYT}&range=${rangeYT}`;


// Live Button darstellen
fetch(gvizUrl)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;

    const now = new Date();

    for (const row of rows) {
      const channel = row.c[0]?.v;
      const dateStr = row.c[1]?.f;
      const startStr = row.c[2]?.f;
      const endStr = row.c[3]?.f;  

      if (!channel || !dateStr || !startStr || !endStr) continue;

      // Datum ins JS-kompatible Format bringen
      const dateParts = dateStr.split('.');
      const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // yyyy-mm-dd

      const startTime = new Date(`${isoDate}T${startStr}`);
      const endTime = new Date(`${isoDate}T${endStr}`);

      if (now >= startTime && now <= endTime) {
        const button = document.getElementById('live-button');
        button.href = `https://twitch.tv/${channel}`;
        button.innerText = `🔴 ${channel} ist LIVE auf Twitch`;
        button.style.display = 'inline-block';
        return;
      }
    }

    // Falls keiner live ist:
    document.getElementById('live-button').style.display = 'none';
  })
  .catch(err => console.error("Fehler beim Laden der Daten:", err));

// Youtube Videos darstellen
let currentSlide = 0;
let ytIframes = [];

fetch(gvizUrlYT)
  .then(res => res.text())
  .then(text => {
    const jsonYT = JSON.parse(text.substr(47).slice(0, -2));
    const rowsYT = jsonYT.table.rows;
    const linksYT = rowsYT.map(row => row.c[0]?.v).filter(Boolean).reverse();

    if (linksYT.length === 0) return;

    const slidesContainer = document.getElementById('youtube-slides');

    linksYT.forEach((url, index) => {
      const videoId = extractYouTubeID(url);
      const iframe = document.createElement('iframe');
      iframe.width = "100%";
      iframe.height = "315";
      iframe.frameBorder = "0";
      iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;

      iframe.style.display = "inline-block";
      iframe.style.width = "100%";
      iframe.style.maxWidth = "100%";
      iframe.style.verticalAlign = "top";

      slidesContainer.appendChild(iframe);
      ytIframes.push(iframe);
    });

    updateSlidePosition();

    const intervalMs = 10000;
    const index = Math.floor(Date.now() / intervalMs) % ytIframes.length;
    currentSlide = index;
    updateSlidePosition();

    setInterval(() => {
      currentSlide = (currentSlide + 1) % ytIframes.length;
      updateSlidePosition();
    }, intervalMs);

  });

function extractYouTubeID(url) {
  const match = url.match(/v=([^&]+)/);
  return match ? match[1] : '';
}

function updateSlidePosition() {
  const slideWidth = ytIframes[0]?.offsetWidth || 600;
  const container = document.getElementById("youtube-slides");
  container.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
}

function nextSlide() {
  if (ytIframes.length === 0) return;
  currentSlide = (currentSlide + 1) % ytIframes.length;
  updateSlidePosition();
}

function prevSlide() {
  if (ytIframes.length === 0) return;
  currentSlide = (currentSlide - 1 + ytIframes.length) % ytIframes.length;
  updateSlidePosition();
}
