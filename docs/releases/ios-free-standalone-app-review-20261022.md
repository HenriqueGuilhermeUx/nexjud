# NexJud iOS independent free organizer — Apple rejection 22 October 2026

## Rejection addressed

Apple submission `39d96834-3ccf-4683-8731-a396c2d19592`; reviewed on iPad Air 11-inch M3, iPadOS 27.2. Reviewed app version `1.0.4 (6)`, build 6.

- **2.3.10 screenshot metadata:** Android/non-iOS status bar remains in one or more screenshots.
- **3.1.1 / 3.1.3(c):** previous iOS build allowed individual users of paid web platform to access registered web cases without Apple IAP.

## Product decision for build 7

NexJud iOS is a **free, stand-alone, no-signup/no-login, offline two-function organizer**, not a paid web companion.

1. Cases: create, search, view, edit and delete local case notes.
2. Agenda: create, complete and delete local appointments, tasks, deadlines or hearings.

No subscription, prior purchase, entitlement, Google/Apple pay, AI, document scanner, Supabase connection or link to purchase. Reviewers can use all features on first launch. All entries are local to the device; no automatic sync or backup. App notes explicitly warn not to rely on it for formal process deadline notifications.

Android code in `mobile/AndroidCompanion.tsx` and the Web/PWA remain unchanged.

## Confirmed Apple inventory (read-only App Store Connect API)

App Store version state `REJECTED`, display version `1.0.4 (6)` (do not confuse with binary `1.0.4 (6)`), localization `pt-BR`.
- `APP_IPHONE_61`: **4 screenshots**
- `APP_IPAD_PRO_3GEN_129`: **1 screenshot**

Older public description in App Store still advertised `Scanner, Legal Brain, IA, Workspace, upload`. App Store Connect `pt-BR` metadata was updated on 22/10 with an accurate free organizer description, promotional text and keywords. Review information updated to `demoAccountRequired=false` and local functional acceptance instructions.

## Remaining gate (IMPORTANT)

Do **not** resubmit rejected build 6. Build a signed `1.0.4 (7)` binary and upload to TestFlight to test.

**Screenshots cannot be repaired by uploading a new IPA.** In App Store Connect → NexJud → iOS app rejected version → Product Page Information → App Previews and Screenshots → **View All Sizes in Media Manager**, choose **Português (Brasil)**. Remove old screenshots from all device sizes, including four iPhone 6.1 and one iPad 12.9; upload authentic screenshots of the **build 7 actually running** on iPhone and iPad. At least one valid device-size screenshot is required for iPhone and iPad; recommend two for each, Cases and Agenda. Use fictitious cases/tasks, native iOS status bar, no Kobiton browser chrome or Android controls. Do not claim screenshot correction until verified in App Store Connect.

On TestFlight: install clean, no login required. Create case, search it, edit and delete, create agenda task, complete and delete, force-close and reopen to verify persistence; test iPad layout and portrait, offline mode. No cloud data or users modified.

After TestFlight, updated screenshots, privacy disclosure check, and latest build selection, reply to Apple:

> Hello App Review Team, thank you for the detailed feedback. We redesigned NexJud for iOS as a completely free, stand-alone offline organizer. The new build 1.0.4 (7) contains only two local features: Cases (create, search, edit, and delete personal case notes) and Agenda (create, complete, and delete appointments and tasks). All features are available immediately without creating an account or purchasing any subscription. The iOS app has no access to NexJud's paid web service, existing subscriber entitlements, enterprise services, login, AI processing, document scanning, or external payment links. It does not offer or unlock any paid digital goods or services, so there is no content requiring In-App Purchase. We also updated the pt-BR App Store description and promotional text to describe only these free features. We have replaced the previous non-iOS screenshots across iPhone and iPad device sizes with genuine screenshots of the new iOS app in use [ONLY IF VERIFIED]. Please evaluate the new standalone app on its actual functionality. No demo account is needed. Thank you, NexJud Team.

Apple may still request changes. Approval of free v7 does **not** preapprove future paid web functionality.
