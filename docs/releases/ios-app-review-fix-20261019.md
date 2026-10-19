# NexJud iOS — App Review follow-up, 19/10/2026

## Apple feedback

- Screenshots in App Store Connect contain **non-iOS status bar** and may emphasize non-relevant third-party platforms.
- 2.1(a) app completeness: on **iPad Air 11-inch (M3), iPadOS 27.2**, tapping **Analisar documento** did nothing.
- 2.1(b) App Review requires six business-model answers: who uses subscriptions, where they buy, what subscriptions/features are accessed, paid entitlements without IAP, account registration/fee, and whether enterprise services are sold to single users/consumers/families.

## Scanner root cause and code fix

In `mobile/App.tsx`, Home's `Analisar documento` referenced `route: "Scanner"`, but `MainTabs()` has no `Scanner` tab, and `ScannerScreen` was not registered on `Stack.Navigator`. The action thus targeted a missing route.

- Action now has `parent: "Scanner"` and navigates via `navigation.getParent()?.navigate(parent)`.
- Register `<Stack.Screen name="Scanner" component={ScannerScreen} />`.
- Catch errors from camera permissions, camera UI, and `DocumentPicker.getDocumentAsync` on iPad; show actionable feedback.
- `mobile/scripts/validate-navigation.mjs` checked in and enforced in `NexJud Mobile CI`; rejects missing route references.
- iOS `buildNumber` raised from **4** to **5**, while app version remains **1.0.4** and Android versionCode remains **7**.
- Upload and database code remain unchanged. This source fix **does not prove** behavior in iPad until device testing.

## On-device acceptance checklist (iPad Air M3, iPadOS 27.2)

1. Install the new **1.0.4 (5)** via TestFlight as **an update** over build 4, and again as a clean installation.
2. Log in with a **demo account with fictitious data**, not real client/process records.
3. Home -> **Analisar documento** MUST open the **Legal Lens / Scanner inteligente** screen.
4. Test **Selecionar arquivo**: iPad Files -> choose a sample PDF or DOCX -> verify upload success and presence in Knowledge Base / expected case. Test Files cancel and upload failure notification.
5. Test **Abrir câmera**, grant permission -> capture synthetic document -> upload; deny permission -> explanatory alert. Verify no crash on closing camera.
6. Confirm Cases, Agenda, IA, Profile, sign-out; no iOS signup/payments/upgrades or links to commercial Workspace. For IA, test permission denied, granted and revoked. Inspect new build number in TestFlight.
7. Verify VoiceOver focus, SafeArea, landscape behavior and rotation, if supported; avoid screenshots with personal data.

## App Store Connect screenshot repair

- App Store Connect -> NexJud -> iOS version -> **App Previews and Screenshots** -> **View All Sizes in Media Manager**.
- Inspect every iPhone and iPad display size and every submitted localization for non-iOS status bars, Android navigation buttons, Android notifications, or non-iOS stock imagery.
- Replace with **genuine iOS/iPadOS screenshots** of the actual app, including Home, Legal Brain, Cases, Scanner, Agenda. Use fictitious demo records.
- Apple expects **the majority** of screenshots to show the app in use, not marketing art or login screens. iPad needs its own proper supported device screenshots.
- Take screenshots on iPhone/iPad/simulator only after the 1.0.4 (5) build is installed and verified. Do **not** graphically forge iOS bars on Android captures. Screenshots are App Store **metadata**, not part of the IPA; replacing the binary alone does not fix them.

Official Apple docs:
- https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- https://developer.apple.com/app-store/review/guidelines/

## Honest business model answers for Apple 2.1(b)

1. **Users:** attorneys, solo legal practitioners, law firms, and professional legal teams.
2. **Purchase location:** subscriptions available on NexJud website; no in-app payment, purchase CTA, checkout, external purchase navigation, or subscription upgrades on iOS.
3. **Previously acquired subscriptions:** Pro, Intelligence, Enterprise, Enterprise Plus; subject to account eligibility, users can access supported mobile legal workflows (Legal Brain, case management, document intake, agenda, analysis, drafting).
4. **Paid entitlements in app without IAP:** previously activated account entitlements can enable supported professional productivity and AI features, but the app neither sells nor renews or upgrades them. This may be viewed as paid digital content by Apple.
5. **Account creation:** on NexJud website; registration itself has no fee; trial/paid access eligibility varies; the iOS app is **login only**.
6. **Sales audience:** both individual legal professionals and law firms/legal teams. Enterprise tiers are intended for business/professional use; not family or consumer entertainment. **Never claim enterprise-only sales** when Pro/individual plans exist.

Request evaluation under Apple 3.1.3(f) Free Stand-alone Apps, **not as a guaranteed exception**. If Apple rejects the exception after clarification, viable choices are to restrict paid digital features on iOS or support Apple IAP for eligible features.

## Release and reply gate

Do not submit App Review until the **signed IPA 1.0.4 (5)** passes version/bundle/signature verification, reaches TestFlight, passes the iPad acceptance checklist, screenshot metadata has been replaced for all affected devices/localizations, and App Privacy + review credentials are correct.

The reply to Apple should say the defects are fixed and screenshots updated **only once verified**, and should answer all six business-model questions accurately. 
