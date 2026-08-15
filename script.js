const WEATHER_CODES = {
  0: { desc: "맑음", icon: "☀️" },
  1: { desc: "대체로 맑음", icon: "🌤️" },
  2: { desc: "구름 조금", icon: "⛅" },
  3: { desc: "흐림", icon: "☁️" },
  45: { desc: "안개", icon: "🌫️" },
  48: { desc: "짙은 안개", icon: "🌫️" },
  51: { desc: "약한 이슬비", icon: "🌦️" },
  53: { desc: "이슬비", icon: "🌦️" },
  55: { desc: "강한 이슬비", icon: "🌦️" },
  61: { desc: "약한 비", icon: "🌧️" },
  63: { desc: "비", icon: "🌧️" },
  65: { desc: "강한 비", icon: "🌧️" },
  71: { desc: "약한 눈", icon: "🌨️" },
  73: { desc: "눈", icon: "🌨️" },
  75: { desc: "강한 눈", icon: "🌨️" },
  77: { desc: "싸락눈", icon: "🌨️" },
  80: { desc: "약한 소나기", icon: "🌦️" },
  81: { desc: "소나기", icon: "🌦️" },
  82: { desc: "강한 소나기", icon: "⛈️" },
  95: { desc: "뇌우", icon: "⛈️" },
  96: { desc: "우박 동반 뇌우", icon: "⛈️" },
  99: { desc: "강한 우박 동반 뇌우", icon: "⛈️" },
};

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const locateBtn = document.getElementById("locate-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  setStatus("검색 중...");
  try {
    const { latitude, longitude, name } = await geocodeCity(city);
    await loadWeather(latitude, longitude, name);
  } catch (err) {
    showError(err.message);
  }
});

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }
  setStatus("현재 위치 확인 중...");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await loadWeather(pos.coords.latitude, pos.coords.longitude, "현재 위치");
      } catch (err) {
        showError(err.message);
      }
    },
    () => showError("위치 정보를 가져올 수 없습니다.")
  );
});

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ko&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("도시 검색에 실패했습니다.");
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("해당 도시를 찾을 수 없습니다.");
  }
  const r = data.results[0];
  const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
  return { latitude: r.latitude, longitude: r.longitude, name: label };
}

async function loadWeather(latitude, longitude, name) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("날씨 정보를 가져오지 못했습니다.");
  const data = await res.json();
  renderWeather(data, name);
}

function renderWeather(data, name) {
  const c = data.current;
  const weather = WEATHER_CODES[c.weather_code] || { desc: "알 수 없음", icon: "❓" };

  document.getElementById("city-name").textContent = name;
  document.getElementById("date-time").textContent = new Date(c.time).toLocaleString("ko-KR");
  document.getElementById("weather-icon").textContent = weather.icon;
  document.getElementById("temperature").textContent = Math.round(c.temperature_2m);
  document.getElementById("description").textContent = weather.desc;
  document.getElementById("feels-like").textContent = `${Math.round(c.apparent_temperature)}°C`;
  document.getElementById("humidity").textContent = `${c.relative_humidity_2m}%`;
  document.getElementById("wind-speed").textContent = `${c.wind_speed_10m} km/h`;

  resultEl.classList.remove("hidden");
  setStatus("");
}

function setStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.remove("error");
}

function showError(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add("error");
  resultEl.classList.add("hidden");
}
