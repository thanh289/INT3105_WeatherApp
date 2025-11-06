// public/script.js

const baseUrl = "http://localhost:5000/api/v1/vopak";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnGetWeathers").addEventListener("click", getWeathers);
  document.getElementById("btnGetCity").addEventListener("click", getWeatherByCity);
  document.getElementById("btnGetAvg").addEventListener("click", getAvgTemp);

  // Show strategy description when selection changes
  document.getElementById("strategy").addEventListener("change", updateStrategyInfo);
  updateStrategyInfo(); // Show initial info
});

function updateStrategyInfo() {
  const strategy = document.getElementById("strategy").value;
  const infoBox = document.getElementById("strategyInfo");

  const descriptions = {
    reliable: "🛡️ <strong>Reliable Strategy:</strong> Uses multiple weather providers (OpenWeather → WeatherAPI) with retry logic (3 attempts each) and circuit breaker protection. Best for production when you need guaranteed data.",
    fast: "⚡ <strong>Fast Strategy:</strong> Uses only OpenWeather API with no retries. Fails fast if the API is down. Best when speed is critical and you can handle failures.",
    cached: "💾 <strong>Cached Strategy:</strong> Checks database first for today's data. Only calls API if data is not cached. Best for minimizing API costs and improving response time."
  };

  infoBox.innerHTML = descriptions[strategy];
}

async function getWeathers() {
  try {
    const limit = document.getElementById("limit").value;
    const page = document.getElementById("page").value;

    document.getElementById("allWeathers").textContent = "Loading...";

    const res = await fetch(`${baseUrl}/?limit=${limit}&page=${page}`);
    const data = await res.json();

    document.getElementById("allWeathers").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById("allWeathers").textContent = `Error: ${err.message}`;
  }
}

async function getWeatherByCity() {
  try {
    const city = document.getElementById("cityName").value.trim();
    if (!city) {
      alert("Please enter a city name");
      return;
    }

    const strategy = document.getElementById("strategy").value;
    const demoCB = document.getElementById("demoCB").checked;

    document.getElementById("cityWeather").textContent = "Loading...";

    const url = `${baseUrl}/weathers?city=${encodeURIComponent(city)}&strategy=${strategy}${demoCB ? "&demoFail=true" : ""}`;
    console.log("Fetching:", url);

    const res = await fetch(url);
    const data = await res.json();

    // Highlight important info
    let displayText = JSON.stringify(data, null, 2);
    if (data.payload?._strategy) {
      displayText = `Strategy Used: ${data.payload._strategy}\n` +
        `Provider: ${data.payload._provider || 'N/A'}\n` +
        `Cache Hit: ${data.payload._cacheHit ? 'Yes' : 'No'}\n\n` +
        displayText;
    }

    document.getElementById("cityWeather").textContent = displayText;
  } catch (err) {
    document.getElementById("cityWeather").textContent = `Error: ${err.message}`;
  }
}

async function getAvgTemp() {
  try {
    const city = document.getElementById("avgCity").value.trim();
    const month = document.getElementById("avgMonth").value;
    const year = document.getElementById("avgYear").value;

    if (!city || !month || !year) {
      alert("Please fill in all fields");
      return;
    }

    document.getElementById("avgTemp").textContent = "Loading...";

    const res = await fetch(`${baseUrl}/weathers/${encodeURIComponent(city)}/${month}/${year}`);
    const data = await res.json();

    document.getElementById("avgTemp").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById("avgTemp").textContent = `Error: ${err.message}`;
  }
}