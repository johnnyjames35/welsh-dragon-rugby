const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_SPORTS_KEY;

app.use(express.static('public'));

let cache = {};
let cacheTime = {};
const CACHE_DURATION = 3 * 60 * 60 * 1000;

const TEAM_IDS = {
  wales: 22,
  scarlets: 1016,
  ospreys: 1017,
  cardiff: 1018,
  dragons: 1019
};

const LEAGUE_IDS = {
  sixNations: 115,
  urc: 108,
  autumnNationals: 133
};

async function fetchAPI(endpoint) {
  const now = Date.now();
  if (cache[endpoint] && now - cacheTime[endpoint] < CACHE_DURATION) {
    return cache[endpoint];
  }
  try {
    const res = await fetch(`https://v1.rugby.api-sports.io/${endpoint}`, {
      headers: {
        'x-apisports-key': API_KEY
      }
    });
    const data = await res.json();
    cache[endpoint] = data;
    cacheTime[endpoint] = now;
    return data;
  } catch (err) {
    console.error('API error:', err);
    return null;
  }
}

app.get('/api/fixtures', async (req, res) => {
  try {
    const teamId = req.query.team || TEAM_IDS.wales;
    const season = new Date().getFullYear();
    const data = await fetchAPI(`games?team=${teamId}&season=${season}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/standings', async (req, res) => {
  try {
    const season = new Date().getFullYear();
    const data = await fetchAPI(`standings?league=${LEAGUE_IDS.urc}&season=${season}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/sixnations', async (req, res) => {
  try {
    const season = new Date().getFullYear();
    const data = await fetchAPI(`standings?league=${LEAGUE_IDS.sixNations}&season=${season}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/wales-fixtures', async (req, res) => {
  try {
    const season = new Date().getFullYear();
    const data = await fetchAPI(`games?team=${TEAM_IDS.wales}&season=${season}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Welsh Dragon Rugby running on port ${PORT}`);
});
