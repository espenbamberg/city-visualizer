# Plan: adaptive discovery for map focus and journeys

Status: implemented in the repository; manual instruction walkthroughs completed.

## Goal

Give skill users more influence over the map's perspective, stories and visual emphasis through a short conversation before composition, followed by a focused preview question.

Success means a user can steer whose journey matters, what the reader should learn and where the map spends its detail. Each question must affect an identifiable modeling or presentation choice.

## Scope and files

Implement this in the repository's authoring instructions and brief template:

| File | Change |
|---|---|
| `SKILL.md` | Add adaptive discovery, a concise map outline and a preview focus check to the existing workflow. |
| `references/issue-mapping.md` | Define question selection, stopping rules, answer-to-map mapping and two short worked conversations. |
| `templates/brief.md` | Extend existing sections to capture the agreed perspective, priority journey, intended takeaway and detail priorities. |
| `references/verification.md` | Add a brief-to-map focus check to the existing narrative review. |

The repository is the source of truth for this change. Installing or syncing the revised skill is a separate explicit delivery step. Existing briefs remain usable; these are authoring prompts, not required JSON fields. The renderer, viewer and data schemas need no changes.

## 1. Establish the focus

Extend workflow step 1 to read the user's request, supplied material and existing brief before asking questions. Extract what is already answered.

Ask up to three initial questions, using only those still needed:

1. **Audience and purpose:** Who is the map for, and what should they understand or decide?
2. **Perspective:** Whose journey, or what flow, should we follow first?
3. **Emphasis:** Which part matters most: the normal process, handoffs, delays, failure points or a proposed improvement?

Offer a small set of choices grounded in the actual topic, a recommended starting point with a short reason, and room for a free-form answer. Use the available question tool when present; ordinary conversation is sufficient otherwise. Ask in the user's language.

Users may say “choose for me” or request immediate generation. In that case, make sensible presentation choices, state them briefly and proceed. Treat a complete supplied brief as answered intake.

## 2. Ask targeted follow-ups

Select follow-ups from the remaining uncertainties rather than asking the whole list:

- What triggers the journey, and what outcome ends it?
- Which handoffs or decisions must appear?
- Which exception changes the story in a useful way?
- Is this the current process or a proposed future?
- Which place or system benefits from an inside view?
- Must placement reflect real locations, or can it be schematic?

Ask one or two related follow-ups at a time. For a customer perspective, investigate waits and visibility; for an operations perspective, investigate ownership and blockers. Keep the existing content-driven environment selection: users describe the work, and the skill recommends the spatial frame.

Stop once the audience/purpose, main perspective, journey boundaries and emphasis are clear enough to model. Optional exceptions and drilldowns do not block progress. Ask again only when missing or contradictory information would materially change the explanation.

Distinguish preferences from factual operating rules. “Choose for me” permits choosing a focus or arrangement, not inventing real-world handoffs, measurements or outcomes. Record meaningful assumptions in the brief using the existing source/status conventions; clarify unresolved facts when needed.

## 3. Turn answers into an outline and brief

Before writing the detailed model, present a compact outline: audience, intended takeaway, primary perspective, main journey, useful exception, emphasis and any inside view. Make it easy to correct, without requiring a separate approval response when direction is already clear.

Extend the existing brief sections rather than adding a second questionnaire:

| Answer | Brief location | Resulting map choice |
|---|---|---|
| Audience and desired understanding/decision | Question and audience | Main question, vocabulary and explanatory depth |
| Primary perspective and priority journey | Stories | First story, actor or flow, start/end and step sequence |
| Important handoffs and exceptions | Participants and operating rules; Stories | Named relationships, ownership, decision conditions and alternate outcomes |
| Current or proposed process | Scope | Consistent framing throughout the explanation; distinguish alternatives when requested |
| Focus and detail priorities | Size and detail | Primary/supporting/contextual objects and useful internal detail |
| Physical or schematic placement | Environment | Spatial frame, arrangement and supplied location constraints |
| Useful inside views | Optional insides | Local questions and processes with clear parent boundaries |

Supporting mechanisms needed to explain the journey remain represented even when they are not the main focus. User preferences change emphasis, not the underlying evidence.

## 4. Close the loop after preview

Add one focus question to the normal preview handoff: **“Does this emphasize the right part of the process? What should become more prominent?”** Tailor it to the actual map when possible.

Apply feedback first to the brief, then to affected stories, descriptions, object hierarchy or drilldowns. Recompose only when geometry needs to change, preserving authored scene refinements as described in `references/landscapes.md`.

Add a narrative review check: does the first story follow the selected perspective, and do the overview and detail allocation support the intended takeaway? Check against the brief rather than treating a technically valid build as sufficient.

## 5. Verify the instruction change

Review the edited instructions together for consistency, working links and duplication. Add two concise examples to `references/issue-mapping.md`: a customer-focused repair journey and an operations-focused version of the same issue. They should show different follow-ups and map priorities from the same starting material.

Manually walk through these conversation cases and record the observed questions and resulting outline:

