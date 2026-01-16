/**
 * Tests for accent mark removal in lookups
 */

import { describe, it, expect } from "vitest";

// Mock the removeAccents function from the API route
function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

describe("Accent Mark Removal", () => {
  it("should remove acute accents from vowels", () => {
    expect(removeAccents("á")).toBe("a");
    expect(removeAccents("é")).toBe("e");
    expect(removeAccents("í")).toBe("i");
    expect(removeAccents("ó")).toBe("o");
    expect(removeAccents("ú")).toBe("u");
  });

  it("should remove grave accents from vowels", () => {
    expect(removeAccents("à")).toBe("a");
    expect(removeAccents("è")).toBe("e");
    expect(removeAccents("ì")).toBe("i");
    expect(removeAccents("ò")).toBe("o");
    expect(removeAccents("ù")).toBe("u");
  });

  it("should remove circumflex accents from vowels", () => {
    expect(removeAccents("â")).toBe("a");
    expect(removeAccents("ê")).toBe("e");
    expect(removeAccents("î")).toBe("i");
    expect(removeAccents("ô")).toBe("o");
    expect(removeAccents("û")).toBe("u");
  });

  it("should remove macrons (long vowel marks)", () => {
    expect(removeAccents("ā")).toBe("a");
    expect(removeAccents("ē")).toBe("e");
    expect(removeAccents("ī")).toBe("i");
    expect(removeAccents("ō")).toBe("o");
    expect(removeAccents("ū")).toBe("u");
  });

  it("should remove breves (short vowel marks)", () => {
    expect(removeAccents("ă")).toBe("a");
    expect(removeAccents("ĕ")).toBe("e");
    expect(removeAccents("ĭ")).toBe("i");
    expect(removeAccents("ŏ")).toBe("o");
    expect(removeAccents("ŭ")).toBe("u");
  });

  it("should handle mixed case", () => {
    expect(removeAccents("Á")).toBe("A");
    expect(removeAccents("É")).toBe("E");
    expect(removeAccents("Ī")).toBe("I");
    expect(removeAccents("Ō")).toBe("O");
    expect(removeAccents("Ū")).toBe("U");
  });

  it("should handle Latin words with accents", () => {
    expect(removeAccents("puellā")).toBe("puella");
    expect(removeAccents("rōmae")).toBe("romae");
    expect(removeAccents("agrícola")).toBe("agricola");
    expect(removeAccents("poētae")).toBe("poetae");
    expect(removeAccents("templō")).toBe("templo");
  });

  it("should handle multiple accents in one word", () => {
    expect(removeAccents("āēīōū")).toBe("aeiou");
    expect(removeAccents("cūrā")).toBe("cura");
    expect(removeAccents("viā")).toBe("via");
  });

  it("should leave unaccented text unchanged", () => {
    expect(removeAccents("puella")).toBe("puella");
    expect(removeAccents("marcus")).toBe("marcus");
    expect(removeAccents("roma")).toBe("roma");
    expect(removeAccents("est")).toBe("est");
  });

  it("should handle empty strings", () => {
    expect(removeAccents("")).toBe("");
  });

  it("should handle non-Latin characters", () => {
    expect(removeAccents("café")).toBe("cafe");
    expect(removeAccents("naïve")).toBe("naive");
  });

  it("should preserve other characters like hyphens and apostrophes", () => {
    expect(removeAccents("in-sītu")).toBe("in-situ");
    expect(removeAccents("qu'est-ce")).toBe("qu'est-ce");
  });
});
