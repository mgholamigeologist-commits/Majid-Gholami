const STORAGE_KEY = 'geologist-assistant-samples';

const form = document.getElementById('sampleForm');
const resultCard = document.getElementById('resultCard');
const sampleLog = document.getElementById('sampleLog');
const clearLogBtn = document.getElementById('clearLog');

const lithologyValue = document.getElementById('lithologyValue');
const confidenceValue = document.getElementById('confidenceValue');
const testsValue = document.getElementById('testsValue');

function readSamples() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSamples(samples) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
}

function buildInterpretation(data) {
  const score = {
    igneous: 0,
    sedimentary: 0,
    metamorphic: 0
  };

  const texture = data.texture;
  const environment = data.environment;
  const minerals = (data.minerals || '').toLowerCase();
  const notes = (data.notes || '').toLowerCase();

  if (['vesicular', 'porphyritic', 'massive'].includes(texture)) score.igneous += 2;
  if (['layered', 'granular'].includes(texture)) score.sedimentary += 2;
  if (['foliated'].includes(texture)) score.metamorphic += 3;

  if (['volcanic', 'hydrothermal'].includes(environment)) score.igneous += 2;
  if (['marine', 'fluvial'].includes(environment)) score.sedimentary += 2;
  if (environment === 'metamorphic-basin') score.metamorphic += 2;

  if (/(quartz|feldspar|olivine|amphibole|pyroxene)/.test(minerals)) score.igneous += 1;
  if (/(calcite|clay|sand|silt|fossil)/.test(minerals + ' ' + notes)) score.sedimentary += 2;
  if (/(mica|garnet|kyanite|staurolite|hornblende)/.test(minerals + ' ' + notes)) score.metamorphic += 2;

  if (/fossil|bedding|cross-bedding|lamination|strata|concretion/.test(notes)) score.sedimentary += 3;
  if (/foliation|schist|gneiss|lineation|fold/.test(notes)) score.metamorphic += 3;
  if (/vesicle|crystal|glass|lava|plug|dyke/.test(notes)) score.igneous += 2;

  if (data.hardness === 'very-hard') score.metamorphic += 1;
  if (data.hardness === 'soft') score.sedimentary += 1;

  const rockType = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const best = ranked[0][1];
  const second = ranked[1][1];
  const gap = best - second;
  const confidence = Math.min(94, 60 + gap * 12);

  const rockNames = {
    igneous: 'Igneous rock',
    sedimentary: 'Sedimentary rock',
    metamorphic: 'Metamorphic rock'
  };

  const detailText = {
    igneous: 'The sample shows characteristics consistent with an igneous origin, likely formed through cooling and crystallization in a volcanic or intrusive setting.',
    sedimentary: 'The sample likely formed through deposition, compaction, and cementation in a low-energy or active depositional environment.',
    metamorphic: 'The sample appears to be a metamorphic rock, suggesting recrystallization under pressure and temperature conditions that altered its mineral fabric.'
  };

  const suggestions = {
    igneous: ['Check for phenocrysts under hand lens', 'Assess flow banding or vesicles', 'Map nearby intrusive or volcanic contacts'],
    sedimentary: ['Look for bedding planes and cross-stratification', 'Inspect for fossils or grain sorting', 'Record provenance and depositional setting'],
    metamorphic: ['Measure foliation angle and lineation', 'Check for mineral alignment and recrystallization', 'Compare with nearby metamorphic grade indicators']
  };

  return {
    rockType: rockNames[rockType],
    confidence: `${Math.round(confidence)}%`,
    summary: detailText[rockType],
    tests: suggestions[rockType],
    fieldNotes: `Targeted follow-up: ${suggestions[rockType][0]}, ${suggestions[rockType][1]}, and ${suggestions[rockType][2]}.`
  };
}

function renderResults(data) {
  const interpretation = buildInterpretation(data);

  resultCard.classList.remove('empty');
  resultCard.innerHTML = `
    <h3>${data.sampleName} — ${interpretation.rockType}</h3>
    <p>${interpretation.summary}</p>
    <ul>
      <li><strong>Location:</strong> ${data.location}</li>
      <li><strong>Texture:</strong> ${data.texture}</li>
      <li><strong>Mineralogy:</strong> ${data.minerals || 'Not specified'}</li>
      <li><strong>Alteration:</strong> ${data.alteration}</li>
    </ul>
    <p>${interpretation.fieldNotes}</p>
  `;

  lithologyValue.textContent = interpretation.rockType;
  confidenceValue.textContent = interpretation.confidence;
  testsValue.textContent = interpretation.tests[0];
}

function renderLog() {
  const samples = readSamples();
  sampleLog.innerHTML = '';

  if (!samples.length) {
    sampleLog.innerHTML = '<li><span>No entries yet. Save your first sample for the field log.</span></li>';
    return;
  }

  samples.forEach((sample) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <div>
        <strong>${sample.sampleName}</strong><br />
        <span>${sample.location} • ${sample.texture} • ${sample.environment}</span>
      </div>
      <span>${sample.rockType}</span>
    `;
    sampleLog.appendChild(item);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = {
    sampleName: document.getElementById('sampleName').value.trim(),
    location: document.getElementById('location').value.trim(),
    color: document.getElementById('color').value.trim(),
    grainSize: document.getElementById('grainSize').value,
    texture: document.getElementById('texture').value,
    hardness: document.getElementById('hardness').value,
    minerals: document.getElementById('minerals').value.trim(),
    environment: document.getElementById('environment').value,
    alteration: document.getElementById('alteration').value,
    notes: document.getElementById('notes').value.trim()
  };

  if (!data.sampleName || !data.location) return;

  const interpretation = buildInterpretation(data);
  data.rockType = interpretation.rockType;

  const samples = readSamples();
  samples.unshift(data);
  saveSamples(samples.slice(0, 8));

  renderResults(data);
  renderLog();
  form.reset();
});

clearLogBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  renderLog();
});

renderLog();
