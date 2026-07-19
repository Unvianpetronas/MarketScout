import { describe, it, expect } from "vitest";
import { PLANS, FAQS } from "./plans-data";
import { dict } from "@/lib/i18n";

// Regression guard for the exact bug class hit while removing the
// "API Access" feature (2026-07-19): PLANS[i].featureCount/noFeatureCount
// must always match the number of `pricing.plan.<id>.feature.<n>` /
// `noFeature.<n>` keys that actually exist — an off-by-one here silently
// renders the raw i18n key string instead of translated copy, or silently
// drops a feature that does have a translation.
describe("pricing plan i18n keys stay in sync with PLANS counts", () => {
  for (const lang of ["vi", "en"] as const) {
    for (const plan of PLANS) {
      it(`${lang}: ${plan.id} has exactly ${plan.featureCount} feature keys`, () => {
        for (let i = 0; i < plan.featureCount; i++) {
          expect(dict[lang][`pricing.plan.${plan.id}.feature.${i}`]).toBeDefined();
        }
        expect(dict[lang][`pricing.plan.${plan.id}.feature.${plan.featureCount}`]).toBeUndefined();
      });

      it(`${lang}: ${plan.id} has exactly ${plan.noFeatureCount} noFeature keys`, () => {
        for (let i = 0; i < plan.noFeatureCount; i++) {
          expect(dict[lang][`pricing.plan.${plan.id}.noFeature.${i}`]).toBeDefined();
        }
        expect(dict[lang][`pricing.plan.${plan.id}.noFeature.${plan.noFeatureCount}`]).toBeUndefined();
      });

      it(`${lang}: ${plan.id} has name/tagline/quotaLabel/cta keys`, () => {
        for (const suffix of ["name", "tagline", "quotaLabel", "cta"]) {
          expect(dict[lang][`pricing.plan.${plan.id}.${suffix}`]).toBeDefined();
        }
      });
    }

    for (const faqKey of FAQS) {
      it(`${lang}: FAQ "${faqKey}" has both question and answer`, () => {
        expect(dict[lang][`pricing.faq.${faqKey}.q`]).toBeDefined();
        expect(dict[lang][`pricing.faq.${faqKey}.a`]).toBeDefined();
      });
    }
  }

  it("no lingering API Access promise in either language", () => {
    for (const lang of ["vi", "en"] as const) {
      for (const [key, value] of Object.entries(dict[lang])) {
        if (key.startsWith("pricing.")) {
          expect(value.toLowerCase(), `${lang}.${key}`).not.toContain("api access");
        }
      }
    }
  });
});
