import { Platform } from "react-native"
import IosLite from "./IosLite"
import AndroidCompanion from "./AndroidCompanion"

/**
 * Store-specific experiences are intentionally isolated.
 * iOS: free two-feature companion, existing account login only.
 * Android: full current NexJud Companion, unchanged.
 * No native in-app purchases or purchase redirections exist in iOS.
 */
export default function App() {
  return Platform.OS === "ios" ? <IosLite /> : <AndroidCompanion />
}
