const updateWeather = () => {
    const lat = localStorage.getItem("latitude")
    const long = localStorage.getItem("longitude")
    const date = localStorage.getItem("date");
    const time = localStorage.getItem("time")
    console.log(date)

    // ====================================================getting weather data=========================================================
    const getCity = async () => {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json`;
        let response = await fetch(url);
        let data = await response.json();
        document.getElementById("date").innerHTML = date;
        document.getElementById("cityname").innerHTML = data.address.city;
        document.getElementById("updatetimebtn").innerHTML = `updated ${time} L.T.`;
    };
    getCity();
    const getInfo = async () => {
        const URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=is_day,temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,weather_code,wind_speed_10m,visibility&hourly=temperature_2m,weather_code,wind_speed_10m,visibility,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&forecast_days=7&timezone=auto`;

        const response = await fetch(URL);
        const data = await response.json();


        // ====================================update main weather icon===========================================================
        const code = data.current.weather_code;
        const weather = document.getElementById("mainlogo");

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

        //=======================================updating hero card========================================
        console.log(data);
        document.getElementById("currenttemp").innerHTML = `${data.current.temperature_2m} &deg;C`
        document.getElementById("apparenttemp").innerHTML = `Feels like <br>${data.current.apparent_temperature} &deg; C`;
        document.getElementById("currenttemp").innerHTML = `${data.current.temperature_2m} &deg;C`
        document.getElementById("pressure").innerHTML = `Pressure <br>
                        <b>${data.current.surface_pressure}hPa</b>`;
        document.getElementById("humidity").innerHTML = `Humidity <br>
                        <b>${data.current.relative_humidity_2m} %</b>`;
        document.getElementById("visibility").innerHTML = ` 
                        visibility<br>
                        <b>${Math.round(data.current.visibility / 1000)} km</b>`;
        document.getElementById("maxtemp").innerHTML = `Max <br>
                        <b> ${data.daily.temperature_2m_max[0]} &deg; C</b>`
        document.getElementById("sunrise").innerHTML = `sunrise <br>
                        <b> ${localStorage.getItem('sunrise')}</b>`
        document.getElementById("sunset").innerHTML = `sunset <br>
                        <b> ${localStorage.getItem('sunset')}</b>`
        document.getElementById("uvindex").innerHTML = `uv index <br>
                        <b> ${data.daily.uv_index_max[0]} high</b>`


        //========================================== update hour cards=========================================================
        const currentHour = new Date(data.current.time).getHours();

        let startIndex = 0;

        for (let i = 0; i < data.hourly.time.length; i++) {

            if (new Date(data.hourly.time[i]).getHours() === currentHour) {
                startIndex = i;
                break;
            }
        }

        for (let i = 0; i <= 17; i++) {

            const hour = new Date(data.hourly.time[startIndex]);

            document.getElementById(`time${i}`).innerText =
                (i === 0)
                    ? "Now"
                    : hour.toLocaleTimeString("en-US", { hour: "numeric" });

            document.getElementById(`${i}`).innerHTML =
                `${data.hourly.temperature_2m[startIndex]}<sup>&deg;</sup>`;

            startIndex++;
        }

        // ========================================update daily forecast cards=====================================================================
        for (let i = 1; i <= 7; i++) {
            const date = new Date(data.daily.time[i - 1])
            const weekday = date.toLocaleDateString("en-US", {
                weekday: "long"
            })
            const monthday = date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric"
            })
            document.getElementById(`date${i}`).innerHTML = weekday
            document.getElementById(`day${i}`).innerHTML = monthday

            document.getElementById(`mtemp${i}`).innerHTML =
                `${data.daily.temperature_2m_max[i - 1]}&deg;C / ${data.daily.temperature_2m_min[i - 1]}&deg;C`;

            document.getElementById(`rain${i}`).innerText =
                `${data.daily.precipitation_probability_max[i - 1]}%`;

            let code = data.daily.weather_code[i - 1];

            if ([95, 96, 99].includes(code)) {
                document.getElementById(`image${i}`).src = "assets/images/weather-thunder.png";
            }
            else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
                document.getElementById(`image${i}`).src = "assets/images/weather-rain.png";
            }
            else if ([51, 53, 55, 56, 57].includes(code)) {
                document.getElementById(`image${i}`).src = "assets/images/weather-drizzle.png";
            }
            else {
                document.getElementById(`image${i}`).src = "assets/images/weather-clear.svg";
            }
        }

    }
    getInfo();


}

document.addEventListener("DOMContentLoaded", updateWeather)