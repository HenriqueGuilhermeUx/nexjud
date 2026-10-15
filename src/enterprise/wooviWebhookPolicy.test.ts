import { describe, expect, it } from "vitest"
import { amountMatchesSignedCharge, findCorrelationID, isPaidEvent, keepExistingPaidPlan, validPaidPlan } from "../../supabase/functions/_shared/wooviWebhookPolicy"

const paid = { event: "OPENPIX:CHARGE_COMPLETED", charge: { correlationID: "order-1", value: 19700, status: "COMPLETED" } }
describe("NexJud signed Woovi webhook policy", () => {
 it("only recognizes actual paid event types", () => {
  expect(isPaidEvent(paid)).toBe(true)
  expect(isPaidEvent({ event: "OPENPIX:TRANSACTION_RECEIVED", transaction: { status: "COMPLETED" } })).toBe(true)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_CREATED", charge: { status: "COMPLETED" } })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_EXPIRED", charge: { status: "EXPIRED" } })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_COMPLETED", charge: { status: "REFUNDED" } })).toBe(false)
 })
 it("extracts correlation IDs from documented payload envelopes", () => {
  expect(findCorrelationID(paid)).toBe("order-1")
  expect(findCorrelationID({ transaction: { charge: { correlationID: "transaction-2" } } })).toBe("transaction-2")
  expect(findCorrelationID({})).toBe("")
 })
 it("rejects paid amount mismatches and malformed values", () => {
  expect(amountMatchesSignedCharge(paid,19700)).toBe(true)
  expect(amountMatchesSignedCharge(paid,39700)).toBe(false)
  expect(amountMatchesSignedCharge({charge:{value:"wat"}},19700)).toBe(false)
  expect(amountMatchesSignedCharge({event:"OPENPIX:TRANSACTION_RECEIVED"},19700)).toBe(true)
  expect(amountMatchesSignedCharge({},-10)).toBe(false)
 })
 it("prevents late older payments from downgrading current active plan", () => {
  expect(keepExistingPaidPlan({plan:"enterprise",status:"active",active:true},"pro")).toBe(true)
  expect(keepExistingPaidPlan({plan:"pro",status:"active",active:true},"enterprise")).toBe(false)
  expect(keepExistingPaidPlan({plan:"enterprise",status:"trialing",active:true},"pro")).toBe(false)
  expect(keepExistingPaidPlan(null,"pro")).toBe(false)
  expect(validPaidPlan("trial")).toBe(false)
 })
})
