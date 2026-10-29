import "./style.css"
import {createUSPrivatePilotSession,validUSPrivatePilotConfig} from "../src/intelligence/usa/usPrivatePilotSession"

const byId=<T extends HTMLElement>(id:string):T=>{
  const element=document.getElementById(id)
  if(!element)throw new Error("US pilot UI incomplete")
  return element as T
}
const config={
  enabled:import.meta.env.VITE_USA_PILOT_UI_ENABLED==="true",
  supabaseUrl:import.meta.env.VITE_USA_PILOT_SUPABASE_URL||"",
  publishableKey:import.meta.env.VITE_USA_PILOT_PUBLISHABLE_KEY||"",
  expectedProjectRef:import.meta.env.VITE_USA_PILOT_PROJECT_REF||"",
  allowedOrigin:import.meta.env.VITE_USA_PILOT_ORIGIN||"",
  currentOrigin:window.location.origin,
}
const form=byId<HTMLFormElement>("login-form")
const closed=byId<HTMLElement>("unavailable")
const shell=byId<HTMLElement>("pilot-shell")
const email=byId<HTMLInputElement>("email")
const password=byId<HTMLInputElement>("password")
const role=byId<HTMLElement>("pilot-role")
const status=byId<HTMLElement>("status")
const loginButton=byId<HTMLButtonElement>("login-btn")
const logoutButton=byId<HTMLButtonElement>("logout-btn")

const pilot=createUSPrivatePilotSession(config)
if(validUSPrivatePilotConfig(config)){
  closed.hidden=true
  form.hidden=false
}
const messages={
  NOT_ENABLED:"Pilot login is not enabled.",
  INVALID_CREDENTIALS:"Sign-in failed. Check your credentials.",
  NOT_AUTHORIZED:"No active NexJud USA organization membership is authorized for this account.",
  UNAVAILABLE:"The private pilot authorization service is unavailable. No access was granted.",
  BUSY:"A sign-in request is already in progress.",
} as const

form.addEventListener("submit",async(event)=>{
  event.preventDefault()
  if(!validUSPrivatePilotConfig(config))return
  loginButton.disabled=true
  status.textContent="Checking pilot access…"
  try{
    const suppliedPassword=password.value
    password.value=""
    const result=await pilot.login(email.value,suppliedPassword)
    if(result.state==="ACTIVE_PILOT"){
      form.hidden=true
      shell.hidden=false
      role.textContent=result.role
      status.textContent="Pilot access confirmed. Live research remains unavailable."
    }else{
      status.textContent=messages[result.state]
    }
  }finally{
    loginButton.disabled=false
  }
})
logoutButton.addEventListener("click",async()=>{
  logoutButton.disabled=true
  try{
    await pilot.logout()
    shell.hidden=true
    form.hidden=false
    password.value=""
    role.textContent=""
    status.textContent="Signed out. This session was not stored."
  }finally{
    logoutButton.disabled=false
  }
})
