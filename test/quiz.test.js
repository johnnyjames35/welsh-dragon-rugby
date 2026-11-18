const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/index.html', 'utf8');
const quizScript = html.match(/<script>\s*(\(function\(\)\{\s*const wrsQuestions[\s\S]*?)<\/script>/)[1];
new vm.Script(quizScript);

function element() {
  return {
    style: {}, children: [], value: '', textContent: '',
    set innerHTML(_) { this.children = []; },
    replaceChildren() { this.children = []; },
    insertRow() { const row = element(); this.children.push(row); return row; },
    insertCell() { const cell = element(); this.children.push(cell); return cell; },
    appendChild(child) { this.children.push(child); },
    scrollIntoView() {},
  };
}

const elements = new Map();
const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
const storage = new Map();
const events = [];
const context = {
  window: { gtag: (_, name, properties) => events.push({ name, properties }) },
  document: {
    getElementById: get,
    createElement: element,
    querySelectorAll: () => get('wrsAnswers').children,
  },
  localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  },
  Date,
};
vm.runInNewContext(quizScript, context);

get('wrsFanName').value = 'Test person';
get('wrsNickname').value = 'Test dragon';
context.window.wrsStartQuiz();
for (let question = 0; question < 20; question++) {
  get('wrsAnswers').children[0].onclick();
  context.window.wrsNextQuestion();
}
assert.equal(get('wrsResultPanel').style.display, 'block');
assert.equal(get('wrsFinalScore').textContent, '20 / 20');
assert.equal(get('wrsLeaderboard').children.length, 1);
assert.equal(JSON.parse(storage.get('wdr-quiz-scores-v1'))[0].score, 20);
assert.deepEqual(events.map(event => event.name), ['quiz_started', 'quiz_completed']);
assert.ok(events.every(event => !JSON.stringify(event).includes('Test')));
context.window.wrsRestartQuiz();
assert.equal(get('wrsStartPanel').style.display, 'block');
context.window.wrsClearScores();
assert.equal(storage.size, 0);
console.log('Quiz start, finish, local scores, retry, clear and anonymous events passed.');

