# NexJud — integridade do arquivo-fonte (sem conclusão legal)

After staging a ctresb/leis Markdown document, call
`verifyLegislationStagedSource(staged, originalMarkdown)` with the original,
unaltered text of the source file. The helper recomputes its SHA-256, validates
the staging identity and checks the exact metadata and body retained by the parser.

This confirms that the document was not silently modified between staging and
snapshot export. **It does not establish authenticity of the publisher, statutory
effectiveness, official text accuracy or legal citation validity.** It is not a
digital signature. Every outcome still carries
`verifiedAgainstOfficialSource: false` and
`safeToCiteAsOfficial: false`.

This verification requires the original Markdown and performs no HTTP calls,
Supabase writes or processing of customer case data.
