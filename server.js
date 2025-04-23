const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 👉 Serve frontend HTML file
app.use(express.static(path.join(__dirname)));

// Route to serve index.html by default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 🌟 API Credentials
const ASTROLOGY_PLANETS_URL = "https://json.astrologyapi.com/v1/planets/extended";
const ASTROLOGY_CHART_URL = "https://json.astrologyapi.com/v1/horo_chart_image/D1";
const ASTROLOGY_DASHA_URL = "https://json.astrologyapi.com/v1/current_vdasha";

const ASTROLOGY_USER_ID = "640013";
const ASTROLOGY_API_KEY = "b45f91ba310fe0b5ba3d25fdebdedf8037443422";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🌠 Main Prediction Route
app.post('/predict', async (req, res) => {
  const { name, day, month, year, hour, minute, latitude, longitude, timezone, language } = req.body;

  try {
    const commonPayload = { day, month, year, hour, min: minute, lat: latitude, lon: longitude, tzone: timezone };

    const [astroResponse, dashaResponse, chartResponse] = await Promise.all([
      axios.post(ASTROLOGY_PLANETS_URL, commonPayload, {
        auth: { username: ASTROLOGY_USER_ID, password: ASTROLOGY_API_KEY }
      }),
      axios.post(ASTROLOGY_DASHA_URL, commonPayload, {
        auth: { username: ASTROLOGY_USER_ID, password: ASTROLOGY_API_KEY }
      }),
      axios.post(ASTROLOGY_CHART_URL, commonPayload, {
        auth: { username: ASTROLOGY_USER_ID, password: ASTROLOGY_API_KEY }
      })
    ]);

    const planetaryData = astroResponse.data;
    const dashaData = dashaResponse.data;
    const chartSvg = chartResponse.data?.svg || null;

    const formattedPlanets = planetaryData.map((planet, index) => {
      return `${index + 1}. ${planet.name} is in ${planet.sign} (${planet.nakshatra_name}) at ${planet.fullDegree.toFixed(2)} degrees.`;
    }).join("\n");

    const formattedDashas = dashaData?.major_dasha?.map((dasha, index) => {
      return `${index + 1}. ${dasha.planet} dasha from ${dasha.start_date} to ${dasha.end_date}`;
    }).join("\n") || 'No dasha data available';

    const langPrompt = language.toLowerCase() === 'hindi'
      ? "आप एक विशेषज्ञ वैदिक ज्योतिषी हैं। नीचे दिए गए जन्म विवरण, ग्रह स्थिति और वर्तमान दशा के आधार पर एक विस्तृत भविष्यवाणी तैयार करें।"
      : "You are an expert Vedic astrologer. Based on the birth details, planetary positions, and current dasha periods provided below, generate a detailed and insightful prediction.";

    const fullPrompt = `Name: ${name}\nDOB: ${day}-${month}-${year}\nTime: ${hour}:${minute}\nLocation: ${latitude}, ${longitude}, Timezone: ${timezone}\n\nPlanetary Data:\n${formattedPlanets}\n\nCurrent Dasha Details:\n${formattedDashas}`;

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: langPrompt },
          { role: "user", content: fullPrompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const prediction = openaiResponse.data.choices[0].message.content;

    res.json({ prediction, chartSvg });

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// ✅ PORT Setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
