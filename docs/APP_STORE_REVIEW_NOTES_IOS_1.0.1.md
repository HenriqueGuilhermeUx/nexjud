# NexJud iOS 1.0.1 — App Review Information

## Review account

A dedicated Apple App Review account is configured in App Store Connect.

- Username: apple-review@nexjud.com.br
- Authentication: e-mail and password
- Two-factor authentication: disabled
- Access: full customer-facing Enterprise Plus access for review
- Billing: no payment is required from App Review
- Demo content: fictional cases, documents, process information and chat data only

The password must be stored only in App Store Connect > App Review Information and must never be committed to this repository.

## Account deletion

NexJud Companion exposes **Profile > Excluir conta e dados**.

That menu opens:

https://nexjudsolucoes.com.br/account-deletion

The public deletion page now provides a direct authenticated self-service deletion-request flow. The user signs in with the same NexJud account, types **EXCLUIR**, and submits the deletion request. Sending e-mail or contacting support is not required to initiate deletion.

Deletion requests are recorded in `public.account_deletion_requests` under RLS and are linked to the authenticated account.

## Reply to App Review — Guideline 2.1 Information Needed

Hello App Review Team,

Thank you for the opportunity to provide additional information about NexJud Companion.

### 1. Physical-device screen recording

We have attached a screen recording captured on a physical iPhone running the latest available iOS version. The recording begins by launching NexJud Companion and demonstrates the typical user flow, including login, the account registration entry point, Home, Cases, Legal Brain, document scanning/import, Agenda, Profile, privacy information, support, and the account deletion flow.

NexJud does not provide a public social network or public user-generated-content feed. Documents, cases, conversations and other user materials remain inside the authenticated user's private workspace, so public content reporting and user-blocking mechanisms are not applicable.

The review account already has access to paid customer-facing functionality. No payment is required from App Review.

### 2. App purpose and target audience

NexJud Companion is a productivity and legal-intelligence application designed for lawyers and legal professionals, including independent professionals and law firms.

It helps legal professionals organize cases and documents, review public judicial information, prepare for hearings, analyze legal materials and use AI-assisted workflows from a mobile device.

NexJud is a technology support tool. It does not replace professional legal judgment, does not provide legal representation, and does not guarantee the outcome of any legal proceeding. AI-generated analyses, summaries, drafts and suggestions must be reviewed by the responsible professional.

### 3. Access and main features

The dedicated App Review credentials are provided in the App Review Information section.

The review account has full customer-facing Enterprise Plus access and contains fictional demonstration data only. No real client information, payment, bank credentials or sample files are required.

After login, the reviewer can access:

- Home / Decision Intelligence
- Cases and case dossiers
- Legal Brain
- Document Scanner and file import
- Agenda
- Profile, privacy, support and account deletion

The review account contains fictional cases, documents, process information and an AI conversation for testing.

### 4. External services and platforms

NexJud uses the following external services and platforms:

- Supabase for authentication, database, storage and server-side application functions
- OpenAI services for AI-assisted legal analysis and text generation
- CNJ DataJud, the Brazilian National Council of Justice public judicial-data service, for supported public process and decision information
- Woovi for web-based Pix subscription billing outside the submitted iOS purchase flow
- NexJud Workspace at nexjudsolucoes.com.br for the web workspace and account/support pages

The submitted iOS build does not contain a button or flow that initiates an external subscription purchase. The App Review account already has full access.

### 5. Regional differences

The core authenticated application experience is consistent for users. The current legal-intelligence content is primarily designed for Brazilian legal professionals and therefore uses Brazilian judicial terminology and supported public judicial information, including CNJ DataJud.

### 6. Regulated services and third-party material

NexJud is software for legal professionals. NexJud is not a law firm and does not represent users or their clients before courts or government authorities.

Judicial information used by supported decision-intelligence features comes from public judicial data sources, including CNJ DataJud. User documents and case materials are supplied by the authenticated user, who is responsible for having the appropriate authorization and legal basis to process such information.

NexJud does not claim ownership of protected third-party legal publications or editorial material.

Support:
https://nexjudsolucoes.com.br/support

Privacy Policy:
https://nexjudsolucoes.com.br/privacy

Account deletion:
https://nexjudsolucoes.com.br/account-deletion

We are available to provide any additional information or documentation required to complete the review.

## Physical recording checklist

Record one continuous video on a physical iPhone running the latest available iOS version:

1. Start from the iPhone Home Screen and tap the NexJud icon.
2. Show the login screen.
3. Tap “Criar conta ou recuperar senha” and briefly show the account-registration entry point, then return to the app.
4. Log in with the dedicated App Review account.
5. Show Home / Decision Intelligence.
6. Open Cases and a fictional case dossier.
7. Open Legal Brain and show the review account's demo content or submit a harmless demo prompt.
8. Open Scanner and show the camera/file-import entry points. It is not necessary to upload confidential material.
9. Open Agenda.
10. Open Profile.
11. Show Privacy Policy and Support.
12. Open “Excluir conta e dados”.
13. Show the authenticated self-service deletion page and the confirmation step. Do not complete the deletion request for the review account during your own recording unless you intend to leave a pending request.
14. Return to the app and show that the review account can access full features.

## Screenshot rule for this submission

Replace reconstructed or marketing-style screenshots with screenshots captured from the actual submitted app in use.

- iPhone screenshots: capture the real TestFlight build.
- iPad 12.9/13-inch screenshots: capture the real iPad layout from the submitted build on an iPad or iPad simulator at an App Store-supported resolution.
- Do not resize an iPhone screenshot to satisfy the iPad slot.
