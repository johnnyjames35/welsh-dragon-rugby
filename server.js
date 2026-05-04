const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_SPORTS_KEY;

app.use(express.static('public'));
app.use(express.json());

// ── CACHE ────────────────────────────────────────────────────────────────────
let cache = {};
let cacheTime = {};
const CACHE_DURATION = 3 * 60 * 60 * 1000;
const SEASON = 2024;

const TEAM_IDS = {
  wales: 391, scarlets: 397, ospreys: 394,
  cardiff: 611, dragons: 396,
  'wales-u20': 453, 'wales-women': 459
};

const LEAGUE_IDS = { sixNations: 51, urc: 76, autumnNationals: 133 };

async function fetchAPI(endpoint) {
  const now = Date.now();
  if (cache[endpoint] && now - cacheTime[endpoint] < CACHE_DURATION) return cache[endpoint];
  try {
    const res = await fetch(`https://v1.rugby.api-sports.io/${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY }
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

// ── EXISTING ROUTES ───────────────────────────────────────────────────────────
app.get('/api/clear-cache', (req, res) => { cache = {}; cacheTime = {}; res.json({ message: 'Cache cleared' }); });

app.get('/api/fixtures', async (req, res) => {
  try {
    const teamId = req.query.team || TEAM_IDS.wales;
    const data = await fetchAPI(`games?team=${teamId}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/standings', async (req, res) => {
  try {
    const data = await fetchAPI(`standings?league=${LEAGUE_IDS.urc}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/sixnations', async (req, res) => {
  try {
    const data = await fetchAPI(`standings?league=${LEAGUE_IDS.sixNations}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/wales-fixtures', async (req, res) => {
  try {
    const data = await fetchAPI(`games?team=${TEAM_IDS.wales}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/team-fixtures', async (req, res) => {
  try {
    const team = req.query.team;
    const teamId = TEAM_IDS[team];
    if (!teamId) return res.json({ response: [] });
    const data = await fetchAPI(`games?team=${teamId}&season=${SEASON}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/search-team', async (req, res) => {
  try {
    const name = req.query.name || 'Wales';
    const data = await fetchAPI(`teams?search=${encodeURIComponent(name)}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/search-league', async (req, res) => {
  try {
    const name = req.query.name || 'Six Nations';
    const data = await fetchAPI(`leagues?search=${encodeURIComponent(name)}`);
    res.json(data || { response: [] });
  } catch { res.json({ response: [] }); }
});

app.get('/api/debug-wales', async (req, res) => {
  try {
    const data = await fetchAPI(`games?team=${TEAM_IDS.wales}&season=${SEASON}`);
    const first = data?.response?.[0];
    res.json({
      teamIdUsed: TEAM_IDS.wales,
      totalGames: data?.response?.length || 0,
      errors: data?.errors,
      firstGame: first ? {
        home: first.teams?.home?.name,
        away: first.teams?.away?.name,
        league: first.league?.name,
        date: first.date
      } : null
    });
  } catch (err) { res.json({ error: err.message }); }
});

// ── STARS OF THE WEEK ─────────────────────────────────────────────────────────
// Default stars — update via POST /api/admin/stars with secret key
let starsOfWeek = {
  updatedDate: new Date().toISOString().split('T')[0],
  stars: [
    {
      team: 'Wales',
      teamKey: 'wales',
      playerName: 'Tomos Williams',
      position: 'Scrum-half',
      why: 'Controlled the tempo brilliantly, two try assists and 9 from 9 in the box kick contest.',
      stats: '9 kicks won | 2 assists | 82% tackle success',
      rating: 9
    },
    {
      team: 'Scarlets',
      teamKey: 'scarlets',
      playerName: 'Gareth Davies',
      position: 'Scrum-half',
      why: 'Explosive around the fringes with two tries and relentless work rate throughout.',
      stats: '2 tries | 67m carries | 100% tackle success',
      rating: 9
    },
    {
      team: 'Ospreys',
      teamKey: 'ospreys',
      playerName: 'Alun Wyn Jones',
      position: 'Lock',
      why: 'Dominant lineout presence and led from the front with 18 carries in a physical encounter.',
      stats: '18 carries | 14 tackles | 100% lineout',
      rating: 8
    },
    {
      team: 'Cardiff Rugby',
      teamKey: 'cardiff',
      playerName: 'Josh Adams',
      position: 'Wing',
      why: 'Hat-trick hero with clinical finishing and strong aerial contest throughout the match.',
      stats: '3 tries | 124m | 4 defenders beaten',
      rating: 10
    },
    {
      team: 'Dragons',
      teamKey: 'dragons',
      playerName: 'Taine Basham',
      position: 'Flanker',
      why: 'Tireless display at the breakdown, winning 4 turnovers and making 19 tackles.',
      stats: '19 tackles | 4 turnovers | 8 carries',
      rating: 9
    },
    {
      team: 'World Rugby',
      teamKey: 'world',
      playerName: 'Antoine Dupont',
      position: 'Scrum-half',
      why: 'Simply unplayable. Two tries, two assists and the best player on the planet in full flow.',
      stats: '2 tries | 2 assists | 156m | 6 defenders beaten',
      rating: 10
    }
  ]
};

app.get('/api/stars', (req, res) => {
  res.json(starsOfWeek);
});

app.post('/api/admin/stars', (req, res) => {
  const { secret, stars, updatedDate } = req.body;
  if (secret !== (process.env.ADMIN_SECRET || 'wdr-admin-2026')) {
    return res.status(403).json({ error: 'Unauthorised' });
  }
  if (stars) starsOfWeek.stars = stars;
  if (updatedDate) starsOfWeek.updatedDate = updatedDate;
  else starsOfWeek.updatedDate = new Date().toISOString().split('T')[0];
  res.json({ success: true, updated: starsOfWeek.updatedDate });
});

// ── QUIZ ──────────────────────────────────────────────────────────────────────
const quizQuestions = [
  { q: "How many times has Wales won the Six Nations Grand Slam?", options: ["9", "11", "12", "8"], answer: 1, fact: "Wales have won 12 Grand Slams, more than any other nation." },
  { q: "Who is Wales' all-time leading try scorer?", options: ["Shane Williams", "Gareth Thomas", "George North", "Gerald Davies"], answer: 0, fact: "Shane Williams scored 58 tries for Wales between 2000 and 2011." },
  { q: "What year did Wales win their first Rugby World Cup?", options: ["1987", "1999", "2003", "Wales have never won it"], answer: 3, fact: "Wales have never won the Rugby World Cup. Their best finish was third place in 1987." },
  { q: "Which Welsh stadium is known as 'The Home of Welsh Rugby'?", options: ["Cardiff Arms Park", "Principality Stadium", "Rodney Parade", "Parc y Scarlets"], answer: 1, fact: "The Principality Stadium in Cardiff holds 74,500 fans and has a retractable roof." },
  { q: "What does 'Cymru am Byth' mean?", options: ["Wales Forever", "Come on Wales", "Land of Song", "Red Dragons"], answer: 0, fact: "'Cymru am Byth' translates as 'Wales Forever' — a proud Welsh motto." },
  { q: "Who scored the famous try for Wales against Scotland in the 1971 Grand Slam?", options: ["Barry John", "Gareth Edwards", "JPR Williams", "Phil Bennett"], answer: 1, fact: "Gareth Edwards scored what many consider the greatest try ever scored at Cardiff Arms Park." },
  { q: "How many players are on a rugby union team?", options: ["13", "14", "15", "16"], answer: 2, fact: "Rugby union is played with 15 players per side — 8 forwards and 7 backs." },
  { q: "What is the name of the Welsh national rugby anthem?", options: ["Land of My Fathers", "Men of Harlech", "Bread of Heaven", "Calon Lân"], answer: 0, fact: "'Hen Wlad Fy Nhadau' (Land of My Fathers) was the first national anthem ever sung at a rugby match in 1905." },
  { q: "Which club does Alun Wyn Jones play for?", options: ["Cardiff Rugby", "Scarlets", "Ospreys", "Dragons"], answer: 2, fact: "Alun Wyn Jones is an Ospreys legend and Wales' most capped player of all time." },
  { q: "What colour are Wales' home jerseys?", options: ["Dark Red", "Scarlet Red", "Crimson", "Blood Red"], answer: 1, fact: "Wales play in scarlet red — one of the most iconic kits in world rugby." },
  { q: "In what year did Wales last win the Rugby World Cup quarter-final?", options: ["2019", "2015", "2011", "2023"], answer: 0, fact: "Wales reached the semi-finals in 2019, losing to South Africa who went on to win the tournament." },
  { q: "What is a 'Garryowen' in rugby?", options: ["A high up-and-under kick", "A scrum penalty move", "A lineout play", "A chip and chase"], answer: 0, fact: "A Garryowen is a high kick intended to put pressure on the opposition under the ball — named after the Irish club." },
  { q: "How many points is a try worth in rugby union?", options: ["3", "4", "5", "6"], answer: 2, fact: "A try is worth 5 points. A successful conversion kick adds 2 more points." },
  { q: "Which nation has won the most Rugby World Cups?", options: ["New Zealand", "South Africa", "Australia", "England"], answer: 0, fact: "New Zealand have won the Rugby World Cup three times — in 1987, 2011 and 2015." },
  { q: "What is the URC?", options: ["Union Rugby Championship", "United Rugby Championship", "Ulster Rugby Council", "Universal Rugby Cup"], answer: 1, fact: "The United Rugby Championship features 16 teams from Ireland, Wales, Scotland, Italy and South Africa." }
];

// Rotate quiz — different set of 8 questions each week
app.get('/api/quiz', (req, res) => {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const seed = week % quizQuestions.length;
  const rotated = [...quizQuestions.slice(seed), ...quizQuestions.slice(0, seed)];
  const weeklySet = rotated.slice(0, 8);
  res.json({ week, questions: weeklySet });
});

// ── SCORE PREDICTOR ───────────────────────────────────────────────────────────
let predictions = [];

app.get('/api/predictions', (req, res) => {
  const matchId = req.query.matchId;
  if (matchId) {
    const matchPreds = predictions.filter(p => p.matchId === matchId);
    // Aggregate
    const total = matchPreds.length;
    const walesWins = matchPreds.filter(p => p.walesScore > p.oppScore).length;
    const draws = matchPreds.filter(p => p.walesScore === p.oppScore).length;
    const oppWins = matchPreds.filter(p => p.walesScore < p.oppScore).length;
    const avgWales = total ? Math.round(matchPreds.reduce((s, p) => s + p.walesScore, 0) / total) : 0;
    const avgOpp = total ? Math.round(matchPreds.reduce((s, p) => s + p.oppScore, 0) / total) : 0;
    return res.json({ total, walesWins, draws, oppWins, avgWales, avgOpp, predictions: matchPreds.slice(-20) });
  }
  res.json({ predictions: predictions.slice(-50) });
});

app.post('/api/predictions', (req, res) => {
  const { matchId, matchLabel, walesScore, oppScore, name } = req.body;
  if (!matchId || walesScore === undefined || oppScore === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const pred = {
    id: Date.now(),
    matchId, matchLabel,
    walesScore: parseInt(walesScore),
    oppScore: parseInt(oppScore),
    name: name || 'Anonymous Fan',
    date: new Date().toISOString()
  };
  predictions.push(pred);
  // Keep last 500 predictions
  if (predictions.length > 500) predictions = predictions.slice(-500);
  res.json({ success: true, pred });
});

// ── NEWS FEED (BBC Sport Rugby RSS) ───────────────────────────────────────────
let newsCache = null;
let newsCacheTime = 0;
const NEWS_CACHE = 30 * 60 * 1000; // 30 mins

app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    if (newsCache && now - newsCacheTime < NEWS_CACHE) {
      return res.json(newsCache);
    }
    const rssFeed = await fetch('https://feeds.bbci.co.uk/sport/rugby-union/rss.xml', {
      headers: { 'User-Agent': 'WelshDragonRugby/1.0' }
    });
    const xml = await rssFeed.text();
    // Parse RSS items
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
      const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/))?.[1] || '';
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
      if (title) items.push({ title, link, desc, pubDate });
    }
    newsCache = { source: 'BBC Sport Rugby', items, fetched: new Date().toISOString() };
    newsCacheTime = now;
    res.json(newsCache);
  } catch (err) {
    console.error('News feed error:', err);
    // Fallback static news if RSS fails
    res.json({
      source: 'BBC Sport Rugby',
      items: [
        { title: 'Wales prepare for Nations Championship opener against Fiji', link: 'https://www.bbc.co.uk/sport/rugby-union', desc: 'Wales head coach Warren Gatland has named his squad for the inaugural World Rugby Nations Championship.', pubDate: new Date().toUTCString() },
        { title: 'United Rugby Championship reaches climax with Welsh regions in contention', link: 'https://www.bbc.co.uk/sport/rugby-union', desc: 'The Scarlets lead the Welsh challenge as the URC season reaches its final stages.', pubDate: new Date().toUTCString() }
      ],
      fetched: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Welsh Dragon Rugby running on port ${PORT}`);
});
