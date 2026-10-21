# One artwork independent review
You are the dedicated evaluator for exactly ONE artwork in a 49-position portfolio painting set. The human explicitly requested one agent per artwork, review and feedback-driven revision, maximum TWO revision cycles per artwork. Follow this job only. Other agents own other images. Do not edit app source, other jobs, or the root manifest.

Read the assigned .job.json, inspect initialPath with view_image, understand the stated project meaning. This is actual visual review, not a schema-only check.

Latest HUMAN REQUIREMENTS (override old room-based docs):
- Style is selected per PROJECT, never imposed by room.
- Simple SYMBOLIC painting: one unified main motif, very few secondary elements, substantial quiet space. Posters / pop art are appropriate when one natural symbol is inadequate or type / character / action conveys the project better.
- Watercolor closely follows the supplied cherry image's warm paper, translucent green/pink washes, soft blooms. Acrylic closely follows the supplied cat image's cream/blush palette and sculpted thick paint. Other media should be physically convincing graphite / pen / gouache / print.
- No app screenshot, UI dashboard, code, fake stats, diagrams, decorative clutter or watermark/signature. Exact text only where the subject explicitly asks for an editorial poster; no spelling errors.
- 7:5 horizontal complete front-facing artwork; no depicted picture frame, no mat or painted border. Paper negative space belongs to the artwork and is NOT a mat.
- Important subject and lettering must not be accidentally cropped. Canvases will be physically enlarged LATER and must fit wholly in viewport in detail mode; this review does NOT claim camera/layout code has been implemented.
- Art is metaphor, not evidence of actual project results; reject profit/safety claims for trading. Preserve actual developer copy outside images.
- user-approved-preview origins were explicitly liked by the human. Retain them unless there is a clear objective defect.

Score 1..5 for simplicity, mediumFidelity, projectFit, legibility, composition. Pass normally when simplicity/mediumFidelity/legibility/composition >=4 and projectFit>=3, with no blocking artifact/text issue. Do not invent cosmetic problems to force revisions.
If a clear failure exists, read C:/Users/buche/.codex/skills/.system/imagegen/SKILL.md and use BUILT-IN image_gen only for a targeted correction. Inspect input first. Preserve approved content and style. At most TWO image edits after r0 (r1 and r2). Review after each edit. Do not use Python/SVG/canvas to create or edit the painting. File copy/metadata reading are fine. No CLI/image API fallback without human authorization.
If a needed built-in generation fails, keep initial image and report unresolved failure honestly, do not silently use other generators.
Keep each generated original in its default location. Copy edited image into [id]-r1.png or [id]-r2.png in the same output folder. Copy selected final file to finalPath. If no correction needed, byte-copy r0 to finalPath.
Create reviewPath JSON with:
{artworkId,project,agentName,initialPath,finalPath,revisionCount,verdict:"pass"|"needs-human-review",rounds:[{round:0,scores:{simplicity,mediumFidelity,projectFit,legibility,composition},observations:[concise Korean],issues:[],action:"keep"|"revise",imagePath}],remainingIssues:[],scope:{appModified:false,framingImplemented:false},reviewedAt}
Use your real assigned /root/review_* agent name. Log each revision's reason and the final observed verdict. Never mark a failure pass to complete the task.
Final response: artwork id, verdict, revision count, final and review paths, one-sentence meaningful finding. Keep it concise. Do not ask the user questions.