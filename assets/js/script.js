// ---- populate the city dropdown ----
for (const element of locations) {
    const elem = document.createElement("option");
    elem.innerText = element;
    elem.value = element.split(",")[0].trim();
    document.getElementById("location").appendChild(elem);
}

// ============================================================
// Sun / Moon tracker helpers
// ============================================================

// Classify an Open-Meteo weather_code into the badge categories
// the Sun/Moon tracker knows how to draw (all drawn in pure CSS,
// no extra image assets required).
const classifyCondition = (code) => {
    if ([95, 96, 99].includes(code)) return "thunder";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
    if ([61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55, 56, 57].includes(code)) return "rain";
    if ([45, 48].includes(code)) return "fog";
    if ([1, 2, 3].includes(code)) return "cloudy";
    return "clear";
};

const badgeChildren = (category) => {
    if (category === "rain") return '<span class="drop"></span><span class="drop"></span><span class="drop"></span>';
    if (category === "snow") return '<span class="flake"></span><span class="flake"></span><span class="flake"></span>';
    if (category === "thunder") return '<span class="bolt"></span>';
    return "";
};

// Approximate moon phase (0 = new moon, 0.5 = full moon, 1 = next new moon)
// using a known reference new moon and the synodic month length.
const getMoonPhase = (date) => {
    const synodicMonth = 29.53058867;
    const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
    const daysSince = (date.getTime() - knownNewMoon) / 86400000;
    let phase = (daysSince % synodicMonth) / synodicMonth;
    if (phase < 0) phase += 1;

    const names = [
        "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
        "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"
    ];
    const name = names[Math.round(phase * 8) % 8];

    return { phase, name };
};

// Places the sun/moon on the semicircular dial, colors the elapsed
// arc, and renders the current-conditions badge on the celestial body.
const updateSunTracker = (data, now) => {
    const sunriseToday = new Date(data.daily.sunrise[0]);
    const sunsetToday = new Date(data.daily.sunset[0]);
    const sunriseTomorrow = data.daily.sunrise[1]
        ? new Date(data.daily.sunrise[1])
        : new Date(sunriseToday.getTime() + 86400000);

    const isDay = now >= sunriseToday && now <= sunsetToday;

    let periodStart, periodEnd;
    if (isDay) {
        periodStart = sunriseToday;
        periodEnd = sunsetToday;
    } else if (now < sunriseToday) {
        // still before today's sunrise -> approximate last night's start
        periodStart = new Date(sunsetToday.getTime() - 86400000);
        periodEnd = sunriseToday;
    } else {
        periodStart = sunsetToday;
        periodEnd = sunriseTomorrow;
    }

    let progress = (now - periodStart) / (periodEnd - periodStart);
    progress = Math.min(1, Math.max(0, progress));

    // Position along a semicircle: cx=150, cy=150, r=130 in the 300x160 viewBox.
    // progress 0 -> left horizon, 0.5 -> peak (top center), 1 -> right horizon.
    const angle = Math.PI - progress * Math.PI;
    const cx = 150, cy = 150, r = 130;
    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);

    const body = document.getElementById("celestialBody");
    body.style.left = `${(x / 300) * 100}%`;
    body.style.top = `${(y / 160) * 100}%`;
    body.classList.toggle("is-night", !isDay);

    const trackProgress = document.getElementById("trackProgress");
    trackProgress.style.strokeDashoffset = `${100 - progress * 100}`;
    trackProgress.classList.toggle("is-night", !isDay);

    const pill = document.getElementById("daynightPill");
    pill.textContent = isDay ? "Day" : "Night";
    pill.classList.toggle("is-night", !isDay);

    document.getElementById("suntrackerNow").textContent =
        now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    // condition badge (cloud / rain / snow / thunder / fog) riding on the sun or moon
    const category = classifyCondition(data.current.weather_code);
    const badge = document.getElementById("celestialBadge");
    badge.className = `celestial-badge condition-${category}`;
    badge.innerHTML = badgeChildren(category);

    const phaseLabel = document.getElementById("suntrackerPhase");
    if (isDay) {
        phaseLabel.textContent = "";
    } else {
        const moon = getMoonPhase(now);
        phaseLabel.textContent = moon.name;

        // Moon illumination is faked with an inset box-shadow: the light disc is
        // offset horizontally by `offset` px. offset 0 => fully overlapping the
        // dark disc (full moon); offset +/- the disc's diameter => fully hidden
        // (new moon). Which side it recedes to flips between waxing/waning.
        const core = document.getElementById("celestialCore");
        const size = core.getBoundingClientRect().width || 40;
        const illuminated = (1 - Math.cos(2 * Math.PI * moon.phase)) / 2;
        const direction = moon.phase < 0.5 ? 1 : -1;
        const offsetPx = size * (1 - illuminated) * direction;
        core.style.setProperty("--moon-offset", `${offsetPx.toFixed(1)}px`);
        core.style.setProperty("--moon-light", "#f2eddf");
    }
};

// ============================================================
// Main weather fetch + render
// ============================================================


