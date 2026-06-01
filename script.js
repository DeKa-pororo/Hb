const cardShell = document.getElementById("cardShell");
const openBtn = document.getElementById("openBtn");
const sealBtn = document.getElementById("sealBtn");
const paper = document.querySelector(".paper");
const paperCloseBtn = document.querySelector(".paper-close");
const envelope = document.querySelector(".envelope");
const musicNote = document.getElementById("musicNote");
const playerElapsed = document.querySelector(".player-elapsed");
const playerDuration = document.querySelector(".player-duration");
const playerProgressFill = document.querySelector(".player-progress-fill");
const playerProgressThumb = document.querySelector(".player-progress-thumb");
const playerToggleBtn = document.querySelector(".player-toggle");
const playerReplayBtn = document.querySelector(".player-replay");
const recipientNameEl = document.getElementById("recipientName");
const greetingNameEl = document.getElementById("greetingName");

let hasOpened = false;
let dragging = false;
let dragStartY = 0;
let currentPull = 0;
let peelTimer = null;
let isPeeling = false;
let envelopePhase = "back";
let paperOut = false;
let playbackTimer = null;
let playbackFrame = null;
let audioDurationMs = 0;
let songAudio = null;
let openRevealTimer = null;
let openSettleTimer = null;

const MAX_PULL = 120;
const OPEN_THRESHOLD = 70;

function applyRecipientName() {
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("to") || params.get("name") || "";
  const name = rawName.trim().replace(/\s+/g, " ");

  if (name) {
    if (recipientNameEl) {
      recipientNameEl.textContent = name;
    }
    if (greetingNameEl) {
      greetingNameEl.textContent = name;
    }
    return name;
  }

  if (recipientNameEl) {
    recipientNameEl.textContent = ".............";
  }
  if (greetingNameEl) {
    greetingNameEl.textContent = "";
  }

  return "";
}

applyRecipientName();

function hideSeal() {
  if (!sealBtn) return;
  sealBtn.hidden = true;
  sealBtn.setAttribute("aria-hidden", "true");
  sealBtn.style.display = "none";
}

function showSeal() {
  if (!sealBtn) return;
  sealBtn.hidden = false;
  sealBtn.removeAttribute("aria-hidden");
  sealBtn.style.display = "";
}

hideSeal();

function flipEnvelope() {
  if (hasOpened) return;

  if (peelTimer) {
    clearTimeout(peelTimer);
    peelTimer = null;
  }

  dragging = false;
  isPeeling = false;
  cardShell.classList.remove("is-dragging");
  cardShell.classList.remove("is-peeling");
  resetPull();

  if (envelopePhase === "back") {
    cardShell.classList.add("is-flipped");
    envelopePhase = "front";
    showSeal();
    return;
  }

  if (envelopePhase === "front") {
    cardShell.classList.remove("is-flipped");
    envelopePhase = "back";
    hideSeal();
  }
}

function createSongAudio() {
  if (!songAudio) {
    songAudio = new Audio("HB.mp3");
    songAudio.preload = "metadata";
    songAudio.playsInline = true;
    songAudio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(songAudio.duration)) {
        audioDurationMs = songAudio.duration * 1000;
        if (playerDuration) {
          playerDuration.textContent = formatClock(audioDurationMs);
        }
        if (cardShell.classList.contains("is-playing") && !playbackFrame) {
          startPlaybackUI(audioDurationMs);
        }
      }
    });
    songAudio.addEventListener("ended", () => {
      cardShell.classList.remove("is-playing");
      if (musicNote) musicNote.hidden = true;
      stopPlaybackUI();
      if (playerProgressFill) {
        playerProgressFill.style.width = "100%";
      }
      if (playerProgressThumb) {
        playerProgressThumb.style.left = "100%";
      }
      if (playerElapsed && audioDurationMs > 0) {
        playerElapsed.textContent = formatClock(audioDurationMs);
      }
      syncPlayerButtons(true);
    });
    songAudio.addEventListener("pause", () => {
      syncPlayerButtons(true);
    });
    songAudio.addEventListener("play", () => {
      syncPlayerButtons(false);
    });
  }
  return songAudio;
}

function syncPlayerButtons(isPaused = false) {
  if (playerToggleBtn) {
    playerToggleBtn.textContent = isPaused ? "▶" : "⏸";
    playerToggleBtn.setAttribute("aria-label", isPaused ? "Play" : "Pause");
  }
}

function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopPlaybackUI() {
  if (playbackFrame) {
    cancelAnimationFrame(playbackFrame);
    playbackFrame = null;
  }
}

