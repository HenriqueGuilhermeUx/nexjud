export const PIX_PLAN_CENTS = {
  pro:19700, intelligence:39700, enterprise:79700, enterprise_plus:149700
} as const
export type PixPlan = keyof typeof PIX_PLAN_CENTS
export type PixCustomer = {
  name:string; email:string; taxID:string; phone:string;
  address:{zipcode:string;street:string;number:string;neighborhood:string;city:string;state:string}
}
export function buildMonthlyPixAutomaticRequest(
  plan:PixPlan,customer:PixCustomer,correlationID:string,firstChargeISO:string,nowISO:string
) {
  if(!Object.prototype.hasOwnProperty.call(PIX_PLAN_CENTS,plan))throw Error("invalid_plan")
  if(!/^[\w-]{8,80}$/.test(correlationID))throw Error("invalid_correlation")
  const first=Date.parse(firstChargeISO),now=Date.parse(nowISO)
  if(!Number.isFinite(first)||!Number.isFinite(now)||first-now<3*86400000)
    throw Error("first_charge_must_be_3_days_future")
  if(!customer?.name||!customer.email.includes("@")||!/^\d{11}$|^\d{14}$/.test(customer.taxID.replace(/\D/g,""))||
     !/^55\d{10,11}$/.test(customer.phone.replace(/\D/g,""))||
     !/^\d{8}$/.test(customer.address?.zipcode.replace(/\D/g,""))||
     !customer.address.street||!customer.address.number||!customer.address.neighborhood||
     !customer.address.city||!customer.address.state)throw Error("full_customer_required")
  return {
    name:"NexJud mensal",value:PIX_PLAN_CENTS[plan],customer,correlationID,
    comment:"NexJud mensal",type:"PIX_RECURRING" as const,
    frequency:"MONTHLY" as const,
    dayGenerateCharge:new Date(first).toISOString(),dayDue:3,
    pixRecurringOptions:{journey:"ONLY_RECURRENCY" as const,retryPolicy:"THREE_RETRIES_7_DAYS" as const},
  }
}
// Proposal only: no network call and no subscription activation.
