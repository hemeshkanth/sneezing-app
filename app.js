const headline = document.getElementById("headline");
const statusEl = document.getElementById("status");
const listenButton = document.getElementById("listen");
const levelEl = document.getElementById("level");
const countEl = document.getElementById("count");
const dbEl = document.getElementById("db");
const sensitivityEl = document.getElementById("sensitivity");

let audioContext;
let analyser;
let mediaStream;
let timeData;
let freqData;
let listening = false;
let blessingCount = 0;
let lastBlessing = 0;
let onsetStarted = 0;
let peakRms = 0;
let peakHighRatio = 0;
let baseline = 0.006;

function pad(value) {
  return String(value).padStart(2, "0");
}

function setStatus(text) {
  statusEl.textContent = `> ${text}`;
}

function speakBlessYou() {
  window.speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance("Bless you");
  line.rate = 0.95;
  line.pitch = 1.05;
  window.speechSynthesis.speak(line);
}

function bless() {
  const now = performance.now();
  if (now - lastBlessing < 900) return;
  lastBlessing = now;
  blessingCount += 1;
  countEl.textContent = pad(blessingCount);
  headline.textContent = "BLESS YOU";
  setStatus("SNEEZE LOCKED. PROTOCOL COMPLETE.");
  document.body.classList.add("blessed");
  speakBlessYou();
  window.setTimeout(() => {
    document.body.classList.remove("blessed");
    if (listening) {
      headline.textContent = "LISTENING";
      setStatus("READY FOR NEXT SNEEZE.");
    }
  }, 1600);
}

function looksLikeSneeze(rms, highRatio, duration) {
  const sensitivity = Number(sensitivityEl.value);
  const loudEnough = rms > Math.max(0.012, baseline * (4.5 / sensitivity));
  const sneezeLength = duration > 35 && duration < 1400;
  const bursty = highRatio > 0.05;
  return loudEnough && sneezeLength && bursty;
}

function tick() {
  if (!listening || !analyser) return;

  analyser.getFloatTimeDomainData(timeData);
  analyser.getByteFrequencyData(freqData);

  let sum = 0;
  for (let i = 0; i < timeData.length; i += 1) {
    sum += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sum / timeData.length);
  baseline = baseline * 0.992 + rms * 0.008;
  const meter = Math.min(100, rms * 1600);
  levelEl.style.width = `${meter}%`;
  dbEl.textContent = pad(Math.round(meter));

  let highs = 0;
  let total = 0;
  for (let i = 0; i < freqData.length; i += 1) {
    total += freqData[i];
    if (i > freqData.length * 0.12) highs += freqData[i];
  }
  const highRatio = total === 0 ? 0 : highs / total;
  const now = performance.now();

  if (rms > baseline * 2.4) {
    if (!onsetStarted) onsetStarted = now;
    peakRms = Math.max(peakRms, rms);
    peakHighRatio = Math.max(peakHighRatio, highRatio);
  } else if (onsetStarted) {
    const duration = now - onsetStarted;
    if (looksLikeSneeze(peakRms, peakHighRatio, duration)) bless();
    onsetStarted = 0;
    peakRms = 0;
    peakHighRatio = 0;
  }

  requestAnimationFrame(tick);
}

async function startListening() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);
    timeData = new Float32Array(analyser.fftSize);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    listening = true;
    listenButton.textContent = "[ DISARM MIC ]";
    listenButton.classList.add("listening");
    headline.textContent = "LISTENING";
    setStatus("MIC ONLINE. SNEEZE WHEN READY.");
    tick();
  } catch (error) {
    setStatus("MIC ACCESS DENIED. GRANT PERMISSION.");
  }
}

function stopListening() {
  listening = false;
  onsetStarted = 0;
  peakRms = 0;
  peakHighRatio = 0;
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (audioContext) audioContext.close();
  audioContext = null;
  listenButton.textContent = "[ ARM MIC ]";
  listenButton.classList.remove("listening");
  headline.textContent = "AWAIT SNEEZE INPUT";
  setStatus("STANDBY. MIC DISARMED.");
  levelEl.style.width = "0%";
  dbEl.textContent = "00";
}

listenButton.addEventListener("click", () => {
  if (listening) stopListening();
  else startListening();
});