function startPlaybackUI(durationMs) {
  audioDurationMs = Math.max(1, durationMs);

  if (playerElapsed) {
    playerElapsed.textContent = "00:00";
  }
  if (playerDuration) {
    playerDuration.textContent = formatClock(audioDurationMs);
  }
  if (playerProgressFill) {
    playerProgressFill.style.width = "0%";
  }
  if (playerProgressThumb) {
    playerProgressThumb.style.left = "0%";
  }

  stopPlaybackUI();

  const tick = () => {
    const audio = songAudio;
    const elapsed = audio ? Math.min(audio.currentTime * 1000, audioDurationMs) : 0;
    const pct = (elapsed / audioDurationMs) * 100;

    if (playerElapsed) {
      playerElapsed.textContent = formatClock(elapsed);
    }
    if (playerProgressFill) {
      playerProgressFill.style.width = `${pct}%`;
    }
    if (playerProgressThumb) {
      playerProgressThumb.style.left = `${pct}%`;
    }

    if (elapsed < audioDurationMs) {
      playbackFrame = requestAnimationFrame(tick);
    }
  };

  playbackFrame = requestAnimationFrame(tick);
}

async function playBirthdaySong(fromStart = false) {
  const audio = createSongAudio();

  if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
    await new Promise((resolve) => {
      audio.addEventListener("loadedmetadata", resolve, { once: true });
    });
  }

  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audioDurationMs = audio.duration * 1000;
  }

  if (playerDuration && audioDurationMs > 0) {
    playerDuration.textContent = formatClock(audioDurationMs);
  }

  if (playbackTimer) {
    clearTimeout(playbackTimer);
    playbackTimer = null;
  }

  if (audioDurationMs > 0) {
    startPlaybackUI(audioDurationMs);
  }

  cardShell.classList.add("is-playing");
  syncPlayerButtons(false);

  try {
    if (fromStart || audio.ended) {
      audio.currentTime = 0;
    }
  } catch (error) {
    // Some browsers may reject seeking before metadata is ready.
  }

  await audio.play();
}

async function pauseBirthdaySong() {
  const audio = createSongAudio();
  audio.pause();
  cardShell.classList.remove("is-playing");
  stopPlaybackUI();
  syncPlayerButtons(true);
}

async function replayBirthdaySong() {
  const audio = createSongAudio();
  try {
    audio.currentTime = 0;
  } catch (error) {
    // Ignore seeks that happen before metadata is ready.
  }
  if (musicNote) musicNote.hidden = false;
  await audio.play();
}

async function toggleBirthdaySong() {
  const audio = createSongAudio();

  if (audio.paused || audio.ended) {
    await playBirthdaySong(audio.ended);
    return;
  }

  await pauseBirthdaySong();
}

function setPull(px) {
  currentPull = Math.max(0, Math.min(px, MAX_PULL));
  cardShell.style.setProperty("--pull", `${currentPull}px`);
}

function resetPull() {
  setPull(0);
}

async function openEnvelope() {
  if (hasOpened) return;

  hasOpened = true;
  dragging = false;
  isPeeling = false;
  envelopePhase = "opened";
  paperOut = false;
  if (peelTimer) {
    clearTimeout(peelTimer);
    peelTimer = null;
  }
  if (openRevealTimer) {
    clearTimeout(openRevealTimer);
    openRevealTimer = null;
  }
  if (openSettleTimer) {
    clearTimeout(openSettleTimer);
    openSettleTimer = null;
  }
  cardShell.classList.remove("is-dragging");
  cardShell.classList.remove("is-peeling");
  cardShell.classList.remove("is-paper-out");
  cardShell.classList.add("is-opening");
  hideSeal();
  resetPull();

  if (musicNote) musicNote.hidden = false;

  openRevealTimer = window.setTimeout(() => {
    cardShell.classList.add("is-open");
    cardShell.classList.add("is-playing");
    syncPlayerButtons(false);

    openSettleTimer = window.setTimeout(() => {
      cardShell.classList.remove("is-opening");
      openSettleTimer = null;
    }, 900);
  }, 220);

  try {
    await playBirthdaySong(true);
  } catch (error) {
    console.warn("Audio could not start:", error);
    if (musicNote) musicNote.hidden = true;
    cardShell.classList.remove("is-playing");
    cardShell.classList.remove("is-open");
    cardShell.classList.remove("is-opening");
    stopPlaybackUI();
    syncPlayerButtons(true);
  }
}

