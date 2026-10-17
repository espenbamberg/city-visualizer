# Understand before drawing

## Discover the focus

Read the request, supplied material and any existing brief first. Reuse answers already given. Ask only questions whose answers change a story, the scope or the allocation of detail; do not make the user complete the brief template as a questionnaire.

Ask up to three initial questions, skipping those already answered:

1. **Audience and purpose:** Who is this map for, and what should they understand or decide?
2. **Perspective:** Whose journey, or what flow, should we follow first?
3. **Emphasis:** What deserves the most attention: the normal process, handoffs, delays, failure points or a proposed improvement?

Use the user's language. Offer a few topic-specific choices, a recommended starting point with a short reason, and free-form answers. Use the available question tool when present; otherwise ask conversationally. Accept “choose for me.” If the user delegates choices or asks for immediate generation, state sensible focus and presentation choices briefly and proceed, asking only about unresolved facts that materially change the explanation.

### Follow the selected perspective

Ask one or two related follow-ups at a time, only where needed:

- What triggers the journey, and what outcome ends it?
- Which handoffs or decisions must appear?
- Which exception would help explain the process?
- Is this the current process or a proposed future?
- Which place or system would benefit from an inside view?
- Must placement reflect real locations, or can it be schematic?

For a customer perspective, investigate waits and visibility. For operations, investigate ownership and blockers. Recommend the spatial frame from the work and handoffs using `landscapes.md`; users need not select a composer or recipe.

Stop when the audience/purpose, primary perspective, journey boundaries and emphasis are clear enough to model. Optional exceptions and drilldowns do not block progress. A complete brief can go straight to an outline. Reopen a question only when new information changes the explanation.

Separate preferences from facts. Delegating the focus does not authorize invented real-world handoffs, timings or outcomes. If input conflicts, ask which account or process version to use. Record meaningful assumptions with the existing source/status conventions and clarify missing facts when they affect meaning. For a requested fictional example, define its operating rules explicitly in the brief.

### Show the direction, then model it

Before detailed modeling, present a compact outline: **audience, intended takeaway, primary perspective, main journey, useful exception, emphasis and inside view**. Omit optional items that add nothing. Make the outline easy to correct and continue when the direction is clear; a separate approval response is not required.

Record the decisions in `templates/brief.md`'s existing sections:

| Answer | Brief section | Map consequence |
|---|---|---|
| Audience and desired understanding/decision | Question and audience | Main question, vocabulary and explanatory depth |
| Perspective and priority journey | Stories | First story, actor or flow, start/end and step sequence |
| Important handoffs and exception conditions | Participants and operating rules; Stories | Named relationships, ownership and alternate outcomes |
| Current or proposed process | Scope | Consistent framing; distinguish alternatives when requested |
| Focus and detail priorities | Size and detail | Primary/supporting/contextual objects and useful internal detail |
| Physical or schematic placement | Environment | Spatial frame and supplied location constraints |
| Useful inside views | Optional insides | Local questions, processes and parent boundaries |

Keep supporting mechanisms needed to explain the journey even when they are not the focus. Preferences change emphasis, not the evidence. These brief prompts are authoring guidance; existing briefs remain usable.

### Same material, two perspectives

**Shared supplied material:** a fictional repair service. A customer books, reception accepts the item, a technician diagnoses it, the parts desk supplies a replacement, the technician repairs it, reception sends a ready-to-collect message, and the customer collects. A missing part leaves the repair waiting. No duration is specified.

**Customer-focused conversation**

- User: “Help first-time customers understand what happens after booking.”
- Ask: “Which should lead: customer actions (recommended for first-time visitors), updates while waiting, or something else?”
- User: “Updates while waiting, from booking through collection.”
- Ask: “Who updates the customer when a part is missing?” This affects a real handoff in the chosen explanation.
- User: “Reception sends a delay message.”
- Outline: **Audience:** first-time customers. **Takeaway:** what happens next and who communicates. **Perspective:** customer actions and status messages. **Main story:** booking → drop-off → ready message → collection. **Exception:** missing part → reception's delay message → waiting. **Emphasis:** reception and customer touchpoints, with diagnosis and parts supply explaining the wait. An inside view is unnecessary for this focus.

**Operations-focused conversation**

