
// ===== app switch =====
const btnVocab = document.getElementById('btnVocab');
const btnVerb = document.getElementById('btnVerb');
const appVocab = document.getElementById('appVocab');
const appVerb = document.getElementById('appVerb');

btnVocab.onclick = () => {
  btnVocab.classList.add('active');
  btnVerb.classList.remove('active');
  appVocab.classList.remove('hidden');
  appVerb.classList.add('hidden');
};
btnVerb.onclick = () => {
  btnVerb.classList.add('active');
  btnVocab.classList.remove('active');
  appVerb.classList.remove('hidden');
  appVocab.classList.add('hidden');
};

// ===== vocab app =====
function uniqueWords(arr) {
  const seen = new Set();
  return arr.filter(w => {
    const key = (w.word || "") + "|" + (w.reading || "") + "|" + (w.meaning || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function loadCustomWords() {
  try { return JSON.parse(localStorage.getItem("n2_custom_words") || "[]"); }
  catch (e) { return []; }
}
function saveCustomWords(words) {
  localStorage.setItem("n2_custom_words", JSON.stringify(words));
}
function getAllWords() {
  return uniqueWords(BUILTIN_WORDS.concat(loadCustomWords()));
}
const DEFAULT_STATE = { records: {}, todayDate: "", todayNewIds: [], lastMode: "study" };
function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("n2_mcq_state") || "null");
    return s ? Object.assign({}, DEFAULT_STATE, s) : JSON.parse(JSON.stringify(DEFAULT_STATE));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}
function saveState() {
  localStorage.setItem("n2_mcq_state", JSON.stringify(state));
}
let state = loadState();
if (state.todayDate !== todayKey()) {
  state.todayDate = todayKey();
  state.todayNewIds = [];
  saveState();
}
const DAILY_NEW_LIMIT = 15;
let currentCard = null;
let currentQueue = [];
let currentMode = "study";
let answerLocked = false;
let currentCorrectMeaning = "";
let lastWordKey = "";

function getWordId(w) {
  return w.id || ("c_" + w.word + "|" + w.reading + "|" + w.meaning);
}
function getRecord(id) {
  if (!state.records[id]) state.records[id] = { stage: 0, due: 0, seen: 0, correct: 0, wrong: 0, lastResult: "" };
  return state.records[id];
}
function nextIntervals(result, stage) {
  if (result === "again") return { minutes: 5, nextStage: Math.max(0, stage - 1) };
  if (result === "hard") return { hours: 6, nextStage: stage + 1 };
  if (stage <= 1) return { days: 1, nextStage: 2 };
  if (stage === 2) return { days: 3, nextStage: 3 };
  if (stage === 3) return { days: 7, nextStage: 4 };
  if (stage === 4) return { days: 14, nextStage: 5 };
  return { days: 30, nextStage: stage + 1 };
}
function addTime(base, spec) {
  const d = new Date(base);
  if (spec.minutes) d.setMinutes(d.getMinutes() + spec.minutes);
  if (spec.hours) d.setHours(d.getHours() + spec.hours);
  if (spec.days) d.setDate(d.getDate() + spec.days);
  return d.getTime();
}
function getReviewWords() {
  const now = Date.now();
  return uniqueWords(getAllWords().filter(w => {
    const r = getRecord(getWordId(w));
    return r.seen > 0 && r.due <= now;
  }));
}
function getNewWords() {
  const allWords = getAllWords();
  const unseen = allWords.filter(w => getRecord(getWordId(w)).seen === 0);
  const todaySet = new Set(state.todayNewIds);
  const todayWords = unseen.filter(w => todaySet.has(getWordId(w)));
  if (todayWords.length >= DAILY_NEW_LIMIT) return uniqueWords(todayWords);
  const needed = DAILY_NEW_LIMIT - todayWords.length;
  unseen.filter(w => !todaySet.has(getWordId(w))).slice(0, needed).forEach(w => state.todayNewIds.push(getWordId(w)));
  saveState();
  return uniqueWords(allWords.filter(w => state.todayNewIds.includes(getWordId(w)) && getRecord(getWordId(w)).seen === 0));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function sampleWrongOptions(correctWord, count = 3) {
  const pool = getAllWords().filter(w => (w.meaning || "") !== (correctWord.meaning || ""));
  return shuffle(pool).slice(0, count).map(w => w.meaning);
}
function refreshStats() {
  const allWords = getAllWords();
  document.getElementById("newCount").textContent = getNewWords().length;
  document.getElementById("reviewCount").textContent = getReviewWords().length;
  document.getElementById("learnedCount").textContent = allWords.filter(w => getRecord(getWordId(w)).seen > 0).length;
  document.getElementById("totalCount").textContent = allWords.length;
}
function switchVTab(tab) {
  ["vTabStudy", "vTabList", "vTabAdd"].forEach(id => document.getElementById(id).classList.remove("active"));
  ["vStudy", "vList", "vAdd"].forEach(id => document.getElementById(id).classList.add("hidden"));
  if (tab === "study") {
    document.getElementById("vTabStudy").classList.add("active");
    document.getElementById("vStudy").classList.remove("hidden");
  }
  if (tab === "list") {
    document.getElementById("vTabList").classList.add("active");
    document.getElementById("vList").classList.remove("hidden");
    renderList(document.getElementById("searchInput").value);
  }
  if (tab === "add") {
    document.getElementById("vTabAdd").classList.add("active");
    document.getElementById("vAdd").classList.remove("hidden");
  }
}
function renderCard(card) {
  currentCard = card;
  answerLocked = false;
  const optionsEl = document.getElementById("options");
  if (!card) {
    document.getElementById("wordText").textContent = currentMode === "review" ? "没有待复习单词" : "今天的新词学完了";
    document.getElementById("readingText").textContent = "";
    document.getElementById("exampleBox").textContent = currentMode === "review" ? "可以稍后再来复习。" : "可以去词库页搜索你的单词。";
    optionsEl.innerHTML = "";
    document.getElementById("feedback").textContent = "点“开始学习”继续。";
    return;
  }
  lastWordKey = (card.word || "") + "|" + (card.reading || "");
  document.getElementById("modeBadge").textContent = currentMode === "review" ? "复习中" : "今日学习";
  document.getElementById("wordText").textContent = card.word;
  document.getElementById("readingText").textContent = card.reading;
  document.getElementById("exampleBox").innerHTML = (card.example || "这个单词暂时没有例句。") + '<div class="small">' + (card.example_zh || "") + '</div>';
  currentCorrectMeaning = card.meaning;
  const options = shuffle([card.meaning].concat(sampleWrongOptions(card, 3)));
  optionsEl.innerHTML = options.map(opt => '<button class="option" data-opt="' + String(opt).replace(/"/g, '&quot;') + '">' + opt + '</button>').join("");
  Array.from(optionsEl.querySelectorAll(".option")).forEach(btn => btn.onclick = () => selectOption(btn.dataset.opt));
  document.getElementById("feedback").textContent = "请根据单词和例句选择最合适的中文意思。";
}
function selectOption(opt) {
  if (answerLocked || !currentCard) return;
  answerLocked = true;
  Array.from(document.querySelectorAll(".option")).forEach(el => {
    if (el.dataset.opt === currentCorrectMeaning) el.classList.add("correct");
    if (el.dataset.opt === opt && opt !== currentCorrectMeaning) el.classList.add("wrong");
    el.disabled = true;
  });
  document.getElementById("feedback").innerHTML = opt === currentCorrectMeaning
    ? '✅ 正确：<b>' + currentCorrectMeaning + '</b><br>再按“不会 / 模糊 / 会了”记录你的记忆情况。'
    : '❌ 选错了。正确答案是：<b>' + currentCorrectMeaning + '</b><br>再按“不会 / 模糊 / 会了”记录你的记忆情况。';
}
function startStudy() {
  currentMode = "study";
  currentQueue = shuffle(getNewWords());
  document.getElementById("startBtn").disabled = true;
  renderCard(currentQueue.shift() || null);
}
function nextQuestion() {
  if (!currentQueue.length) { renderCard(null); return; }
  let next = currentQueue.shift();
  if (next && currentQueue.length && ((next.word || "") + "|" + (next.reading || "")) === lastWordKey) {
    currentQueue.push(next);
    next = currentQueue.shift();
  }
  renderCard(next || null);
}
function grade(result) {
  if (!currentCard) return;
  const id = getWordId(currentCard);
  const rec = getRecord(id);
  const spec = nextIntervals(result, rec.stage);
  rec.seen += 1;
  if (result === "again") rec.wrong += 1; else rec.correct += 1;
  rec.lastResult = result;
  rec.stage = spec.nextStage;
  rec.due = addTime(Date.now(), spec);
  saveState();
  refreshStats();
  nextQuestion();
}
function renderList(keyword) {
  const q = (keyword || "").trim().toLowerCase();
  const all = getAllWords();
  const list = q
    ? all.filter(w => (w.word || "").toLowerCase().includes(q) || (w.reading || "").includes(q) || (w.meaning || "").includes(q)).slice(0, 200)
    : all.slice(0, 120);
  const el = document.getElementById("wordList");
  if (!q) {
    el.innerHTML = '<div class="item">词库较大，默认只显示前 120 个。请输入关键词搜索查看更多。</div>';
  } else if (!list.length) {
    el.innerHTML = '<div class="item">没有搜到结果。</div>';
    return;
  } else {
    el.innerHTML = "";
  }
  el.innerHTML += list.map(w => {
    const r = getRecord(getWordId(w));
    const tag = r.seen === 0 ? "未学" : (r.lastResult === "again" ? "易错" : "已学");
    return '<div class="item"><b>' + w.word + '</b>（' + w.reading + '）<br>' + w.meaning + '<br><span class="small">' + (w.example || "暂无例句") + '</span><br><span class="small">' + tag + ' · 阶段 ' + r.stage + '</span></div>';
  }).join("");
}
function addCustomWord() {
  const word = document.getElementById("addWord").value.trim();
  const reading = document.getElementById("addReading").value.trim();
  const meaning = document.getElementById("addMeaning").value.trim();
  const example = document.getElementById("addExample").value.trim();
  const example_zh = document.getElementById("addExampleZh").value.trim();
  if (!word || !reading || !meaning) { alert("请至少填写：单词、假名、中文。"); return; }
  const custom = loadCustomWords();
  custom.push({ word, reading, meaning, example, example_zh });
  saveCustomWords(custom);
  ["addWord", "addReading", "addMeaning", "addExample", "addExampleZh"].forEach(id => document.getElementById(id).value = "");
  refreshStats();
  alert("已添加。");
}
function exportCustom() {
  const blob = new Blob([JSON.stringify(loadCustomWords(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "n2_custom_words.json";
  a.click();
}
function importCustom(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const arr = JSON.parse(reader.result);
      if (!Array.isArray(arr)) throw new Error();
      saveCustomWords(loadCustomWords().concat(arr));
      refreshStats();
      alert("导入成功。");
    } catch (e) {
      alert("导入失败，请检查 JSON 格式。");
    }
  };
  reader.readAsText(file, "utf-8");
}

document.getElementById("startBtn").onclick = startStudy;
document.getElementById("nextBtn").onclick = nextQuestion;
document.getElementById("againBtn").onclick = () => grade("again");
document.getElementById("hardBtn").onclick = () => grade("hard");
document.getElementById("goodBtn").onclick = () => grade("good");
document.getElementById("vTabStudy").onclick = () => switchVTab("study");
document.getElementById("vTabList").onclick = () => switchVTab("list");
document.getElementById("vTabAdd").onclick = () => switchVTab("add");
document.getElementById("searchInput").addEventListener("input", e => renderList(e.target.value));
document.getElementById("addBtn").onclick = addCustomWord;
document.getElementById("exportBtn").onclick = exportCustom;
document.getElementById("importInput").addEventListener("change", e => { if (e.target.files && e.target.files[0]) importCustom(e.target.files[0]); });

refreshStats();
switchVTab("study");
renderCard(null);

// ===== verb app =====
const forms = [
  { key: "masu", label: "ます形" }, { key: "nai", label: "ない形" }, { key: "te", label: "て形" }, { key: "ta", label: "た形" },
  { key: "potential", label: "可能形" }, { key: "passive", label: "被动形" }, { key: "causative", label: "使役形" }, { key: "volitional", label: "意向形" }
];
const verbState = { form: "masu", queue: [], index: 0, score: 0, streak: 0, attempts: 0, correct: 0, history: [], current: null };
const endings = {
  u:{i:"い",a:"わ",e:"え",o:"お"}, ku:{i:"き",a:"か",e:"け",o:"こ"}, gu:{i:"ぎ",a:"が",e:"げ",o:"ご"},
  su:{i:"し",a:"さ",e:"せ",o:"そ"}, tsu:{i:"ち",a:"た",e:"て",o:"と"}, nu:{i:"に",a:"な",e:"ね",o:"の"},
  bu:{i:"び",a:"ば",e:"べ",o:"ぼ"}, mu:{i:"み",a:"ま",e:"め",o:"も"}, ru:{i:"り",a:"ら",e:"れ",o:"ろ"}
};
function classifyEnding(word) {
  const arr = ["する", "くる", "来る", "う", "く", "ぐ", "す", "つ", "ぬ", "ぶ", "む", "る"];
  for (const e of arr) if (word.endsWith(e)) return e;
  return "";
}
function kanaStemMap(base, targetCol) {
  const e = classifyEnding(base);
  const map = { "う":"u","く":"ku","ぐ":"gu","す":"su","つ":"tsu","ぬ":"nu","ぶ":"bu","む":"mu","る":"ru" }[e];
  if (!map) return null;
  return base.slice(0, -e.length) + endings[map][targetCol];
}
function teTaGodan(base, kind) {
  if (base === "行く") return kind === "te" ? "行って" : "行った";
  const e = classifyEnding(base), stem = base.slice(0, -1);
  if (e === "う" || e === "つ" || e === "る") return stem + (kind === "te" ? "って" : "った");
  if (e === "む" || e === "ぶ" || e === "ぬ") return stem + (kind === "te" ? "んで" : "んだ");
  if (e === "く") return stem + (kind === "te" ? "いて" : "いた");
  if (e === "ぐ") return stem + (kind === "te" ? "いで" : "いだ");
  if (e === "す") return stem + (kind === "te" ? "して" : "した");
  return base;
}
function irregularSuru(form) { return {masu:"します",nai:"しない",te:"して",ta:"した",potential:"できる",passive:"される",causative:"させる",volitional:"しよう"}[form]; }
function irregularKuru(form) { return {masu:"来ます",nai:"来ない",te:"来て",ta:"来た",potential:"来られる",passive:"来られる",causative:"来させる",volitional:"来よう"}[form]; }
function nounSuru(base, form) {
  const stem = base.slice(0, -2);
  return {masu:stem+"します",nai:stem+"しない",te:stem+"して",ta:stem+"した",potential:stem+"できる",passive:stem+"される",causative:stem+"させる",volitional:stem+"しよう"}[form];
}
function ichidan(stem, form) {
  return {masu:stem+"ます",nai:stem+"ない",te:stem+"て",ta:stem+"た",potential:stem+"られる",passive:stem+"られる",causative:stem+"させる",volitional:stem+"よう"}[form];
}
function godan(base, form) {
  return {
    masu:kanaStemMap(base,"i")+"ます", nai:kanaStemMap(base,"a")+"ない", te:teTaGodan(base,"te"), ta:teTaGodan(base,"ta"),
    potential:kanaStemMap(base,"e")+"る", passive:kanaStemMap(base,"a")+"れる", causative:kanaStemMap(base,"a")+"せる", volitional:kanaStemMap(base,"o")+"う"
  }[form];
}
function conjugate(v, form) {
  if (v.group === "三类动词") {
    if (v.base === "する") return irregularSuru(form);
    if (v.base === "来る") return irregularKuru(form);
    if (v.base.endsWith("する")) return nounSuru(v.base, form);
  }
  if (v.group === "二类动词") return ichidan(v.base.slice(0, -1), form);
  return godan(v.base, form);
}
function normalize(s) { return (s || "").replace(/\s+/g, "").trim(); }
function uniqueVerbs(arr) {
  const seen = new Set();
  return arr.filter(v => {
    const key = (v.base || "") + "|" + (v.reading || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function renderFormPills() {
  const el = document.getElementById("formPicker");
  el.innerHTML = forms.map(f => '<button class="' + (f.key === verbState.form ? "active" : "") + '" data-k="' + f.key + '">' + f.label + '</button>').join("");
  Array.from(el.querySelectorAll("button")).forEach(btn => btn.onclick = () => {
    verbState.form = btn.dataset.k;
    renderFormPills();
    buildVerbSet();
  });
}
function buildVerbSet(custom) {
  verbState.queue = custom ? uniqueVerbs(custom) : uniqueVerbs(shuffle(VERBS)).slice(0, 40);
  verbState.index = 0;
  verbState.current = verbState.queue[0] || null;
  renderVerbCurrent();
}
function renderVerbCurrent() {
  const v = verbState.current;
  document.getElementById("verbBadge").textContent = "当前：" + forms.find(x => x.key === verbState.form).label;
  if (!v) {
    document.getElementById("verbBase").textContent = "完成";
    document.getElementById("verbRead").textContent = "这组题目已结束";
    document.getElementById("verbQuestion").innerHTML = "这一组做完了。";
    document.getElementById("verbInput").value = "";
    updateVerbStats();
    return;
  }
  document.getElementById("verbBase").textContent = v.base;
  document.getElementById("verbRead").textContent = v.reading + " · " + v.group;
  document.getElementById("verbQuestion").innerHTML = "请把 <b>" + v.base + "</b> 变成 <b>" + forms.find(x => x.key === verbState.form).label + "</b>。";
  document.getElementById("verbInput").value = "";
  updateVerbStats();
}
function updateVerbStats() {
  document.getElementById("verbScore").textContent = verbState.score;
  document.getElementById("verbStreak").textContent = verbState.streak;
  const total = verbState.queue.length || 0;
  const cur = verbState.current ? Math.min(verbState.index + 1, total) : total;
  document.getElementById("verbProgress").textContent = cur + "/" + total;
  document.getElementById("verbAcc").textContent = (verbState.attempts ? Math.round(verbState.correct / verbState.attempts * 100) : 0) + "%";
}
function renderVerbHistory() {
  const el = document.getElementById("verbHistory");
  if (!verbState.history.length) { el.innerHTML = '<div class="item">还没有记录。</div>'; return; }
  el.innerHTML = verbState.history.map(h => '<div class="item"><b>' + h.base + '</b> → ' + h.target + ' · ' + (h.ok ? "正确" : "错误") + '<br>你的答案：' + h.your + '<br>正确答案：' + h.correct + '</div>').join("");
}
function submitVerb(showOnly) {
  if (!verbState.current) return;
  const correct = conjugate(verbState.current, verbState.form);
  if (showOnly) {
    document.getElementById("verbFeedback").innerHTML = "答案是：<b>" + correct + "</b>";
    return;
  }
  const ans = normalize(document.getElementById("verbInput").value);
  if (!ans) { document.getElementById("verbFeedback").textContent = "先输入答案再提交。"; return; }
  verbState.attempts += 1;
  const ok = ans === normalize(correct);
  if (ok) { verbState.correct += 1; verbState.score += 10; verbState.streak += 1; }
  else { verbState.streak = 0; addWrongVerb(verbState.current.base); }
  verbState.history.unshift({ base:verbState.current.base, target:forms.find(x => x.key === verbState.form).label, your:ans, correct, ok });
  if (verbState.history.length > 25) verbState.history.pop();
  document.getElementById("verbFeedback").innerHTML = ok ? "✅ 正确：<b>" + correct + "</b>" : "❌ 正确答案：<b>" + correct + "</b>";
  renderVerbHistory();
  updateVerbStats();
  saveVerbState();
}
function nextVerb() {
  verbState.index += 1;
  verbState.current = verbState.index < verbState.queue.length ? verbState.queue[verbState.index] : null;
  renderVerbCurrent();
  saveVerbState();
}
function loadWrongVerb() { try { return JSON.parse(localStorage.getItem("wrong_verbs") || "[]"); } catch (e) { return []; } }
function addWrongVerb(base) {
  let arr = loadWrongVerb();
  if (!arr.includes(base)) arr.unshift(base);
  localStorage.setItem("wrong_verbs", JSON.stringify(arr.slice(0, 50)));
}
function startWrongVerb() {
  const arr = loadWrongVerb();
  const q = arr.map(b => VERBS.find(v => v.base === b)).filter(Boolean);
  if (!q.length) { document.getElementById("verbFeedback").textContent = "现在还没有错题。"; return; }
  buildVerbSet(q);
}
function saveVerbState() {
  localStorage.setItem("verb_state_simple", JSON.stringify({
    form: verbState.form, score: verbState.score, streak: verbState.streak, attempts: verbState.attempts, correct: verbState.correct, history: verbState.history
  }));
}
function loadVerbState() {
  try {
    const s = JSON.parse(localStorage.getItem("verb_state_simple") || "{}");
    Object.assign(verbState, s);
  } catch (e) {}
}
document.getElementById("verbSubmit").onclick = () => submitVerb(false);
document.getElementById("verbShow").onclick = () => submitVerb(true);
document.getElementById("verbNext").onclick = nextVerb;
document.getElementById("verbReview").onclick = startWrongVerb;
document.getElementById("verbReset").onclick = () => {
  verbState.score = 0; verbState.streak = 0; verbState.attempts = 0; verbState.correct = 0; verbState.history = [];
  renderVerbHistory(); updateVerbStats(); saveVerbState();
};
const vi = document.getElementById("verbInput");
let composing = false;
vi.addEventListener("compositionstart", () => composing = true);
vi.addEventListener("compositionend", () => composing = false);
vi.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (composing || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    submitVerb(false);
  }
});

loadVerbState();
renderFormPills();
renderVerbHistory();
buildVerbSet();
