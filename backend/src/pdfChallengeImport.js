import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { structureRequirement } from "./structuring.js";
import { structureWithLlm } from "./aiStructuring.js";

const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 12000;

function tidy(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function fallbackSummary(text) {
  const sentences = tidy(text).match(/[^.!?]+[.!?]+/g) || [tidy(text)];
  return sentences.slice(0, 3).join(" ").slice(0, 900);
}

export async function structurePdfChallenge({ bytes, fileName = "challenge-document.pdf" }) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 5 || bytes.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("Upload a valid PDF document.");
  }
  if (bytes.length > MAX_PDF_BYTES) throw new Error("PDF must be 6 MB or smaller.");

  const parser = new PDFParse({ data: bytes });
  let parsed;
  try {
    parsed = await parser.getText();
  } catch {
    throw new Error("This PDF could not be read. Upload a text-based PDF or enter the problem manually.");
  } finally {
    await parser.destroy();
  }

  const extractedText = tidy(parsed?.text).slice(0, MAX_EXTRACTED_CHARS);
  if (extractedText.length < 40) {
    throw new Error("This PDF has no readable text. Upload a text-based PDF or enter the problem manually.");
  }

  const sourceFields = { rawProblemStatement: extractedText, sourceDocumentText: extractedText };
  const fallback = structureRequirement(sourceFields);
  const generated = await structureWithLlm(sourceFields);
  const suggestion = generated?.suggestion ? { ...fallback, ...generated.suggestion } : fallback;

  return {
    ...suggestion,
    documentSummary: generated?.suggestion?.documentSummary || fallbackSummary(extractedText),
    sourceDocument: {
      name: String(fileName).replace(/[\\/\0]/g, "_").slice(0, 180),
      bytes: bytes.length,
      pages: Number(parsed?.total || 0) || null,
      textHash: createHash("sha256").update(bytes).digest("hex"),
      extractedAt: new Date().toISOString(),
    },
    engine: generated ? `llm:${generated.provider}` : "deterministic-policy-structuring-v1",
    model: generated?.model || null,
    llmUsed: Boolean(generated),
  };
}