| Case | Expected behavior |
|---|---|
| Vague request | Up to three relevant initial questions; answers visibly shape the outline. |
| Detailed brief | Skip answered questions and proceed with the extracted direction. |
| “Choose for me” / immediate generation | Recommend a focus and proceed without a questionnaire or invented facts. |
| Customer versus operations focus | Different priority stories, handoff questions and object emphasis. |
| Conflicting answers or unsupported operating rules | One targeted clarification where the conflict changes meaning. |
| Preview correction | Update the brief and affected map choices without restarting intake. |
| Non-English request | Questions and authored outline follow the user's language. |

Run `git diff --check`. These documentation changes need conversational review rather than new model/browser tests; if a walkthrough builds or changes a map, run that map's normal build and verification checks. Report walkthroughs as manual checks, not deterministic proof of future model behavior.

## Implementation order and completion

1. Write the discovery rules and examples in `references/issue-mapping.md`.
2. Update the brief template to capture the resulting decisions.
3. Wire the workflow and preview question into `SKILL.md`, and add the narrative review check.
4. Run the conversation walkthroughs, revise unclear rules and record results.

Complete when users can steer the priority journey and map focus, already supplied information is reused, delegated choices keep work moving, and the resulting brief carries those decisions through modeling and review.

## Implementation results

- `references/issue-mapping.md` now contains adaptive intake, stopping rules, answer-to-map mapping, customer/operations conversations and preview refinement guidance.
- `templates/brief.md` captures audience, takeaway, perspective, priority journey, process version and detail priorities in its existing sections.
- `SKILL.md` connects discovery to the first story and adds the preview focus question. `references/verification.md` checks the map against the agreed direction.
- The previous blanket requirement for an exception story was made conditional, keeping modeling guidance consistent with the new stopping rule.

### Manual conversation walkthroughs

These are desk walkthroughs of the edited instructions with scripted user inputs and replies, not independent model evaluations or live user sessions. The fictional repair-service material in `references/issue-mapping.md` supplies the operating rules. No maps were generated.

1. **Vague request:** “Map this repair service.” Ask the three unanswered initial questions: audience/purpose, whose journey leads, and emphasis. Scripted reply: “First-time customers; follow the customer from booking through collection; explain what happens next.” Resulting outline: customer actions first, reception and updates prominent, diagnosis/parts supply explain the interval, missing-part waiting is a supported exception. Stop intake; do not ask about optional drilldowns or durations.

2. **Detailed brief:** “For supervisors, show the current process from reception intake to ready-for-collection notification. Focus on staff handoffs and the missing-part wait. Use a schematic view, with no inside view.” No initial questions. Outline: reception → diagnosis → parts supply → repair → notification; technician and parts desk primary; reception supporting. Describe the supplied wait without inventing who orders missing parts. A deeper ownership question becomes necessary only if that extra handoff is included.

3. **Delegated choices / immediate generation:** “Use the supplied service rules; choose the focus and build now.” No preference questions. State the recommendation: a first-time-customer explanation of next steps, booking through collection, with reception prominent and the supplied missing-part wait as an exception. Continue from that outline without claiming a repair duration or adding a delay-message owner absent from the input.

4. **Customer versus operations:** Walk through both conversations in `references/issue-mapping.md`. Customer focus produces a question about who communicates a parts delay, answered “reception”; operations focus produces a question about requesting parts and releasing waiting work, answered “technician requests; parts desk signals availability.” Outlines differ in first-story perspective, prominent objects and usefulness of a workshop inside view. Newly supplied rules are recorded alongside the original material.

5. **Conflicting answers / unsupported rules:** Input says reception sends the ready message; the user says “show the technician notifying customers.” Ask: “Is technician notification a proposed change or a correction to the current process?” Scripted reply: “A proposed change.” Outline and scope describe a proposed process and retain the original rule as current context. In a separate variation, the user requests a 24-hour turnaround absent from the source; ask whether it is an evidenced current rule or a proposed target. Reply: “Neither; leave the number out.” Keep the next-step explanation without a numerical promise.

6. **Preview correction:** After a customer-focused outline, feedback says “The parts delay should be more prominent; keep the customer perspective.” No new intake. Update the brief's emphasis and missing-part story, strengthen the parts explanation, and retain the customer-first journey. Adjust object detail/size only as needed; any recomposition must preserve authored refinements. The targeted next preview question becomes whether the parts wait is now clear enough.

7. **Non-English request:** “Lag et kart for nye kunder. Følg reparasjonen fra bestilling til henting.” Ask only the missing focus question: “Hva bør få mest oppmerksomhet: kundens neste steg (anbefalt for nye kunder), venting eller noe annet?” Reply: “Venting.” Follow up: “Hvem gir kunden beskjed hvis en del mangler?” Reply: “Mottaket.” Outline stays Norwegian: **Målgruppe:** nye kunder. **Formål:** forstå ventingen og hvem som gir beskjed. **Hovedhistorie:** bestilling → innlevering → beskjed om ferdig reparasjon → henting. **Unntak:** manglende del → beskjed fra mottaket → venting. **Vektlegging:** mottak og informasjon til kunden; diagnose og deler forklarer ventingen.

All seven walkthroughs produced an actionable outline or targeted correction while reusing known information. They check the consistency of the written guidance, not guaranteed future model behavior.

### Verification and delivery

- Reviewed the four edited authoring documents together and checked referenced documentation paths.
- `git diff --check` passed; plan-file whitespace checked separately before staging.
- Model/browser suites were not run for this instruction-only change. Fresh-session model behavior and live user usability remain untested.
- The installed skill has not been synced.
