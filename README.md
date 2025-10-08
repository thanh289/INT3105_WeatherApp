# weather-rest-api-node

Base project was taken from https://github.com/MdSazzadIslam/weather-rest-api.git

📥 Pre-reqs

To build and run this app locally you will need a few things:

- Install Node.js
- Install MongoDB
- Install VS Code

👷 How to run

To run this application, you have to set your own MongoDB Atlas connection string and OpenWeatherAPI app id in environmental variables after that follow the bellow steps.

> git clone https://github.com/thanh289/INT3105_WeatherApp.git

> open the project in vs code or any editor of your favorite

> npm install

> create '.env' file and use the following format:
```env
PORT=5000
MONGO_URI=...
REDIS_PORT=6379
REDIS_HOST=localhost
REDIS_CACHE_TIMEOUT=120
NODE_ENV=Development
WEATHER_API=http://api.openweathermap.org/data/2.5/weather
APP_ID=...
```

> npm run dev  -> open localhost:5000 in browser

> To demo for circuit breaker, use the checkbox

