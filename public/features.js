// ============================================================
// Welsh Dragon Rugby — New Features
// Stars of the Week | Quiz | Score Predictor | News Feed
// ============================================================

// ── TEAM COLOURS & CRESTS ────────────────────────────────────
const TEAM_CONFIG = {
  wales:    { colour: '#b5132b', bg: '#1a0508', label: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales' },
  scarlets: { colour: '#c8102e', bg: '#1a0508', label: '❤️ Scarlets' },
  ospreys:  { colour: '#000000', bg: '#111111', label: '⚫ Ospreys' },
  cardiff:  { colour: '#003087', bg: '#050a1a', label: '🔵 Cardiff Rugby' },
  dragons:  { colour: '#cc0000', bg: '#1a0505', label: '🐉 Dragons' },
  world:    { colour: '#c9a84c', bg: '#0d2b1e', label: '🌍 World Rugby' }
};

// ── STARS OF THE WEEK ────────────────────────────────────────
async function loadStarsOfWeek() {
  const container = document.getElementById('stars-container');
  if (!container) return;

  try {
    const res = await fetch('/api/stars');
    const data = await res.json();

    const dateStr = new Date(data.updatedDate).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    container.innerHTML = `
      <div class="stars-header">
        <span class="stars-updated">Updated: ${dateStr}</span>
      </div>
      <div class="stars-grid">
        ${data.stars.map(star => renderStarCard(star)).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<p class="error-msg">Stars of the Week coming soon...</p>';
  }
}

function renderStarCard(star) {
  const config = TEAM_CONFIG[star.teamKey] || TEAM_CONFIG.world;
  const stars = '★'.repeat(Math.round(star.rating)) + '☆'.repeat(10 - Math.round(star.rating));
  return `
    <div class="star-card" style="--team-colour: ${config.colour}; --team-bg: ${config.bg}">
      <div class="star-card-header">
        <span class="star-team-label">${config.label}</span>
        <span class="star-rating" title="Rating ${star.rating}/10">${stars.slice(0,5)}</span>
      </div>
      <div class="star-avatar">
        <div class="star-avatar-circle" style="background: ${config.colour}20; border-color: ${config.colour}">
          <span class="star-initial">${star.playerName.split(' ').map(n=>n[0]).join('')}</span>
        </div>
      </div>
      <div class="star-info">
        <h3 class="star-name">${star.playerName}</h3>
        <span class="star-position">${star.position}</span>
        <p class="star-why">${star.why}</p>
        <div class="star-stats">${star.stats}</div>
      </div>
      <div class="star-rating-badge" style="background: ${config.colour}">
        ${star.rating}<span>/10</span>
      </div>
    </div>
  `;
}

// ── RUGBY QUIZ ────────────────────────────────────────────────
let quizState = {
  questions: [], current: 0,
  score: 0, answered: false,
  finished: false, selected: null
};

async function loadQuiz() {
  const container = document.getElementById('quiz-container');
  if (!container) return;
  try {
    const res = await fetch('/api/quiz');
    const data = await res.json();
    quizState.questions = data.questions;
    quizState.current = 0;
    quizState.score = 0;
    quizState.finished = false;
    renderQuiz();
  } catch {
    container.innerHTML = '<p class="error-msg">Quiz loading...</p>';
  }
}

function renderQuiz() {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  if (quizState.finished) {
    const pct = Math.round((quizState.score / quizState.questions.length) * 100);
    const msg = pct === 100 ? "Perfect! You're a true Welsh rugby legend! 🏆" :
                pct >= 75  ? "Excellent! Warren Gatland would be proud! 🌹" :
                pct >= 50  ? "Not bad! Keep watching those matches! 🏉" :
                             "Room to improve — but you're still Cymru am Byth! 🏴󠁧󠁢󠁷󠁬󠁳󠁿";
    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-score-circle">
          <span class="quiz-score-num">${quizState.score}</span>
          <span class="quiz-score-denom">/${quizState.questions.length}</span>
        </div>
        <p class="quiz-result-msg">${msg}</p>
        <p class="quiz-result-pct">${pct}% correct</p>
        <button class="quiz-btn" onclick="restartQuiz()">Play Again 🔄</button>
        <button class="quiz-btn quiz-btn-share" onclick="shareQuizScore(${quizState.score}, ${quizState.questions.length})">Share Score 📲</button>
      </div>
    `;
    return;
  }

  const q = quizState.questions[quizState.current];
  const progress = ((quizState.current) / quizState.questions.length) * 100;

  container.innerHTML = `
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="quiz-meta">
      <span class="quiz-counter">Question ${quizState.current + 1} of ${quizState.questions.length}</span>
      <span class="quiz-score-live">Score: ${quizState.score} ⭐</span>
    </div>
    <div class="quiz-question">
      <h3>${q.q}</h3>
    </div>
    <div class="quiz-options">
      ${q.options.map((opt, i) => `
        <button class="quiz-option ${quizState.answered ? getOptionClass(i, q.answer) : ''}"
          onclick="${quizState.answered ? '' : `answerQuiz(${i})`}"
          ${quizState.answered ? 'disabled' : ''}>
          <span class="quiz-opt-letter">${'ABCD'[i]}</span>
          ${opt}
        </button>
      `).join('')}
    </div>
    ${quizState.answered ? `
      <div class="quiz-fact">
        <span>💡</span> ${q.fact}
      </div>
      <button class="quiz-btn quiz-next-btn" onclick="nextQuestion()">
        ${quizState.current + 1 < quizState.questions.length ? 'Next Question →' : 'See Results 🏆'}
      </button>
    ` : ''}
  `;
}

function getOptionClass(i, correct) {
  if (i === correct) return 'correct';
  if (i === quizState.selected && i !== correct) return 'wrong';
  return 'disabled';
}

function answerQuiz(i) {
  if (quizState.answered) return;
  quizState.answered = true;
  quizState.selected = i;
  const correct = quizState.questions[quizState.current].answer;
  if (i === correct) quizState.score++;
  renderQuiz();
}

function nextQuestion() {
  quizState.current++;
  quizState.answered = false;
  quizState.selected = null;
  if (quizState.current >= quizState.questions.length) {
    quizState.finished = true;
  }
  renderQuiz();
}

function restartQuiz() {
  quizState.current = 0;
  quizState.score = 0;
  quizState.answered = false;
  quizState.finished = false;
  quizState.selected = null;
  loadQuiz();
}

function shareQuizScore(score, total) {
  const text = `I scored ${score}/${total} on the Welsh Dragon Rugby Quiz! 🏴󠁧󠁢󠁷󠁬󠁳󠁿🏉 Can you beat me? welshdragonrugby.co.uk`;
  if (navigator.share) {
    navigator.share({ title: 'Welsh Dragon Rugby Quiz', text });
  } else {
    navigator.clipboard?.writeText(text);
    alert('Score copied! Share it on social media 📲');
  }
}

// ── SCORE PREDICTOR ───────────────────────────────────────────
async function loadPredictor() {
  const container = document.getElementById('predictor-container');
  if (!container) return;

  // Get next Wales fixture for prediction
  try {
    const res = await fetch('/api/wales-fixtures');
    const data = await res.json();
    const now = Date.now();
    const upcoming = (data.response || [])
      .filter(g => new Date(g.date).getTime() > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const nextMatch = upcoming[0];
    if (!nextMatch) {
      container.innerHTML = '<p class="predictor-no-match">No upcoming Wales fixtures scheduled yet. Check back soon! 🏉</p>';
      return;
    }

    const matchId = `wales-${nextMatch.id}`;
    const home = nextMatch.teams?.home?.name || 'Wales';
    const away = nextMatch.teams?.away?.name || 'TBC';
    const matchDate = new Date(nextMatch.date).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long'
    });
    const matchLabel = `${home} vs ${away}`;

    // Load existing predictions
    const predRes = await fetch(`/api/predictions?matchId=${matchId}`);
    const predData = await predRes.json();

    renderPredictor(container, matchId, matchLabel, home, away, matchDate, predData);
  } catch {
    container.innerHTML = '<p class="error-msg">Predictor loading...</p>';
  }
}

