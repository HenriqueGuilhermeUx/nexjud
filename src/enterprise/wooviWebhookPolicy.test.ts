import { describe, expect, it } from "vitest"
import { amountMatchesSignedCharge, findCorrelationID, isPaidEvent, keepExistingPaidPlan, validPaidPlan, activateSignedPaidOrder } from "../../supabase/functions/_shared/wooviWebhookPolicy"

const paid = { event: "OPENPIX:CHARGE_COMPLETED", charge: { correlationID: "order-1", value: 19700, status: "COMPLETED" } }
describe("NexJud signed Woovi webhook policy", () => {
 it("only recognizes actual paid event types", () => {
  expect(isPaidEvent(paid)).toBe(true)
  expect(isPaidEvent({ event: "OPENPIX:TRANSACTION_RECEIVED", transaction: { status: "COMPLETED" } })).toBe(true)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_CREATED", charge: { status: "COMPLETED" } })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_EXPIRED", charge: { status: "EXPIRED" } })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_COMPLETED", charge: { status: "REFUNDED" } })).toBe(false)
  expect(isPaidEvent({ status: "APPROVED" })).toBe(false)
  expect(isPaidEvent({ status: "COMPLETED" })).toBe(false)
  expect(isPaidEvent({ event: "PIX_AUTOMATIC_APPROVED", status: "APPROVED" })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_COMPLETED", charge: { status: "APPROVED" } })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:TRANSACTION_RECEIVED", transaction: { status: "PENDING" } })).toBe(false)
  expect(isPaidEvent({ event: "OPENPIX:CHARGE_COMPLETED" })).toBe(true)
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
  expect(amountMatchesSignedCharge({event:"OPENPIX:TRANSACTION_RECEIVED"},19700)).toBe(false)
  expect(amountMatchesSignedCharge({transaction:{charge:{value:19700}}},19700)).toBe(true)
  expect(amountMatchesSignedCharge({charge:{value:null}},19700)).toBe(false)
  expect(amountMatchesSignedCharge({charge:{value:0}},19700)).toBe(false)
  expect(amountMatchesSignedCharge({},-10)).toBe(false)
 })
 it("prevents late older payments from downgrading current active plan", () => {
  expect(keepExistingPaidPlan({plan:"enterprise",status:"active",active:true},"pro")).toBe(true)
  expect(keepExistingPaidPlan({plan:"pro",status:"active",active:true},"enterprise")).toBe(false)
  expect(keepExistingPaidPlan({plan:"enterprise",status:"trialing",active:true},"pro")).toBe(false)
  expect(keepExistingPaidPlan(null,"pro")).toBe(false)
  expect(validPaidPlan("trial")).toBe(false)
 })
 it("activates entitlement before marking the charge paid", async () => {
  const sequence: string[] = []
  const result = await activateSignedPaidOrder({
   orderAlreadyPaid:false,keepCurrentPlan:false,
   activateSubscription:async()=>{sequence.push("subscription")},
   markOrderPaid:async()=>{sequence.push("paid")},
  })
  expect(sequence).toEqual(["subscription","paid"])
  expect(result).toEqual({duplicate:false})
 })
 it("does not mark the order paid if subscription activation fails", async () => {
  let marked=false
  await expect(activateSignedPaidOrder({
   orderAlreadyPaid:false, keepCurrentPlan:false,
   activateSubscription: async()=>{throw new Error("database failed")},
   markOrderPaid: async()=>{marked=true},
  })).rejects.toThrow("database failed")
  expect(marked).toBe(false)
 })
 it("retries a partially completed order and ignores already-activated duplicates", async () => {
  let paid=false, activationCount=0
  const activate=async()=>{activationCount++}
  await expect(activateSignedPaidOrder({
   orderAlreadyPaid:false,keepCurrentPlan:false,activateSubscription:activate,
   markOrderPaid:async()=>{throw new Error("temporary order update failure")},
  })).rejects.toThrow("temporary")
  await activateSignedPaidOrder({orderAlreadyPaid:false,keepCurrentPlan:false,activateSubscription:activate,markOrderPaid:async()=>{paid=true}})
  expect(paid).toBe(true)
  expect(activationCount).toBe(2)
  await activateSignedPaidOrder({
   orderAlreadyPaid:true,keepCurrentPlan:true,
   activateSubscription:async()=>{throw new Error("should not touch subscription")},
   markOrderPaid:async()=>{throw new Error("should not touch order")},
  })
 })
 it("preserves a higher active plan on out-of-order older payments", async () => {
  const sequence:string[]=[]
  await activateSignedPaidOrder({
   orderAlreadyPaid:false,keepCurrentPlan:true,
   activateSubscription:async()=>{sequence.push("downgrade")},
   markOrderPaid:async()=>{sequence.push("paid")},
  })
  expect(sequence).toEqual(["paid"])
 })

})
