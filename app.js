
const switchVocab = document.getElementById("switch-vocab");
const switchVerb = document.getElementById("switch-verb");
const panelVocab = document.getElementById("panel-vocab");
const panelVerb = document.getElementById("panel-verb");
switchVocab.onclick = () => { switchVocab.classList.add("active"); switchVerb.classList.remove("active"); panelVocab.classList.remove("hidden"); panelVerb.classList.add("hidden"); };
switchVerb.onclick = () => { switchVerb.classList.add("active"); switchVocab.classList.remove("active"); panelVerb.classList.remove("hidden"); panelVocab.classList.add("hidden"); };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ===== vocab =====
const sectionPage = document.getElementById("section-page");
const actionPage = document.getElementById("section-action-page");
const studyPage = document.getElementById("study-page");
const sectionList = document.getElementById("section-list");
const sectionSummary = document.getElementById("section-summary");
const currentSectionBadge = document.getElementById("current-section-badge");
const progressText = document.getElementById("progress-text");
const studyReading = document.getElementById("study-reading");
const studyWord = document.getElementById("study-word");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");

let currentSectionIndex = -1;
let currentSection = null;
let currentItems = [];
let currentMode = "new"; // new, review, continue
let currentPointer = 0;
let currentAnswer = "";

function loadVocabProgress() {
  try { return JSON.parse(localStorage.getItem("section_vocab_progress_v1") || "{}"); }
  catch (e) { return {}; }
}
function saveVocabProgress(data) {
  localStorage.setItem("section_vocab_progress_v1", JSON.stringify(data));
}
function getSectionState(sectionId, total) {
  const all = loadVocabProgress();
  if (!all[sectionId]) all[sectionId] = { learned: [], nextNew: 0 };
  if (!Array.isArray(all[sectionId].learned)) all[sectionId].learned = [];
  if (typeof all[sectionId].nextNew !== "number") all[sectionId].nextNew = 0;
  all[sectionId].learned = all[sectionId].learned.filter(i => i >= 0 && i < total);
  saveVocabProgress(all);
  return all[sectionId];
}
function updateSectionState(sectionId, updater) {
  const all = loadVocabProgress();
  if (!all[sectionId]) all[sectionId] = { learned: [], nextNew: 0 };
  updater(all[sectionId]);
  saveVocabProgress(all);
}
function renderSections() {
  sectionSummary.textContent = `共 ${SECTIONS.length} 个 Section · 每组 100 词左右`;
  sectionList.innerHTML = SECTIONS.map((sec, idx) => {
    const st = getSectionState(sec.id, sec.items.length);
    return `
      <button class="section-btn" data-index="${idx}">
        <div><b>${sec.title}</b></div>
        <div class="small-text">已学 ${st.learned.length} / ${sec.items.length}</div>
      </button>
    `;
  }).join("");
  Array.from(sectionList.querySelectorAll(".section-btn")).forEach(btn => btn.onclick = () => openSectionAction(Number(btn.dataset.index)));
}
function openSectionAction(idx) {
  currentSectionIndex = idx;
  currentSection = SECTIONS[idx];
  const st = getSectionState(currentSection.id, currentSection.items.length);
  document.getElementById("action-section-badge").textContent = currentSection.title;
  document.getElementById("action-status-meta").textContent = `进度 ${st.learned.length} / ${currentSection.items.length}`;
  document.getElementById("action-status-title").textContent =
    st.learned.length === 0 ? "你还没有开始学习这一组"
    : st.learned.length >= currentSection.items.length ? "这一组已经全部学过了"
    : `你已经学过 ${st.learned.length} 个词`;
  document.getElementById("action-new-btn").disabled = st.nextNew >= currentSection.items.length;
  document.getElementById("action-review-btn").disabled = st.learned.length === 0;
  document.getElementById("action-continue-btn").disabled = st.nextNew >= currentSection.items.length;
  sectionPage.classList.add("hidden");
  studyPage.classList.add("hidden");
  actionPage.classList.remove("hidden");
}
function enterStudy(mode) {
  currentMode = mode;
  const st = getSectionState(currentSection.id, currentSection.items.length);
  if (mode === "new") {
    const start = st.nextNew;
    currentItems = currentSection.items.slice(start, Math.min(start + 100, currentSection.items.length)).map((item, i) => ({ item, originalIndex: start + i }));
    currentPointer = 0;
  } else if (mode === "continue") {
    const start = st.nextNew;
    currentItems = currentSection.items.slice(start).map((item, i) => ({ item, originalIndex: start + i }));
    currentPointer = 0;
  } else {
    currentItems = st.learned.map(i => ({ item: currentSection.items[i], originalIndex: i }));
    currentItems = shuffle(currentItems);
    currentPointer = 0;
  }
  if (!currentItems.length) return;
  actionPage.classList.add("hidden");
  studyPage.classList.remove("hidden");
  renderCurrentWord();
}
function wrongOptions(correctItem, count=3) {
  return shuffle(currentSection.items.filter(x => x.meaning !== correctItem.meaning)).slice(0, count).map(x => x.meaning);
}
function renderCurrentWord() {
  if (!currentItems.length) return;
  if (currentPointer >= currentItems.length) currentPointer = 0;
  const { item } = currentItems[currentPointer];
  currentSectionBadge.textContent = currentSection.title + " · " + (currentMode === "review" ? "复习" : "学习");
  progressText.textContent = `${currentPointer + 1} / ${currentItems.length}`;
  studyReading.textContent = item.reading || "";
  studyWord.textContent = item.word || "（无汉字）";
  currentAnswer = item.meaning;
  const options = shuffle([item.meaning, ...wrongOptions(item, 3)]);
  optionsEl.innerHTML = options.map(opt => `<button class="option" data-opt="${String(opt).replace(/"/g, '&quot;')}">${opt}</button>`).join("");
  feedbackEl.textContent = "请选择正确中文意思。";
  Array.from(optionsEl.querySelectorAll(".option")).forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.opt;
      Array.from(optionsEl.querySelectorAll(".option")).forEach(b => {
        if (b.dataset.opt === currentAnswer) b.classList.add("correct");
        if (b.dataset.opt === val && val !== currentAnswer) b.classList.add("wrong");
        b.disabled = true;
      });
      feedbackEl.innerHTML = val === currentAnswer ? `✅ 正确：<b>${currentAnswer}</b>` : `❌ 正确答案：<b>${currentAnswer}</b>`;
    };
  });
}
function markLearnedCurrent() {
  if (!currentItems.length || !currentSection) return;
  const originalIndex = currentItems[currentPointer].originalIndex;
  updateSectionState(currentSection.id, st => {
    if (!st.learned.includes(originalIndex)) st.learned.push(originalIndex);
    if (currentMode !== "review" && originalIndex >= st.nextNew) st.nextNew = originalIndex + 1;
    st.learned.sort((a,b)=>a-b);
  });
}
document.getElementById("action-back-btn").onclick = () => {
  actionPage.classList.add("hidden");
  sectionPage.classList.remove("hidden");
};
document.getElementById("action-new-btn").onclick = () => enterStudy("new");
document.getElementById("action-review-btn").onclick = () => enterStudy("review");
document.getElementById("action-continue-btn").onclick = () => enterStudy("continue");
document.getElementById("back-sections-btn").onclick = () => {
  studyPage.classList.add("hidden");
  actionPage.classList.remove("hidden");
  renderSections();
  openSectionAction(currentSectionIndex);
};
document.getElementById("next-word-btn").onclick = () => {
  if (!currentItems.length) return;
  markLearnedCurrent();
  currentPointer += 1;
  if (currentPointer >= currentItems.length) {
    renderSections();
    studyPage.classList.add("hidden");
    actionPage.classList.remove("hidden");
    openSectionAction(currentSectionIndex);
    return;
  }
  renderCurrentWord();
};

