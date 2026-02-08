"use strict";
// ===== DOM =====
const btnPng = document.getElementById("btn_png")
const btnGoldenPng = document.getElementById("btn_golden_png")
const clickButton = document.getElementById("clickButton")

const scoreDisplayEl = document.getElementById("scoreDisplay")
const cpsDisplayEl = document.getElementById("cpsDisplay")
const clickPowerDisplayEl = document.getElementById("clickPowerDisplay")
const clickCountDisplayEl = document.getElementById("clickCountDisplay")
const trophyCountEl = document.getElementById("trophyCount")

const targetDisplayEl = document.getElementById("targetDisplay")
const targetMessageEl = document.getElementById("targetMessage")

const buyCpsBtn = document.getElementById("buyCps")
const cpsCostEl = document.getElementById("cpsCost")
const buyClickPowerBtn = document.getElementById("buyClickPower")
const clickPowerCostEl = document.getElementById("clickPowerCost")
const statusLineEl = document.getElementById("statusLine")
const resetSaveBtn = document.getElementById("resetSave")

// ===== CONFIG =====
const SAVE_KEY = "zonnu_idle_clicker_v1"
const CHECKMARK = "\u2713"

const BASE_TARGET = 10
const TARGET_GROWTH = 1.55
const TARGET_BONUS = 6

const OFFLINE_CAP_SEC = 60 * 60 * 8 

// ===== STATE =====
let score = 0
let cps = 0
let clickPower = 1
let clickCount = 0
let trophies = 0

let target = BASE_TARGET
let awaitingConfirm = false

let cpsCost = 10
let clickPowerCost = 25

let lastSeen = Date.now()

// ===== INIT =====
load()
syncVisualState()
updateUI()
startIdleLoop()

// ===== HELPERS =====
function fmt(n) { return Math.floor(n).toLocaleString() }

function setStatus(msg = "") { statusLineEl.textContent = msg }

function showGolden() {
  btnPng.style.display = "none"
  btnGoldenPng.style.display = "block"
}

function showNormal() {
  btnPng.style.display = "block"
  btnGoldenPng.style.display = "none"
}

function computeNextTarget(current) {
  return Math.floor(Math.max(BASE_TARGET, current) * TARGET_GROWTH + TARGET_BONUS)
}

function checkTarget() {
  if (!awaitingConfirm && score >= target) {
    awaitingConfirm = true
    showGolden()
    targetMessageEl.textContent = `LEVEL ${trophies + 1} COMPLETE ${CHECKMARK} (click to claim)`
    setStatus("Level complete: click the golden button to claim.")
    save()
  }
}

function claimLevel() {
  trophies += 1
  awaitingConfirm = false
  showNormal()

  // Base reward so idle starts even without shopping
  cps += 1

  target = computeNextTarget(target)
  targetMessageEl.textContent = ""
  setStatus("Claimed! +1 CPS")

  save()
  updateUI()
}

function updateUI() {
  scoreDisplayEl.textContent = fmt(score)
  cpsDisplayEl.textContent = fmt(cps)
  clickPowerDisplayEl.textContent = fmt(clickPower)
  clickCountDisplayEl.textContent = fmt(clickCount)
  trophyCountEl.textContent = fmt(trophies)

  targetDisplayEl.textContent = `LEVEL ${trophies + 1} : ${fmt(target)}`
  cpsCostEl.textContent = `Cost: ${fmt(cpsCost)}`
  clickPowerCostEl.textContent = `Cost: ${fmt(clickPowerCost)}`

  buyCpsBtn.disabled = awaitingConfirm || score < cpsCost
  buyClickPowerBtn.disabled = awaitingConfirm || score < clickPowerCost
}

function syncVisualState() {
  if (awaitingConfirm) showGolden()
  else showNormal()
}

function applyOfflineGains() {
  const now = Date.now()
  const elapsedSec = Math.max(0, (now - lastSeen) / 1000)
  const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_SEC)

  const offlineGain = (!awaitingConfirm && cps > 0)
    ? cps * cappedSec
    : 0

  if (offlineGain > 0) {
    score += offlineGain
    setStatus(`Offline gains: +${Math.floor(offlineGain).toLocaleString()}`)
    checkTarget()
  }

  lastSeen = now
}

// ===== IDLE LOOP =====
function startIdleLoop() {
  let last = performance.now()

  function loop(now) {
    const dt = (now - last) / 1000
    last = now

    if (!awaitingConfirm && cps > 0) {
      score += cps * dt
      checkTarget()
    }

    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)

  setInterval(() => {
    updateUI()
    save()
  }, 200)
}

// ===== EVENTS =====
clickButton.addEventListener("click", () => {
  if (awaitingConfirm) {
    claimLevel()
    return
  }

  clickCount += 1
  score += clickPower
  checkTarget()
  updateUI()
})

buyCpsBtn.addEventListener("click", () => {
  if (awaitingConfirm) return
  if (score < cpsCost) return

  score -= cpsCost
  cps += 1
  cpsCost = Math.floor(cpsCost * 1.7 + 5)

  setStatus("+1 CPS bought")
  updateUI()
  save()
})

buyClickPowerBtn.addEventListener("click", () => {
  if (awaitingConfirm) return
  if (score < clickPowerCost) return

  score -= clickPowerCost
  clickPower += 1
  clickPowerCost = Math.floor(clickPowerCost * 1.6 + 10)

  setStatus("+1 Click Power bought")
  updateUI()
  save()
})

resetSaveBtn.addEventListener("click", () => {
  localStorage.removeItem(SAVE_KEY)

  score = 0
  cps = 0
  clickPower = 1
  clickCount = 0
  trophies = 0

  target = BASE_TARGET
  awaitingConfirm = false

  cpsCost = 10
  clickPowerCost = 25
  lastSeen = Date.now()

  syncVisualState()
  targetMessageEl.textContent = ""
  setStatus("Save reset.")
  updateUI()
})

window.addEventListener("beforeunload", () => save())

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save()
})

// ===== SAVE / LOAD =====
function save() {
  const data = {
    score, cps, clickPower, clickCount, trophies,
    target, awaitingConfirm, cpsCost, clickPowerCost,
    lastSeen: Date.now()
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return
    const d = JSON.parse(raw)

    score = Number(d.score) || 0
    cps = Number(d.cps) || 0
    clickPower = Number(d.clickPower) || 1
    clickCount = Number(d.clickCount) || 0
    trophies = Number(d.trophies) || 0

    target = Number(d.target) || BASE_TARGET
    awaitingConfirm = Boolean(d.awaitingConfirm)

    cpsCost = Number(d.cpsCost) || 10
    clickPowerCost = Number(d.clickPowerCost) || 25

    lastSeen = Number(d.lastSeen) || Date.now()

    applyOfflineGains()
  } catch {}
}
