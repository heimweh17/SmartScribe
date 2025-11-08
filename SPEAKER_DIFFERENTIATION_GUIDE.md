# Speaker Differentiation Troubleshooting Guide

If the system is not differentiating between doctor and patient well, here are solutions:

---

## Problem: All Text Shows Same Speaker

### Quick Fixes:

### 1. **Check Browser Console**
Open browser console (F12) and look for messages like:
```
🎤 Speaker 0 detected: "How are you feeling?"
🎤 Speaker 1 detected: "I have a headache"
```

**If you see these:** Diarization IS working, but all speakers might be labeled the same in your UI.

**If you DON'T see these:** Diarization isn't detecting multiple speakers.

---

## Solutions (In Order of Easiness):

### Solution 1: **Manual Speaker Toggle** (Easiest, Most Reliable)

Add a button the doctor clicks to indicate who's speaking:

**How it works:**
- Add toggle button: "I'm Speaking" / "Patient Speaking"
- Doctor clicks before they speak
- Patient doesn't need to do anything
- Your friend manually sets `speaker` based on toggle state

**Advantages:**
- 100% accurate
- Works immediately
- No AI guessing
- Simple to implement

**Implementation:**
Tell your friend to add a toggle in their UI that sets:
```javascript
let currentSpeaker = 'Doctor'; // or 'Patient'

// In the callback, override the speaker:
segment.speaker = currentSpeaker;
```

---

### Solution 2: **Wait Longer for Diarization to Learn** (No Code Changes)

**The Issue:**
Deepgram's speaker diarization needs ~30-60 seconds of conversation to accurately learn speaker patterns.

**What to do:**
- Have doctor and patient talk for at least 1 minute
- Make sure they take turns speaking (don't talk over each other)
- Check console logs after 1 minute to see if Speaker 0 and Speaker 1 start appearing

**This improves over time as conversation continues.**

---

### Solution 3: **Use Separate Microphones** (Best AI Accuracy)

**The Problem:**
Single microphone recording both speakers makes it harder for AI to distinguish.

**The Solution:**
- Doctor uses their computer/laptop microphone
- Patient uses a separate USB microphone or phone
- Record two audio channels

**Implementation:**
This requires modifying the code to record multiple audio sources and send as multichannel audio. More complex.

---

### Solution 4: **Better Audio Quality**

**Poor audio quality reduces diarization accuracy.**

**Checklist:**
- ✅ Quiet room (no background noise)
- ✅ Speakers face the microphone
- ✅ Speakers don't talk over each other
- ✅ Clear, distinct voices (male vs female is easier)
- ✅ Adequate distance from microphone (2-3 feet)
- ✅ Use external microphone if possible (not laptop built-in)

---

### Solution 5: **Update Model Settings**

I've already updated the config with better diarization settings:
- ✅ Latest diarization model (2024-09-24)
- ✅ Improved voice activity detection
- ✅ Better speaker turn detection

**Refresh your page** to load the new settings.

---

### Solution 6: **Check if Diarization is Actually Running**

In browser console, check the WebSocket connection parameters:
```
wss://api.deepgram.com/v1/listen?...diarize=true...
```

Make sure `diarize=true` is in the URL.

---

## Testing Speaker Detection:

### Test Scenario 1: Obvious Different Speakers
- Have two people with very different voices (male/female)
- Take clear turns speaking (pause 2-3 seconds between)
- Speak for at least 1 minute
- Check console for "Speaker 0" and "Speaker 1"

### Test Scenario 2: Check Raw Data
In the callback function, add this debug code:
```javascript
console.log('Raw speaker ID:', segment);
```

Look for the `speaker` field in the data. If it's always the same number, diarization isn't working.

---

## Understanding Speaker IDs:

Deepgram assigns speakers as:
- **Speaker 0** - First person detected
- **Speaker 1** - Second person detected

**Note:** It doesn't know which is doctor vs patient. It just knows there are 2 different voices.

Your code maps:
- Speaker 0 → "Doctor"
- Speaker 1 → "Patient"

**But this could be wrong!** If patient speaks first, they'll be Speaker 0 (labeled "Doctor").

---

## Best Practical Solution:

**Combine AI + Manual Override:**

1. Let Deepgram detect speakers automatically
2. In UI, show "Speaker 0" and "Speaker 1" initially
3. Add button: "Mark as Doctor" / "Mark as Patient"
4. Your friend's UI lets user manually correct labels
5. Store the mapping for future corrections

---

## Quick Fix for Your Friend:

Add this option to the MedicalTranscription class:

### Manual Speaker Mode

Tell your friend to add:
```javascript
let isDoctor = true; // Toggle this based on UI button

transcription.start((segment) => {
  // Override speaker based on manual toggle
  segment.speaker = isDoctor ? 'Doctor' : 'Patient';
  addMessageToChat(segment);
});
```

This completely bypasses AI speaker detection and uses manual control instead.

---

## Alternative: Post-Processing Speaker Labels

After recording stops:
```javascript
const transcript = transcription.getTranscript();

// Review and manually correct speakers
transcript.forEach((segment, index) => {
  // Your friend's UI shows each message
  // User clicks "This is Patient" or "This is Doctor"
  // Update segment.speaker accordingly
});

// Then save corrected transcript to database
```

---

## Why Diarization Might Fail:

1. **Similar voices** - Two people with similar pitch/tone
2. **Background noise** - Masks voice characteristics
3. **Poor microphone** - Laptop built-in mics are bad
4. **Overlapping speech** - People talking over each other
5. **Short utterances** - Not enough audio to analyze
6. **Single speaker** - If only one person talks, can't detect two speakers
7. **Accent/Language** - Heavy accents can confuse the model

---

## Recommended Approach for Medical Use:

**Hybrid System:**

1. **Start with AI diarization** (what you have now)
2. **Add manual override toggle** in UI (5 minutes of work)
3. **Allow post-recording correction** (user can fix mistakes)
4. **Save user corrections** to improve future sessions

This gives:
- ✅ Automatic detection when it works
- ✅ Manual control when needed
- ✅ Ability to correct mistakes
- ✅ Best of both worlds

---

## Code I Updated:

✅ Added latest diarization model version
✅ Added voice activity detection parameters
✅ Added better speaker change detection
✅ Added debug logging to console

**Your friend should see in console:**
```
🎤 Speaker 0 detected: "How are you feeling?"
🎤 Speaker 1 detected: "I have a headache"
```

If not appearing, AI isn't detecting multiple speakers.

---

## Immediate Action Items:

1. **Refresh the page** (to load new config)
2. **Check browser console** for speaker detection logs
3. **Test with 2 very different voices** (male/female)
4. **Let conversation run for 1+ minute** before judging
5. **Consider adding manual toggle** as backup

---

## Long-term Solution:

Add a UI feature:
- Toggle switch: "👨‍⚕️ Doctor" / "🤒 Patient"
- Doctor clicks before speaking
- Override AI detection with manual selection
- Store preference per session

This is what professional medical transcription software uses.