function renderPredictor(container, matchId, matchLabel, home, away, matchDate, predData) {
  const alreadyPredicted = localStorage.getItem(`pred-${matchId}`);

  container.innerHTML = `
    <div class="predictor-match">
      <div class="predictor-date">${matchDate}</div>
      <div class="predictor-teams">
        <div class="predictor-team home-team">
          <span class="pred-team-name">${home}</span>
          ${!alreadyPredicted ? `<input type="number" id="pred-home" min="0" max="99" value="21" class="pred-score-input">` : `<span class="pred-score-display">${JSON.parse(alreadyPredicted).walesScore}</span>`}
        </div>
        <div class="predictor-vs">VS</div>
        <div class="predictor-team away-team">
          <span class="pred-team-name">${away}</span>
          ${!alreadyPredicted ? `<input type="number" id="pred-away" min="0" max="99" value="14" class="pred-score-input">` : `<span class="pred-score-display">${JSON.parse(alreadyPredicted).oppScore}</span>`}
        </div>
      </div>
      ${!alreadyPredicted ? `
        <div class="pred-name-row">
          <input type="text" id="pred-name" placeholder="Your name (optional)" class="pred-name-input" maxlength="30">
        </div>
        <button class="pred-submit-btn" onclick="submitPrediction('${matchId}', '${matchLabel}')">
          Submit My Prediction 🏉
        </button>
      ` : `<p class="pred-already">✅ You've submitted your prediction!</p>`}
    </div>
    ${predData.total > 0 ? `
    <div class="pred-community">
      <h4>Fan Community Predictions <span class="pred-count">${predData.total} fan${predData.total !== 1 ? 's' : ''}</span></h4>
      <div class="pred-bars">
        <div class="pred-bar-row">
          <span>Wales Win</span>
          <div class="pred-bar"><div class="pred-bar-fill wales-win" style="width:${predData.total ? Math.round(predData.walesWins/predData.total*100) : 0}%"></div></div>
          <span>${predData.total ? Math.round(predData.walesWins/predData.total*100) : 0}%</span>
        </div>
        <div class="pred-bar-row">
          <span>Draw</span>
          <div class="pred-bar"><div class="pred-bar-fill draw" style="width:${predData.total ? Math.round(predData.draws/predData.total*100) : 0}%"></div></div>
          <span>${predData.total ? Math.round(predData.draws/predData.total*100) : 0}%</span>
        </div>
        <div class="pred-bar-row">
          <span>Opp Win</span>
          <div class="pred-bar"><div class="pred-bar-fill opp-win" style="width:${predData.total ? Math.round(predData.oppWins/predData.total*100) : 0}%"></div></div>
          <span>${predData.total ? Math.round(predData.oppWins/predData.total*100) : 0}%</span>
        </div>
      </div>
      <div class="pred-avg">Community average: <strong>${predData.avgWales} – ${predData.avgOpp}</strong></div>
    </div>
    ` : '<p class="pred-be-first">Be the first to predict! 👆</p>'}
  `;
}

async function submitPrediction(matchId, matchLabel) {
  const homeScore = parseInt(document.getElementById('pred-home')?.value || 0);
  const awayScore = parseInt(document.getElementById('pred-away')?.value || 0);
  const name = document.getElementById('pred-name')?.value || 'Anonymous Fan';

  try {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, matchLabel, walesScore: homeScore, oppScore: awayScore, name })
    });
    localStorage.setItem(`pred-${matchId}`, JSON.stringify({ walesScore: homeScore, oppScore: awayScore }));
    loadPredictor();
  } catch {
    alert('Could not submit prediction. Please try again.');
  }
}

// ── NEWS FEED ─────────────────────────────────────────────────
async function loadNewsFeed() {
  const container = document.getElementById('news-container');
  if (!container) return;
  try {
    const res = await fetch('/api/news');
    const data = await res.json();
    container.innerHTML = `
      <div class="news-source">📡 ${data.source}</div>
      <div class="news-list">
        ${data.items.map(item => `
          <a class="news-item" href="${item.link}" target="_blank" rel="noopener noreferrer">
            <div class="news-item-content">
              <h4 class="news-title">${item.title}</h4>
              <p class="news-desc">${item.desc?.replace(/<[^>]*>/g, '').slice(0, 120)}${item.desc?.length > 120 ? '...' : ''}</p>
              <span class="news-date">${item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
            </div>
            <span class="news-arrow">→</span>
          </a>
        `).join('')}
      </div>
      <!-- AFFILIATE PLACEHOLDER: Rugby merch links go here -->
      <div class="news-merch-placeholder" style="display:none" id="merch-links">
        <!-- Amazon Associates links will be added here once approved -->
      </div>
    `;
  } catch {
    container.innerHTML = '<p class="error-msg">News loading...</p>';
  }
}

// ── MATCH COUNTDOWN ───────────────────────────────────────────
async function loadCountdown() {
  const container = document.getElementById('countdown-container');
  if (!container) return;
  try {
    const res = await fetch('/api/wales-fixtures');
    const data = await res.json();
    const now = Date.now();
    const upcoming = (data.response || [])
      .filter(g => new Date(g.date).getTime() > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!upcoming.length) {
      container.innerHTML = '<div class="countdown-none">No upcoming fixtures scheduled</div>';
      return;
    }

    const next = upcoming[0];
    const matchDate = new Date(next.date);
    const home = next.teams?.home?.name || 'Wales';
    const away = next.teams?.away?.name || 'TBC';
    const league = next.league?.name || '';

    function updateTimer() {
      const diff = matchDate.getTime() - Date.now();
      if (diff <= 0) {
        container.querySelector('.countdown-timer').innerHTML = '<span class="countdown-live">🔴 LIVE NOW</span>';
        return;
      }
      const d = Math.floor(diff / (1000*60*60*24));
      const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
      const m = Math.floor((diff % (1000*60*60)) / (1000*60));
      const s = Math.floor((diff % (1000*60)) / 1000);
      const el = container.querySelector('.countdown-timer');
      if (el) el.innerHTML = `
        <div class="cd-unit"><span class="cd-num">${d}</span><span class="cd-label">Days</span></div>
        <div class="cd-sep">:</div>
        <div class="cd-unit"><span class="cd-num">${String(h).padStart(2,'0')}</span><span class="cd-label">Hrs</span></div>
        <div class="cd-sep">:</div>
        <div class="cd-unit"><span class="cd-num">${String(m).padStart(2,'0')}</span><span class="cd-label">Min</span></div>
        <div class="cd-sep">:</div>
        <div class="cd-unit"><span class="cd-num">${String(s).padStart(2,'0')}</span><span class="cd-label">Sec</span></div>
      `;
    }

    container.innerHTML = `
      <div class="countdown-label">⏱ Next Wales Match</div>
      <div class="countdown-match">${home} <span class="cd-vs">vs</span> ${away}</div>
      <div class="countdown-league">${league} · ${matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="countdown-timer"></div>
    `;

    updateTimer();
    setInterval(updateTimer, 1000);
  } catch {
    container.innerHTML = '';
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStarsOfWeek();
  loadQuiz();
  loadPredictor();
  loadNewsFeed();
  loadCountdown();
});