const updateWeather = async (lat, long) => {
    

    const URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=is_day,temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,weather_code,wind_speed_10m,visibility&hourly=temperature_2m,weather_code,wind_speed_10m,visibility,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&forecast_days=7&timezone=auto`;

    const response = await fetch(URL);
    const data = await response.json();
    localStorage.setItem("latitude",lat);
    localStorage.setItem("longitude",long);

    // Date & Time
    const date = new Date(data.current.time);
    const hours = date.getHours();

    // hourly forecast
    let j = 0;
    for (let l = 0; l < data.hourly.time.length; l++) {
        const date2 = new Date(data.hourly.time[l]);
        if (date2.getHours() == hours) {
            j = l;
            break;
        }
    }

    for (let k = 0; k <= 7; k++) {
        const date1 = new Date(data.hourly.time[j]);
        const time1 = date1.toLocaleTimeString("en-US", { hour: "numeric" });

        if (k == 0) {
            document.getElementById(`time${k}`).innerHTML = "Now";
        } else {
            document.getElementById(`time${k}`).innerHTML = time1;
        }

        document.getElementById(`${k}`).innerHTML = `${data.hourly.temperature_2m[j]}<sup> &deg; </sup>`;
        j++;
    }

    const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

    const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
    localStorage.setItem("date",formattedDate);
    localStorage.setItem("time",formattedTime);
    

    // update main weather icon
    const code = data.current.weather_code;
    const weather = document.querySelector(".weathericon1");

    if ([95, 96, 99].includes(code)) {
        weather.src = "assets/images/weather-thunder.png";
    }
    else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        weather.src = "assets/images/weather-rain.png";
    }
    else if ([51, 53, 55, 56, 57].includes(code)) {
        weather.src = "assets/images/weather-drizzle.png";
    }
    else if (data.current.is_day == 1) {
        weather.src = "assets/images/weather-clear.svg";
    }
    else {
        weather.src = "assets/images/weather-night.png";
    }

    document.getElementById("datetime").textContent =
        `${formattedDate} • ${formattedTime}`;

    document.getElementById("currenttemp").innerHTML =
        `${data.current.temperature_2m}<sup>&deg; C</sup>`;
    
    document.getElementById("apptemp").innerText =
    `${data.current.apparent_temperature} °C`;
    
    
    document.getElementById("rhumidity").innerText =
    `${data.current.relative_humidity_2m}%`;
    
    
    document.getElementById("pressure").innerText =
    `${Math.round(data.current.surface_pressure)} hPa`;
  
    
    document.getElementById("mwindspeed").innerText =
    `${data.current.wind_speed_10m} km/h`;
    
    const sunrise = new Date(data.daily.sunrise[0]).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
    localStorage.setItem("sunrise",sunrise);
    
    const sunset = new Date(data.daily.sunset[0]).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
    localStorage.setItem("sunset",sunset);

    document.getElementById("sunrisetime").innerHTML = `Sunrise <br> ${sunrise}`;
    document.getElementById("sunsettime").innerHTML = `Sunset <br> ${sunset}`;

    document.getElementById("cloudcover").innerText = `${data.hourly.cloud_cover[0]}%`;
    document.getElementById("Uvindex").innerText = `${Math.round(data.daily.uv_index_max[0])} High`;
    document.getElementById("visibility").innerText = `${Math.round(data.current.visibility / 1000)} km`;

    // sun / moon tracker
    updateSunTracker(data, date);

    // 7 day forecast
    for (let i = 0; i < 7; i++) {
        document.getElementById(`${i}day`).innerHTML =
            `${data.daily.temperature_2m_max[i]} <sup>&deg;</sup>`;
        const date1 = new Date(data.daily.time[i]);
        const day = date1.toLocaleDateString("en-US", { weekday: "short" });
        document.getElementById(`day${i}`).innerText = day;
    }
};

// ---- current location fetch from browser ----
const getCurrentLocation = () => {

    const successCallback = (position) => {
        const lat = position.coords.latitude;
        const long = position.coords.longitude;
        localStorage.setItem("latitude",lat);
        localStorage.setItem("longitude",long);
        
     updateWeather(lat, long);
        const getCity = async () => {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json`;response = await fetch(url);
            let data = await response.json();
            document.getElementById("primarytitle").innerText = (data.address.city);
        };
        getCity();
    };

    const errorCallback = (error) => {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                console.error("User denied the request for Geolocation.");
                break;
            case error.POSITION_UNAVAILABLE:
                console.error("Location information is unavailable.");
                break;
            case error.TIMEOUT:
                console.error("The request to get user location timed out.");
                break;
            case error.UNKNOWN_ERROR:
                console.error("An unknown error occurred.");
                break;
        }
    };

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
    } else {
        alert("Geolocation not supported by browser");
    }
};

// ---- dropdown selection ----
const dropdownWeatherUpdate = async () => {
    document.getElementById("primarytitle").innerText = document.getElementById("location").value;
    const choice = document.getElementById("location").value;

    const URL1 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(choice)}&count=1&language=en&format=json`;
    let response1 = await fetch(URL1);
    let data1 = await response1.json();
    updateWeather(data1.results[0].latitude, data1.results[0].longitude);
};

document.getElementById("locationbtn").addEventListener("click", getCurrentLocation);
document.getElementById("locationaccess").addEventListener("click", getCurrentLocation);
document.getElementById("location").addEventListener("change", dropdownWeatherUpdate);
document.addEventListener("DOMContentLoaded",getCurrentLocation);

// ---- search input ----
document.getElementById("input").addEventListener("keyup", (event) => {
    if (event.key == "Enter") {
        const userinput = document.getElementById("input").value;
        if (userinput.trim() === "") {
            document.getElementById("error").innerText = "please enter valid city name";
            return;
        }

        const URL1 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(userinput)}&count=1&language=en&format=json`;
        const getData2 = async () => {
            let response1 = await fetch(URL1);
            let data1 = await response1.json();
            document.getElementById("primarytitle").innerText = userinput.trim();
            updateWeather(data1.results[0].latitude, data1.results[0].longitude);
        };
        getData2();
        document.getElementById("input").value = "";
    }
});
// const map = L.map("map");