- User: “For workshop supervisors, show who owns each handoff and where work gets blocked, from intake to ready for collection.”
- Ask: “Who requests a missing part and who releases the repair when it arrives?” Audience, perspective and boundaries are already supplied.
- User: “The technician requests it; the parts desk tells the technician when it is ready.”
- Outline: **Audience:** supervisors. **Takeaway:** ownership of progress and waiting work. **Perspective:** staff handoffs. **Main story:** reception intake → technician diagnosis → parts request/supply → repair → reception notification. **Exception:** missing part → waiting → availability message → repair resumes. **Emphasis:** technician and parts desk. **Inside view:** workshop diagnosis, parts handoff and repair stations, using the supplied rules.

Both outlines use the same starting material; the follow-up answers add explicitly supplied operating rules. Neither introduces a duration, staffing count or technical system.

## Model the explanation

1. State the question, audience, decision, scope and time period.
2. Read supplied evidence. Keep source IDs and locators; distinguish source statements from interpretations. Investigate missing facts when they affect the explanation.
3. Identify participants, activities, resources, mechanisms, constraints and outcomes. Record who owns each handoff and what moves or changes.
4. Name relationship types. Sequence, movement, information exchange, dependency and causal influence mean different things. Record conditions, delays and feedback where relevant.
5. Trace the priority journey end to end, plus an exception when it helps explain the focus and the material supports it. Resolve missing links before drawing.
6. Write a plain explanation: issue, mechanism, relevant failure conditions and outcome. A reader should understand it before seeing any geometry.
7. Map each semantic entity to a recognizable visual object. Supporting mechanisms need not be computers.
8. Keep composition separate from meaning. Repositioning a building must not change a relationship. Scenery provides context without implying invented measurements or claims.
9. Size the landscape to the explanation. Choose buildings and districts from the meaningful activities and handoffs, and technical objects from the supplied architectural detail. A small case may need five places and no IT; a broad strategy may need thirty or more buildings with supporting services. Record the scope choice in the brief and follow `city-composition.md`.
10. Plan the inside when it adds a new explanation. Identify inputs, local participants/stations, 1–5 useful processes and outputs. Tie those boundaries to the parent object's relationships. Only add another level when there is enough concrete detail; follow `nested-views.md`. Select the traveling representation from what actually moves: person, vehicle, data or energy.

For an example, define its participants and operating rules in the brief. Keep source IDs and status fields as internal metadata.

Before drawing, confirm that each scenario has a trigger, actors or flows, handoffs, an outcome and any applicable exception conditions. Every relationship needs a meaningful source and target; every referenced ID must exist.

## Refine the focus after preview

At the preview handoff, ask one focus question: **“Does this emphasize the right part of the process? What should become more prominent?”** Tailor it to the map, for example whether the parts wait or customer updates need more attention.

Apply feedback to the brief first, then to affected stories, descriptions, object hierarchy or drilldowns. Keep settled choices and reopen only those the correction affects. Recompose only when geometry needs to change, preserving authored scene refinements as described in `landscapes.md`. Review the result against the brief using `verification.md`.

## Writing the generated page

Write short, direct sentences about who acts, what happens and why it matters. Explain the issue rather than defending the illustration. Apply this to titles, summaries, steps, object descriptions, outcomes and the full text view.

Do not add generic disclaimers, repeated fiction/evidence labels, “not a simulation” explanations, safety boilerplate or paragraphs about what the map does not measure. Do not move this boilerplate into the lower text section. Keep sources in a compact source list, with readable titles instead of internal IDs or status badges.

Include concrete conditions that change the story, such as a closed entrance or a missing part. Use claims supported by the input and sources; ask about a missing fact when it changes the explanation. Prefer an accurate general statement to an unsupported numerical claim.

## Technical layers and visible connections

When technical architecture is part of the issue, distinguish the business locations, logical services and technical foundation. Use a clearly labeled adjacent area for recognizable server racks, databases and integration/network components. Model which services use or run on each technical component; do not imply an architecture by scattering decorative hardware.

Keep modeled connections visible in the initial overview, including links across layers. Route them through reserved parallel corridors with named endpoint anchors and directional arrows. Use color plus line style, and explain that crossings are not junctions. Selection highlights the relevant relationships while retaining the surrounding network as context.

Define the technical architecture in the brief and link the modeled services to it. Draw hardware quantities only when they carry meaning in the input.
