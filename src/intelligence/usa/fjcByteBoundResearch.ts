/**
 * NexJud USA — bitwise source-bound OFFLINE federal-civil research report.
 *
 * Three independent inputs are cross-bound: immutable JSON extract bytes,
 * codebook-reviewed manifest, and an externally supplied expected research
 * selection (dataset/revision/hash/as-of). The expected hash MUST be pinned
 * outside the uploaded file and manifest. None of these can certify that the
 * FJC produced those bytes, license rights or prediction reliability.
 *
 * This is for descriptive censored duration only; no win/loss labels.
 */
import { loadVerifiedFJCJsonSnapshot } from "./fjcVerifiedSnapshot"
import { splitFJCCivilCohortByFiling } from "./fjcTemporalSplit"
import {
  buildUSFederalCivilResearchMemo,
  type USCivilResearchMemo,
  type USCivilResearchSelection,
} from "./fjcCivilResearchMemo"
import type { FJCCivilManifest } from "./fjcCivilCohort"
import { benchmarkUSFJCTerminationFeatureModel, type USFJCTerminationFeatureBenchmark } from "./fjcFeatureLogisticResearch"
import { evaluateUSFJCFixedHorizonBacktest, type USFixedHorizonBacktest } from "./fjcHorizonBacktest"

export interface USByteBoundFJCReport {
  research: USCivilResearchMemo
  fixedHorizonResearchBacktest: USFixedHorizonBacktest
  multiGroupFeatureResearch: USFJCTerminationFeatureBenchmark
  sourceIntegrityChecked: true
  expectedDigestMatched: true
  sourceAuthenticityCertified: false
  modelTrained: false
  individualCasePredictionAvailable: false
  trainingCaseCount: number
  validationCaseCount: number
  excludedFilingGapCases: number
  trainingAsOfDate: string
  validationAsOfDate: string
  temporalReconstructionIsHistoricalSnapshot: false
}

export async function buildUSByteBoundCivilResearch(
  exactExtractBytes: Uint8Array,
  manifest: FJCCivilManifest,
  trainingFiledThrough: string,
  validationFiledFrom: string,
  expected: USCivilResearchSelection,
): Promise<USByteBoundFJCReport> {
  if (!manifest || !expected ||
      manifest.datasetId !== expected.sourceDatasetId ||
      manifest.revision !== expected.sourceRevision ||
      manifest.asOfDate !== expected.snapshotAsOfDate ||
      manifest.releaseSha256.toLowerCase() !== expected.sourceSha256.toLowerCase() ||
      expected.sourceAuditApproved !== true) {
    throw new Error("Unpinned or mismatched US federal civil research source")
  }
  // Digest verified on EXACT bytes before parsing/normalizing; no network.
  const snapshot = await loadVerifiedFJCJsonSnapshot(exactExtractBytes, manifest)
  if (snapshot.sourceSha256 !== expected.sourceSha256.toLowerCase() ||
      snapshot.sourceIntegrityChecked !== true ||
      snapshot.sourceAuthenticityCertified !== false) {
    throw new Error("FJC research provenance boundary not satisfied")
  }
  const split = splitFJCCivilCohortByFiling(
    snapshot.records, trainingFiledThrough, validationFiledFrom,
  )
  // Evaluate held-out filing-period cases only; never silently pool older
  // training cases with newer validation when computing a descriptive report.
  const research = buildUSFederalCivilResearchMemo(split.validation, expected)
  const fixedHorizonResearchBacktest = evaluateUSFJCFixedHorizonBacktest(
    split, expected.courtCode, expected.natureOfSuit, expected.horizonDays,
  )
  const multiGroupFeatureResearch = benchmarkUSFJCTerminationFeatureModel(
    split, expected.horizonDays,
  )
  return {
    research,
    fixedHorizonResearchBacktest,
    multiGroupFeatureResearch,
    sourceIntegrityChecked: true,
    expectedDigestMatched: true,
    sourceAuthenticityCertified: false,
    modelTrained: false,
    individualCasePredictionAvailable: false,
    trainingCaseCount: split.training.length,
    validationCaseCount: split.validation.length,
    excludedFilingGapCases: split.excludedGapCases,
    trainingAsOfDate: split.trainingAsOfDate,
    validationAsOfDate: split.validationAsOfDate,
    // Re-censoring a retrospective file is NOT possession of a genuine
    // as-of-time historical snapshot. Prospective backtesting unvalidated.
    temporalReconstructionIsHistoricalSnapshot: false,
  }
}
