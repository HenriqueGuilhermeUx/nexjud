/**
 * NexJud USA — Greenwood sampling-uncertainty diagnostic for DESCRIPTIVE
 * Kaplan–Meier nontermination estimates (independent-censoring assumption).
 *
 * Never turn these bands into individually predictive odds. The log-log
 * interval is asymptotic and cannot establish real-data representativeness.
 * This module is not exposed in the Brazilian application.
 */
import type { USDurationStep, USDescriptiveDurationEstimate } from "./fjcDescriptiveSurvival"

export interface USCensoredDurationUncertainty {
  method: "greenwood_loglog_95"
  horizonDays: number
  survivalEstimate: number
  lower95: number | null
  upper95: number | null
  observedEventsAtHorizon: number
  independentCensoringVerified: false
  calibratedPrediction: false
  publishable: false
}

export function assessUSCivilDurationUncertainty(
  estimate: USDescriptiveDurationEstimate,
): USCensoredDurationUncertainty {
  if (!estimate || estimate.method !== "kaplan-meier" ||
      estimate.predictiveModelValidated !== false ||
      !Array.isArray(estimate.steps) ||
      !Number.isInteger(estimate.cohortN) || estimate.cohortN < 30 ||
      !Number.isInteger(estimate.horizonDays) || estimate.horizonDays <= 0 ||
      !Number.isFinite(estimate.survivalAtHorizon) ||
      estimate.survivalAtHorizon < 0 || estimate.survivalAtHorizon > 1) {
    throw new Error("Invalid US duration uncertainty input")
  }
  let previousDay = -1
  let expectedRisk = estimate.cohortN
  let greenwood = 0
  let observedEvents = 0
  let survival = 1
  for (const st of estimate.steps) {
    if (!validStep(st) || st.days <= previousDay ||
        st.days > estimate.horizonDays || st.atRisk !== expectedRisk ||
        st.terminated + st.censored > st.atRisk) {
      throw new Error("Inconsistent censored risk set")
    }
    previousDay = st.days
    if (st.terminated > 0) {
      observedEvents += st.terminated
      const remainingAfterEvents = st.atRisk - st.terminated
      if (remainingAfterEvents > 0) {
        greenwood += st.terminated / (st.atRisk * remainingAfterEvents)
      }
      survival *= remainingAfterEvents / st.atRisk
    }
    if (Math.abs(survival - st.survival) > 1e-10) {
      throw new Error("Invalid KM survival trajectory")
    }
    expectedRisk -= st.terminated + st.censored
  }
  if (Math.abs(survival - estimate.survivalAtHorizon) > 1e-10) {
    throw new Error("Invalid horizon survival")
  }
  let lower95: number | null = null
  let upper95: number | null = null
  // Degenerate endpoints: no finite log(-log(S)). Suppress a misleading
  // confidence band rather than reporting overly certain [0,0]/[1,1].
  if (survival > 0 && survival < 1 && observedEvents >= 10 && greenwood > 0) {
    const t = Math.log(-Math.log(survival))
    const standardError = Math.sqrt(greenwood) / Math.abs(Math.log(survival))
    const z = 1.959963984540054
    lower95 = Math.exp(-Math.exp(t + z * standardError))
    upper95 = Math.exp(-Math.exp(t - z * standardError))
  }
  return {
    method: "greenwood_loglog_95",
    horizonDays: estimate.horizonDays,
    survivalEstimate: survival,
    lower95,
    upper95,
    observedEventsAtHorizon: observedEvents,
    independentCensoringVerified: false,
    calibratedPrediction: false,
    publishable: false,
  }
}

function validStep(s: USDurationStep): boolean {
  return !!s && Number.isSafeInteger(s.days) && s.days >= 0 &&
    Number.isSafeInteger(s.atRisk) && s.atRisk >= 1 &&
    Number.isSafeInteger(s.terminated) && s.terminated >= 0 &&
    Number.isSafeInteger(s.censored) && s.censored >= 0 &&
    Number.isFinite(s.survival) && s.survival >= 0 && s.survival <= 1
}
