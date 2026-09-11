import test from "node:test";
import assert from "node:assert/strict";
import { fallbackAnswer, pcmToWav, speechText } from "../src/assistant.js";

test("fallback library answers core platform questions", () => {
  const questions = [
    ["What is Vyavsay?", /innovation-procurement/],
    ["What are the nine stages of the platform?", /challenge identification/],
    ["What does TRL mean?", /Technology Readiness Level/],
    ["What is DPIIT recognition?", /Department for Promotion/],
    ["What's the difference between a sandbox and a pilot?", /isolated test/],
    ["How do I create an account?", /authorised-user details/],
    ["What is a completeness score?", /drafting aid/],
    ["How do I post a new challenge?", /structured problem statement/],
    ["What documents do I need to apply?", /authorised signatory/],
    ["What's the suggested procurement pathway?", /Procurement Pathways library/],
    ["How is the pilot risk level calculated?", /data sensitivity/],
    ["Who owns the IP in a pilot?", /signed agreement controls/],
    ["What am I supposed to score this startup on?", /Innovation, Feasibility/],
    ["Why did the security weight increase?", /sensitive data/],
    ["How do I declare a conflict of interest?", /Declare the conflict/],
    ["What happens if my score is very different?", /flagged for review/],
    ["Which pilots are ready for validation?", /scope and KPIs are locked/],
    ["What's the KPI achievement?", /verified actual results/],
    ["How do I recommend a scale-up decision?", /authorised human/],
    ["When will I get paid for this milestone?", /startup submits evidence/],
  ];
  questions.forEach(([question, expected]) => assert.match(fallbackAnswer(question), expected, question));
  assert.equal(fallbackAnswer("Compare two unusual deployment architectures", true), null);
});

test("speech output uses the Hindi pronunciation spelling", () => {
  assert.equal(speechText("Welcome to Vyavsay"), "Welcome to व्यवसाय");
  assert.equal(speechText("Welcome to Vyavsay", true), "Welcome to vyuh-vuh-saay");
});

test("Gemini PCM audio is wrapped as a browser-playable WAV", () => {
  const wav = pcmToWav(Buffer.from([0, 0, 1, 0]));
  assert.equal(wav.subarray(0, 4).toString(), "RIFF");
  assert.equal(wav.subarray(8, 12).toString(), "WAVE");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), 4);
});