renderSections();

// ===== verb trainer =====
const verbForms = [
  { key: "masu", label: "ます形" }, { key: "nai", label: "ない形" }, { key: "te", label: "て形" }, { key: "ta", label: "た形" },
  { key: "potential", label: "可能形" }, { key: "passive", label: "被动形" }, { key: "causative", label: "使役形" }, { key: "volitional", label: "意向形" }
];
const verbState = { form: "masu", queue: [], index: 0, score: 0, streak: 0, attempts: 0, correct: 0, history: [], current: null };
const formRow = document.getElementById("verb-form-row");
const verbFormBadge = document.getElementById("verb-form-badge");
const verbBase = document.getElementById("verb-base");
const verbReading = document.getElementById("verb-reading");
const verbQuestion = document.getElementById("verb-question");
const verbInput = document.getElementById("verb-input");
const verbFeedback = document.getElementById("verb-feedback");
const verbProgress = document.getElementById("verb-progress");
const verbScore = document.getElementById("verb-score");
const verbStreak = document.getElementById("verb-streak");
const verbAcc = document.getElementById("verb-acc");
const verbHistory = document.getElementById("verb-history");

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
function renderFormButtons() {
  formRow.innerHTML = verbForms.map(f => `<button class="${f.key === verbState.form ? 'active' : ''}" data-key="${f.key}">${f.label}</button>`).join("");
  Array.from(formRow.querySelectorAll("button")).forEach(btn => {
    btn.onclick = () => {
      verbState.form = btn.dataset.key;
      renderFormButtons();
      buildVerbQueue();
    };
  });
}
function buildVerbQueue(customQueue) {
  verbState.queue = customQueue ? uniqueVerbs(customQueue) : uniqueVerbs(shuffle(VERBS)).slice(0, 40);
  verbState.index = 0;
  verbState.current = verbState.queue[0] || null;
  renderVerbCurrent();
}
function renderVerbCurrent() {
  const v = verbState.current;
  verbFormBadge.textContent = "当前：" + verbForms.find(x => x.key === verbState.form).label;
  if (!v) {
    verbBase.textContent = "完成";
    verbReading.textContent = "这组题目已结束";
    verbQuestion.innerHTML = "这一组做完了。";
    verbInput.value = "";
    updateVerbStats();
    return;
  }
  verbBase.textContent = v.base;
  verbReading.textContent = v.reading + " · " + v.group;
  verbQuestion.innerHTML = "请把 <b>" + v.base + "</b> 变成 <b>" + verbForms.find(x => x.key === verbState.form).label + "</b>。";
  verbInput.value = "";
  updateVerbStats();
}
function updateVerbStats() {
  verbScore.textContent = verbState.score;
  verbStreak.textContent = verbState.streak;
  const total = verbState.queue.length || 0;
  const cur = verbState.current ? Math.min(verbState.index + 1, total) : total;
  verbProgress.textContent = `${cur} / ${total}`;
  verbAcc.textContent = (verbState.attempts ? Math.round(verbState.correct / verbState.attempts * 100) : 0) + "%";
}
function renderVerbHistory() {
  if (!verbState.history.length) {
    verbHistory.innerHTML = '<div class="history-item">还没有记录。</div>';
    return;
  }
  verbHistory.innerHTML = verbState.history.map(h => `<div class="history-item"><b>${h.base}</b> → ${h.target} · ${h.ok ? "正确" : "错误"}<br>你的答案：${h.your}<br>正确答案：${h.correct}</div>`).join("");
}
function saveVerbState() {
  localStorage.setItem("verb_state_final_v1", JSON.stringify({
    form: verbState.form, score: verbState.score, streak: verbState.streak, attempts: verbState.attempts, correct: verbState.correct, history: verbState.history
  }));
}
function loadVerbState() {
  try {
    const s = JSON.parse(localStorage.getItem("verb_state_final_v1") || "{}");
    Object.assign(verbState, s);
  } catch (e) {}
}
function loadWrongVerbs() {
  try { return JSON.parse(localStorage.getItem("wrong_verbs_final_v1") || "[]"); }
  catch (e) { return []; }
}
function addWrongVerb(base) {
  let arr = loadWrongVerbs();
  if (!arr.includes(base)) arr.unshift(base);
  localStorage.setItem("wrong_verbs_final_v1", JSON.stringify(arr.slice(0, 50)));
}
function submitVerb(showOnly=false) {
  if (!verbState.current) return;
  const correct = conjugate(verbState.current, verbState.form);
  if (showOnly) {
    verbFeedback.innerHTML = `答案是：<b>${correct}</b>`;
    return;
  }
  const ans = normalize(verbInput.value);
  if (!ans) {
    verbFeedback.textContent = "先输入答案再提交。";
    return;
  }
  verbState.attempts += 1;
  const ok = ans === normalize(correct);
  if (ok) {
    verbState.correct += 1;
    verbState.score += 10;
    verbState.streak += 1;
    verbFeedback.innerHTML = `✅ 正确：<b>${correct}</b>`;
  } else {
    verbState.streak = 0;
    addWrongVerb(verbState.current.base);
    verbFeedback.innerHTML = `❌ 正确答案：<b>${correct}</b>`;
  }
  verbState.history.unshift({
    base: verbState.current.base,
    target: verbForms.find(x => x.key === verbState.form).label,
    your: ans,
    correct,
    ok
  });
  if (verbState.history.length > 25) verbState.history.pop();
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
document.getElementById("verb-submit-btn").onclick = () => submitVerb(false);
document.getElementById("verb-show-btn").onclick = () => submitVerb(true);
document.getElementById("verb-next-btn").onclick = nextVerb;
document.getElementById("verb-review-btn").onclick = () => {
  const wrong = loadWrongVerbs();
  const q = wrong.map(base => VERBS.find(v => v.base === base)).filter(Boolean);
  if (!q.length) {
    verbFeedback.textContent = "现在还没有错题。";
    return;
  }
  buildVerbQueue(q);
};
document.getElementById("verb-reset-btn").onclick = () => {
  verbState.score = 0; verbState.streak = 0; verbState.attempts = 0; verbState.correct = 0; verbState.history = [];
  renderVerbHistory(); updateVerbStats(); saveVerbState();
};
let composing = false;
document.getElementById("verb-input").addEventListener("compositionstart", () => composing = true);
document.getElementById("verb-input").addEventListener("compositionend", () => composing = false);
document.getElementById("verb-input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (composing || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    submitVerb(false);
  }
});

loadVerbState();
renderFormButtons();
renderVerbHistory();
buildVerbQueue();
