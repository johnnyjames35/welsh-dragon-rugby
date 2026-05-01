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
const SEASON = 2024;

const TEAM_IDS = {
  wales: 391,
  scarlets: 397,
  ospreys: 394,
  cardiff: 611,
  dragons: 396,
  'wales-u20': 453,
  'wales-women': 459
};

const LEAGUE_IDS = {
  sixNations: 51,
  urc: 76,
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

app.get('/api/clear-cache', (req, res) => {
  cache = {};
  cacheTime = {};
  res.json({ message: 'Cache cleared' });
});

app.get('/api/debug-wales', async (req, res) => {
  try {
    const data = await fetchAPI(`games?team=${TEAM_IDS.wales}&season=${SEASON}`);
    const first = data && data.response && data.response[0];
    res.json({
      teamIdUsed: TEAM_IDS.wales,
      totalGames: data && data.response ? data.response.length : 0,
      errors: data && data.errors,
      firstGame: first ? {
        home: first.teams && first.teams.home && first.teams.home.name,
        away: first.teams && first.teams.away && first.teams.away.name,
        league: first.league && first.league.name,
        date: first.date
      } : null
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/search-team', async (req, res) => {
  try {
    const name = req.query.name || 'Wales';
    const data = await fetchAPI(`teams?search=${encodeURIComponent(name)}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/search-league', async (req, res) => {
  try {
    const name = req.query.name || 'Six Nations';
    const data = await fetchAPI(`leagues?search=${encodeURIComponent(name)}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/fixtures', async (req, res) => {
  try {
    const teamId = req.query.team || TEAM_IDS.wales;
    const data = await fetchAPI(`games?team=${teamId}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/standings', async (req, res) => {
  try {
    const data = await fetchAPI(`standings?league=${LEAGUE_IDS.urc}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/sixnations', async (req, res) => {
  try {
    const data = await fetchAPI(`standings?league=${LEAGUE_IDS.sixNations}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/wales-fixtures', async (req, res) => {
  try {
    const data = await fetchAPI(`games?team=${TEAM_IDS.wales}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.get('/api/team-fixtures', async (req, res) => {
  try {
    const team = req.query.team;
    const teamId = TEAM_IDS[team];
    if (!teamId) {
      return res.json({ response: [] });
    }
    const data = await fetchAPI(`games?team=${teamId}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch (err) {
    res.json({ response: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Welsh Dragon Rugby running on port ${PORT}`);
});