function peelThenOpen() {
  if (hasOpened) return;

  if (envelopePhase === "back") {
    flipEnvelope();
    return;
  }

  if (envelopePhase === "front" && !isPeeling) {
    isPeeling = true;
    cardShell.classList.add("is-peeling");

    if (peelTimer) {
      clearTimeout(peelTimer);
    }

    peelTimer = window.setTimeout(() => {
      peelTimer = null;
      openEnvelope();
    }, 460);
    return;
  }

  if (envelopePhase === "front") {
    openEnvelope();
  }
}

function beginDrag(event) {
  if (hasOpened) return;
  if (envelopePhase !== "front") return;

  dragging = true;
  dragStartY = event.clientY;
  currentPull = 0;
  cardShell.classList.add("is-dragging");
  setPull(0);

  try {
    sealBtn.setPointerCapture(event.pointerId);
  } catch (error) {
    // Pointer capture is best-effort here.
  }
}

function moveDrag(event) {
  if (!dragging || hasOpened) return;

  const pull = event.clientY - dragStartY;
  setPull(pull);
}

async function endDrag() {
  if (!dragging || hasOpened) return;

  dragging = false;
  cardShell.classList.remove("is-dragging");

  if (currentPull >= OPEN_THRESHOLD && envelopePhase === "front") {
    peelThenOpen();
    return;
  }

  if (envelopePhase === "front") {
    cardShell.classList.remove("is-peeling");
    isPeeling = false;
  }
  if (peelTimer) {
    clearTimeout(peelTimer);
    peelTimer = null;
  }
  resetPull();
}

function pullPaperOut() {
  if (!cardShell.classList.contains("is-open") || paperOut) return;

  paperOut = true;
  cardShell.classList.add("is-paper-out");
}

function closePaper() {
  if (!hasOpened && !cardShell.classList.contains("is-open")) return;

  if (peelTimer) {
    clearTimeout(peelTimer);
    peelTimer = null;
  }
  if (openRevealTimer) {
    clearTimeout(openRevealTimer);
    openRevealTimer = null;
  }
  if (openSettleTimer) {
    clearTimeout(openSettleTimer);
    openSettleTimer = null;
  }
  if (songAudio) {
    songAudio.pause();
    try {
      songAudio.currentTime = 0;
    } catch (error) {
      // Ignore seeks that happen before metadata is ready.
    }
  }

  hasOpened = false;
  dragging = false;
  isPeeling = false;
  envelopePhase = "back";
  paperOut = false;

  cardShell.classList.remove("is-dragging");
  cardShell.classList.remove("is-peeling");
  cardShell.classList.remove("is-paper-out");
  cardShell.classList.remove("is-open");
  cardShell.classList.remove("is-opening");
  cardShell.classList.remove("is-playing");
  cardShell.classList.remove("is-flipped");
  resetPull();
  hideSeal();
  if (musicNote) musicNote.hidden = true;
  stopPlaybackUI();
  syncPlayerButtons(true);
}

function handlePaperClose(event) {
  event.stopPropagation();
  if (event.type === "pointerdown") {
    event.preventDefault();
  }
  closePaper();
}

sealBtn.addEventListener("pointerdown", beginDrag);
sealBtn.addEventListener("pointermove", moveDrag);
sealBtn.addEventListener("pointerup", endDrag);
sealBtn.addEventListener("pointercancel", endDrag);
sealBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  if (dragging) {
    event.preventDefault();
    return;
  }
  openEnvelope();
});

if (openBtn) {
  openBtn.addEventListener("click", flipEnvelope);
}

if (paper) {
  paper.addEventListener("click", pullPaperOut);
}

if (paperCloseBtn) {
  paperCloseBtn.addEventListener("pointerdown", handlePaperClose);
  paperCloseBtn.addEventListener("click", handlePaperClose);
}

if (playerToggleBtn) {
  playerToggleBtn.addEventListener("click", async () => {
    if (!hasOpened) return;
    try {
      await toggleBirthdaySong();
    } catch (error) {
      console.warn("Toggle playback failed:", error);
    }
  });
}

if (playerReplayBtn) {
  playerReplayBtn.addEventListener("click", async () => {
    if (!hasOpened) return;
    try {
      await replayBirthdaySong();
    } catch (error) {
      console.warn("Replay failed:", error);
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    flipEnvelope();
  }
});

if (envelope) {
  envelope.addEventListener("click", () => {
    if (hasOpened) return;
    flipEnvelope();
  });
}
