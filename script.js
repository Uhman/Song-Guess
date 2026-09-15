/*
  SONG//GUESS configuration
  -------------------------
  1. Add one entry per playable date in SONGS.
  2. The audio path is relative to this file, e.g. "songs/day-2026-09-15.mp3".
  3. Add dates to SKIPPED_DATES when you want an official day off.
  4. The calendar is NOT generated from the presence of audio files.
*/

const START_DATE = "2026-09-15";
const END_DATE   = "2026-11-03";

const SKIPPED_DATES = [
  // "2026-09-21",
  // "2026-10-05",
];

const SONGS = {
  "2026-09-15": {
	title: "Fuckboi",
    audio: "songs/day-2026-09-15.mp3"
  },
  "2026-09-16": {
	title: "Inselfieber",
    audio: "songs/day-2026-09-16.mp3"
  },
  //
  // Add your real songs here.
};

const STORAGE_KEY = "songGuessProgress";

const $ = (selector) => document.querySelector(selector);
const audio = $("#audioPlayer");
const guessForm = $("#guessForm");
const guessInput = $("#guessInput");
const message = $("#message");
const calendar = $("#calendar");

let progress = loadProgress();
let currentDate = getTodayKey();

function parseDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getTodayKey() {
  const now = new Date();
  return toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isInGame(key) {
  return key >= START_DATE && key <= END_DATE;
}

function isSkipped(key) {
  return SKIPPED_DATES.includes(key);
}

function isCompleted(key) {
  return Boolean(progress[key]?.completed);
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(key, options = { day: "numeric", month: "short" }) {
  return parseDate(key).toLocaleDateString(undefined, options);
}

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function getSongFor(key) {
  return SONGS[key] || null;
}

function renderCalendar() {
  calendar.innerHTML = "";

  const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  weekdays.forEach(day => {
    const el = document.createElement("div");
    el.className = "weekday";
    el.textContent = day;
    calendar.appendChild(el);
  });

  const start = parseDate(START_DATE);
  const end = parseDate(END_DATE);

  // Monday-based grid.
  const firstDayOffset = (start.getDay() + 6) % 7;

  for (let i = 0; i < firstDayOffset; i++) {
    const blank = document.createElement("div");
    blank.className = "day outside";
    calendar.appendChild(blank);
  }

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = toKey(cursor);
    const el = document.createElement("div");
    const skipped = isSkipped(key);
    const completed = isCompleted(key);
    const isToday = key === currentDate;
    const isFuture = key > currentDate;

    el.className = "day";
    if (skipped) el.classList.add("skipped");
    else if (completed) el.classList.add("done");
    else if (!isFuture) el.classList.add("open");
    else el.classList.add("future");
    if (isToday) el.classList.add("current");

    const number = document.createElement("span");
    number.className = "num";
    number.textContent = cursor.getDate();

    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = skipped ? "—" : completed ? "✓" : isFuture ? "·" : "○";

    el.append(number, mark);
    calendar.appendChild(el);
  }
}

function setupToday() {
  const inPeriod = isInGame(currentDate);
  const skipped = isSkipped(currentDate);
  const song = getSongFor(currentDate);

  $("#todayLabel").textContent = formatDate(currentDate).toUpperCase();
  $("#trackDate").textContent = formatDate(currentDate, { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

  const attempts = progress[currentDate]?.attempts || 0;
  $("#attemptLabel").textContent = `${attempts} ATTEMPT${attempts === 1 ? "" : "S"}`;

  if (!inPeriod) {
    audio.removeAttribute("src");
    audio.load();
    guessInput.disabled = true;
    guessForm.querySelector("button").disabled = true;
    showMessage(currentDate < START_DATE
      ? `The game starts on ${formatDate(START_DATE)}.`
      : `The game ended on ${formatDate(END_DATE)}.`
    );
    $("#playerStatus").textContent = "OFFLINE";
    return;
  }

  if (skipped) {
    audio.removeAttribute("src");
    audio.load();
    guessInput.disabled = true;
    guessForm.querySelector("button").disabled = true;
    showMessage("Today is an official day off. The mission resumes tomorrow.");
    $("#playerStatus").textContent = "DAY OFF";
    return;
  }

  if (!song) {
    audio.removeAttribute("src");
    audio.load();
    guessInput.disabled = true;
    guessForm.querySelector("button").disabled = true;
    showMessage("Today's riddle is not configured yet... bonk the author!");
    $("#playerStatus").textContent = "AWAITING DATA";
    return;
  }

  audio.src = song.audio;
  audio.load();
  guessInput.disabled = false;
  guessForm.querySelector("button").disabled = false;

  if (isCompleted(currentDate)) {
    showMessage("✓ Correct. Today's song has been solved.", "success");
    guessInput.disabled = true;
    guessForm.querySelector("button").disabled = true;
    $("#playerStatus").textContent = "SOLVED";
  } else {
    showMessage("Transmission ready. Identify the track.");
    $("#playerStatus").textContent = "READY";
  }
}

guessForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const song = getSongFor(currentDate);
  if (!song || isSkipped(currentDate) || isCompleted(currentDate)) return;

  const guess = normalize(guessInput.value);
  if (!guess) return;

  progress[currentDate] ||= { attempts: 0, completed: false };
  progress[currentDate].attempts += 1;

  const correct = normalize(song.title) === guess;

  if (correct) {
    progress[currentDate].completed = true;
    saveProgress();
    guessInput.value = "";
    showMessage(`✓ Correct — "${song.title}"`, "success");
    guessInput.disabled = true;
    guessForm.querySelector("button").disabled = true;
    $("#playerStatus").textContent = "SOLVED";
  } else {
    saveProgress();
    guessInput.select();
    showMessage("✕ Not quite. Keep listening.");
  }

  $("#attemptLabel").textContent =
    `${progress[currentDate].attempts} ATTEMPT${progress[currentDate].attempts === 1 ? "" : "S"}`;

  renderCalendar();
});

audio.addEventListener("play", () => {
  $("#playerStatus").textContent = "PLAYING";
});

audio.addEventListener("pause", () => {
  if (!isCompleted(currentDate)) $("#playerStatus").textContent = "PAUSED";
});

function init() {
  $("#monthTitle").textContent =
    `${parseDate(START_DATE).toLocaleDateString(undefined, { month: "long" }).toUpperCase()} — ${parseDate(END_DATE).toLocaleDateString(undefined, { month: "long" }).toUpperCase()}`;

  renderCalendar();
  setupToday();
}

init();