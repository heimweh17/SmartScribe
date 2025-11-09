// js/ai-summary.js
/**
 * AI Medical Summary Generator using Google Gemini API
 * Generates SOAP notes from conversation transcripts
 */

class AIMedicalSummary {
  constructor() {
    this.apiKey = GEMINI_CONFIG.apiKey;
    this.model = GEMINI_CONFIG.model;
    this.apiUrl = GEMINI_CONFIG.apiUrl;
    this.isGenerating = false;
  }

  /**
   * Generate medical summary from transcript
   * @param {Array} transcript - Array of conversation segments
   * @param {Object} patientInfo - Patient information
   * @returns {Promise<Object>} - Generated SOAP note
   */
  async generateSummary(transcript, patientInfo = {}) {
    if (this.isGenerating) {
      throw new Error('Summary generation already in progress');
    }

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available to summarize');
    }

    this.isGenerating = true;

    try {
      // Format transcript for AI
      const conversationText = this.formatTranscript(transcript);

      // Create medical summary prompt
      const prompt = this.createMedicalPrompt(conversationText, patientInfo);

      // Call Gemini API
      const summary = await this.callGeminiAPI(prompt);

      // Parse SOAP note from response
      const soapNote = this.parseSOAPNote(summary);

      this.isGenerating = false;
      return soapNote;

    } catch (error) {
      this.isGenerating = false;
      throw error;
    }
  }

  /**
   * Format transcript into readable text
   */
  formatTranscript(transcript) {
    return transcript.map(segment => {
      return `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`;
    }).join('\n');
  }

  /**
   * Create medical summary prompt
   */
  createMedicalPrompt(conversationText, patientInfo) {
    return `You are a medical documentation assistant. Based on the following doctor-patient conversation, generate a comprehensive SOAP note (Subjective, Objective, Assessment, Plan) in professional medical format.

**Patient Information:**
- Name: ${patientInfo.name || 'Not provided'}
- MRN: ${patientInfo.mrn || 'Not provided'}
- Date: ${new Date().toLocaleDateString()}

**Conversation Transcript:**
${conversationText}

**Instructions:**
1. Extract relevant medical information from the conversation
2. Organize into SOAP format:
   - **SUBJECTIVE**: Patient's symptoms, complaints, history in their own words
   - **OBJECTIVE**: Observable findings, vital signs mentioned, physical exam findings
   - **ASSESSMENT**: Clinical impression, diagnosis, problems identified
   - **PLAN**: Treatment plan, follow-up, prescriptions, referrals

3. Use professional medical terminology
4. Be concise but comprehensive
5. Include only information explicitly mentioned in the conversation
6. If a section has no relevant information, write "Not documented in this visit"

**Format your response exactly as:**

SUBJECTIVE:
[Your subjective findings here]

OBJECTIVE:
[Your objective findings here]

ASSESSMENT:
[Your assessment here]

PLAN:
[Your plan here]`;
  }

  /**
   * Call Gemini API
   */
  async callGeminiAPI(prompt) {
    const url = `${this.apiUrl}/${this.model}:generateContent`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    return generatedText;
  }

  /**
   * Parse SOAP note from AI response
   */
  parseSOAPNote(text) {
    const sections = {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    };

    // Try to extract each section
    const subjectiveMatch = text.match(/SUBJECTIVE:?\s*([\s\S]*?)(?=OBJECTIVE:|$)/i);
    const objectiveMatch = text.match(/OBJECTIVE:?\s*([\s\S]*?)(?=ASSESSMENT:|$)/i);
    const assessmentMatch = text.match(/ASSESSMENT:?\s*([\s\S]*?)(?=PLAN:|$)/i);
    const planMatch = text.match(/PLAN:?\s*([\s\S]*?)$/i);

    if (subjectiveMatch) sections.subjective = subjectiveMatch[1].trim();
    if (objectiveMatch) sections.objective = objectiveMatch[1].trim();
    if (assessmentMatch) sections.assessment = assessmentMatch[1].trim();
    if (planMatch) sections.plan = planMatch[1].trim();

    // If parsing failed, return the whole text
    if (!sections.subjective && !sections.objective && !sections.assessment && !sections.plan) {
      sections.subjective = text;
    }

    return sections;
  }

  /**
   * Generate quick summary (shorter version)
   */
  async generateQuickSummary(transcript) {
    const conversationText = this.formatTranscript(transcript);

    const prompt = `Summarize this doctor-patient conversation in 2-3 sentences, focusing on the chief complaint and main points:

${conversationText}

Provide a brief, professional medical summary.`;

    const summary = await this.callGeminiAPI(prompt);
    return summary;
  }

  /**
 * Generate clinical recommendations from transcript and SOAP note
 * @param {Array} transcript - Conversation transcript
 * @param {Object} soapNote - Generated SOAP note
 * @param {Object} patientInfo - Patient information
 * @returns {Promise<Object>} - Clinical recommendations
 */
