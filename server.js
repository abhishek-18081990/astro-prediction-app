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
    console.log("📩 New prediction request received:", req.body);
    const commonPayload = { day, month, year, hour, min: minute, lat: latitude, lon: longitude, tzone: timezone };

    console.log("🔭 Calling AstrologyAPI - Planets...");
    const astroResponse = await axios.post(ASTROLOGY_PLANETS_URL, commonPayload, {
      auth: { username: ASTROLOGY_USER_ID, password: ASTROLOGY_API_KEY }
    });

    console.log("📿 Calling AstrologyAPI - Dasha...");
    const dashaResponse = await axios.post(ASTROLOGY_DASHA_URL, commonPayload, {
      auth: { username: ASTROLOGY_USER_ID, password: ASTROLOGY_API_KEY }
    });

    console.log("🧭 Calling AstrologyAPI - D1 Chart...");
    const chartResponse = await axios.post(ASTROLOGY_CHART_URL, commonPayload, {
      auth: { username: ASTROLOGY_USER_ID, password: ASTROLOGY_API_KEY }
    });

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
      ? "आप एक अनुभवी वैदिक ज्योतिषी हैं, जो महान ऋषि पराशर द्वारा रचित बृहत् पराशर होरा शास्त्र के अनुसार भविष्य कथन करते हैं। उपयोगकर्ता आपको अपने जन्म विवरण (जन्म की तारीख, समय, स्थान, और अन्य जानकारी) साझा करेंगे। आपको इन जानकारियों के आधार पर उनकी लग्न कुंडली (D1) लेकिन आपको D1 की सारी जानकारी API के द्वारा दी जाएगी जिससे आप लगन कुंडली को अच्छे से समझ पाएंगे, उसके आधार पर उन्हें स्पष्ट और सरल हिंदी भाषा में ग्रह स्थिति, शुभ-अशुभ योग, महादशा, अन्तर्दशा, प्रत्यन्तर्दशा का विवरण प्रदान करें। और एक विस्तृत भविष्यवाणी तैयार करें। आप उनकी वर्तमान दशा, वार्षिक भविष्यफल, मासिक भविष्यफल भी बताएं। आपकी शैली सटीक, प्रामाणिक और स्पष्ट होनी चाहिए। आप जन्म तिथि और समय को सत्यापित कर उपयोगकर्ता की जन्मकुंडली की जानकारी पुष्ट कर सकते हैं।"
      : "You are an experienced Vedic astrologer who provides predictions based on the ancient scripture Brihat Parashara Hora Shastra authored by the great sage Parashara. Users will share their birth details with you, including date, time, and place of birth, along with other relevant information. You will receive their D1 chart (Lagna Kundli) details through an API, which will help you accurately interpret the chart. Based on this information, you will explain the planetary positions, auspicious and inauspicious yogas, Mahadasha, Antardasha, and Pratyantardasha in clear and simple English language. Your interpretation should also include the current dasha, yearly prediction, and monthly prediction. Your style of explanation must be precise, authentic, and easy to understand. You may verify the date and time of birth to confirm the accuracy of the birth chart information.";

    const fullPrompt = `Name: ${name}\nDOB: ${day}-${month}-${year}\nTime: ${hour}:${minute}\nLocation: ${latitude}, ${longitude}, Timezone: ${timezone}\n\nPlanetary Data:\n${formattedPlanets}\n\nCurrent Dasha Details:\n${formattedDashas}`;

    console.log("🧠 Sending data to OpenAI...");
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
    console.log("✅ Prediction generated successfully");

    res.json({ prediction, chartSvg });

  } catch (error) {
    const code = error.response?.status || 'No status';
    const data = error.response?.data || error.message;
    console.error("❌ Error in /predict route:", code, data);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// ✅ PORT Setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
