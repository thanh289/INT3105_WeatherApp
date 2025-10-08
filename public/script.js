const baseUrl = "http://localhost:5000/api/v1/vopak";
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnGetWeathers").addEventListener("click", getWeathers);
  document.getElementById("btnGetCity").addEventListener("click", getWeatherByCity);
  document.getElementById("btnGetAvg").addEventListener("click", getAvgTemp);
  document.getElementById("btnCreateWeather").addEventListener("click", createWeather);
});


async function getWeathers() {
  const limit = document.getElementById("limit").value;
  const page = document.getElementById("page").value;
  // request to backend by fetch()
  const res = await fetch(`${baseUrl}/?limit=${limit}&page=${page}`);
  const data = await res.json();
  document.getElementById("allWeathers").textContent = JSON.stringify(data, null, 2);
}

async function getWeatherByCity() {
  const city = document.getElementById("cityName").value;
  const res = await fetch(`${baseUrl}/weathers?city=${city}`);
  const data = await res.json();
  document.getElementById("cityWeather").textContent = JSON.stringify(data, null, 2);
}

async function getAvgTemp() {
  const city = document.getElementById("avgCity").value;
  const month = document.getElementById("avgMonth").value;
  const year = document.getElementById("avgYear").value;
  const res = await fetch(`${baseUrl}/weathers/${city}/${month}/${year}`);
  const data = await res.json();
  document.getElementById("avgTemp").textContent = JSON.stringify(data, null, 2);
}

async function createWeather() {
  try {
    const jsonData = JSON.parse(document.getElementById("weatherData").value);
    const res = await fetch(`${baseUrl}/weathers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonData),
    });
    const data = await res.json();
    document.getElementById("createResult").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById("createResult").textContent = "❌ Invalid JSON data!";
  }
}
