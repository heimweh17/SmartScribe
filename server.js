// server.js
const express = require('express');
const cors = require('cors');
const { z } = require('zod');

const app = express();
app.use(cors({ 
  origin: true,  // Allow all origins including file://
  credentials: true 
}));
app.use(express.json());

// ---- Mock medical data (replace with real CSV/DB later) ----
const ICD10 = [
  { code: 'I10', name: 'Essential (primary) hypertension' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' },
  { code: 'R07.9', name: 'Chest pain, unspecified' },
  { code: 'J10.1', name: 'Influenza with pneumonia' },
  { code: 'R51.9', name: 'Headache, unspecified' },
];

const MEDS = [
  { name: 'Lisinopril 10 mg daily' },
  { name: 'Metformin 500 mg BID' },
  { name: 'Atorvastatin 20 mg nightly' },
  { name: 'Amoxicillin 500 mg TID x7d' },
];

const templates = {
  'chest-pain': [
    { id: 'onset', label: 'Onset' },
    { id: 'quality', label: 'Quality' },
    { id: 'radiation', label: 'Radiation' },
    { id: 'triggers', label: 'Triggers/Relief' },
    { id: 'assoc', label: 'Associated Sx' },
    { id: 'duration', label: 'Duration' },
  ],
  'headache': [
    { id: 'location', label: 'Location' },
    { id: 'severity', label: 'Severity (0–10)' },
    { id: 'features', label: 'Features' },
    { id: 'redflags', label: 'Red Flags' },
  ],
  'fever': [
    { id: 'temp', label: 'Max Temp' },
    { id: 'duration', label: 'Duration' },
    { id: 'focus', label: 'Focus' },
    { id: 'exposure', label: 'Exposure' },
  ],
  'physical': [
    { id: 'screenings', label: 'Screenings Due' },
    { id: 'concerns', label: 'Patient Concerns' },
  ],
  'diabetes': [
    { id: 'meds', label: 'Current Regimen' },
    { id: 'glucose', label: 'Home Glucose' },
    { id: 'complications', label: 'Complications' },
    { id: 'labs', label: 'Recent Labs' },
  ],
};

// ---- Validation schemas ----
const NoteInput = z.object({
  patient: z.object({
    name: z.string().min(1),
    mrn: z.string().min(1),
    dob: z.string().optional(),
  }),
  chiefComplaint: z.string().optional(),
  hpi: z.string().optional(),
  dynamicFields: z.array(z.object({
    label: z.string(),
    value: z.string().optional(),
  })).optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  vitals: z.object({
    bp: z.string().optional(),
    hr: z.string().optional(),
    temp: z.string().optional(),
    o2: z.string().optional(),
  }).optional(),
});

// ---- Helpers ----
function genSOAP(body) {
  const cc = body.chiefComplaint ? `Chief complaint: ${body.chiefComplaint}.` : '';
  const hpi = body.hpi ? `HPI: ${body.hpi}` : '';
  const dyn = (body.dynamicFields || [])
    .filter(f => (f.value || '').trim().length)
    .map(f => `${f.label}: ${f.value}`).join('\n');

  const subjective = [cc, hpi, dyn].filter(Boolean).join('\n').trim() || '—';

  const vitals = body.vitals || {};
  const vitalsLine = [
    vitals.bp ? `BP ${vitals.bp}` : null,
    vitals.hr ? `HR ${vitals.hr}` : null,
    vitals.temp ? `Temp ${vitals.temp}` : null,
    vitals.o2 ? `O₂ ${vitals.o2}` : null,
  ].filter(Boolean).join(', ');

  const objective = `Vitals reviewed${vitalsLine ? `: ${vitalsLine}` : ''}. Physical exam documented as above.`;
  const assessment = body.assessment?.trim() || '—';
  const plan = body.plan?.trim() || '—';

  const full = [
    `Subjective\n${subjective}`,
    `\nObjective\n${objective}`,
    `\nAssessment\n${assessment}`,
    `\nPlan\n${plan}`,
  ].join('\n');

  return { subjective, objective, assessment, plan, note: full };
}

// ---- Endpoints ----

// Generate SOAP note
app.post('/api/notes', (req, res) => {
  const parsed = NoteInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
  }
  const soap = genSOAP(parsed.data);
  res.json({ ok: true, soap });
});

// Search ICD-10
app.get('/api/icd10', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  if (!q) return res.json([]);
  const out = ICD10.filter(
    x => x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q)
  ).slice(0, 10);
  res.json(out);
});

// Search medications
app.get('/api/meds', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  if (!q) return res.json([]);
  const out = MEDS.filter(x => x.name.toLowerCase().includes(q)).slice(0, 10);
  res.json(out);
});

// Get dynamic template for a chief complaint
app.get('/api/templates/:chief', (req, res) => {
  const chief = req.params.chief;
  res.json(templates[chief] || []);
});

// Simple suggestion endpoint (demo)
app.get('/api/suggest', (req, res) => {
  const context = (req.query.context || '').toString();
  if (context === 'diabetes') {
    return res.json({ suggestions: ['Order HbA1c and lipid panel.', 'Assess hypoglycemia episodes.', 'Foot exam and retinal screening status.'] });
  }
  res.json({ suggestions: ['No specific suggestions.'] });
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`UF SmartScribe API running on http://localhost:${PORT}`));