async generateRecommendations(transcript, soapNote, patientInfo = {}) {
  const conversationText = this.formatTranscript(transcript);
  
  const prompt = `You are a clinical decision support assistant. Based on the following doctor-patient conversation and SOAP note, provide evidence-based clinical recommendations for the physician.

**Patient Information:**
- Name: ${patientInfo.name || 'Not provided'}
- MRN: ${patientInfo.mrn || 'Not provided'}
- Date: ${new Date().toLocaleDateString()}

**Conversation Transcript:**
${conversationText}

**SOAP Note:**
SUBJECTIVE: ${soapNote.subjective}
OBJECTIVE: ${soapNote.objective}
ASSESSMENT: ${soapNote.assessment}
PLAN: ${soapNote.plan}

**Instructions:**
Provide BRIEF, actionable clinical recommendations (1-2 sentences MAXIMUM per category) that the doctor can quickly glance at and communicate to the patient.

1. **Medications**: Specific medication with dosage (e.g., "Lisinopril 10mg daily for blood pressure control")
2. **Lifestyle**: One key lifestyle change (e.g., "30 minutes walking daily, reduce sodium intake")
3. **Follow-up**: When to return (e.g., "Schedule follow-up in 3 months")
4. **Patient Education**: Main teaching point (e.g., "Explain importance of medication adherence")
5. **Diagnostic Tests**: Essential tests only (e.g., "Order lipid panel and HbA1c")
6. **Referrals**: Specialist if needed (e.g., "Refer to cardiologist if BP remains elevated")

**Guidelines:**
- Keep each recommendation to 1-2 sentences MAXIMUM
- Be specific and actionable
- Base recommendations ONLY on conversation content
- If a category doesn't apply, write "None needed"
- Use simple, clear language the doctor can quickly read to the patient

**Format your response exactly as:**

MEDICATIONS:
[One specific medication recommendation - 1 sentence]

LIFESTYLE MODIFICATIONS:
[One key lifestyle change - 1 sentence]

FOLLOW-UP:
[When to return - 1 sentence]

PATIENT EDUCATION:
[Main teaching point - 1 sentence]

DIAGNOSTIC TESTS:
[Essential tests - 1 sentence]

REFERRALS:
[Specialist referral - 1 sentence]`;

  const recommendations = await this.callGeminiAPI(prompt);
  return this.parseRecommendations(recommendations);
}

  /**
   * Parse recommendations from AI response
   */
  parseRecommendations(text) {
    const sections = {
      medications: '',
      lifestyle: '',
      followup: '',
      education: '',
      tests: '',
      referrals: ''
    };

    // Extract each section
    const medicationsMatch = text.match(/MEDICATIONS:?\s*([\s\S]*?)(?=LIFESTYLE MODIFICATIONS:|$)/i);
    const lifestyleMatch = text.match(/LIFESTYLE MODIFICATIONS:?\s*([\s\S]*?)(?=FOLLOW-UP:|$)/i);
    const followupMatch = text.match(/FOLLOW-UP:?\s*([\s\S]*?)(?=PATIENT EDUCATION:|$)/i);
    const educationMatch = text.match(/PATIENT EDUCATION:?\s*([\s\S]*?)(?=DIAGNOSTIC TESTS:|$)/i);
    const testsMatch = text.match(/DIAGNOSTIC TESTS:?\s*([\s\S]*?)(?=REFERRALS:|$)/i);
    const referralsMatch = text.match(/REFERRALS:?\s*([\s\S]*?)$/i);

    if (medicationsMatch) sections.medications = medicationsMatch[1].trim();
    if (lifestyleMatch) sections.lifestyle = lifestyleMatch[1].trim();
    if (followupMatch) sections.followup = followupMatch[1].trim();
    if (educationMatch) sections.education = educationMatch[1].trim();
    if (testsMatch) sections.tests = testsMatch[1].trim();
    if (referralsMatch) sections.referrals = referralsMatch[1].trim();

    return sections;
  }

  /**
   * Check if currently generating
   */
  isGeneratingSummary() {
    return this.isGenerating;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIMedicalSummary;
}