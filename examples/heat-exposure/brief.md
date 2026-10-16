# Linden neighbourhood — heat exposure transfer example

## Question and audience

How do surfaces, shade and access to a cool room change a resident's experience of a hot afternoon?

For residents, school staff and neighbourhood planners. This example follows a resident collecting a child from school and seeking a shaded route and an indoor break.

## Sources, reviewed 12 October 2026

| ID | Source and topic |
|---|---|
| `fixture` | This example brief: five places, routes, participants and opening/closure conditions |
| `epa-surfaces` | US EPA, *What Are Heat Islands?*, “Causes” and “Characteristics”, updated 18 August 2026. https://www.epa.gov/heatislands/learn-about-heat-islands — heat absorption and release by urban surfaces |
| `epa-trees` | US EPA, *Benefits of Trees and Vegetation*, “How Trees and Vegetation Reduce Heat”, updated 15 May 2026. https://www.epa.gov/heatislands/benefits-trees-and-vegetation — shade and evapotranspiration |
| `who-heat` | WHO, *Heat and health*, dated 31 July 2026. https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health — heat exposure and access to cool places |

## Plain explanation

Heat exposure depends on where people wait and walk as well as the weather. Sun-exposed paving absorbs and re-emits heat. Mature tree canopy provides patches of shade, while vegetation cools through evapotranspiration. The community room offers an indoor break when it is open and staffed with working cooling. A closed door sends the family back to the park.

## Authored participants and operating conditions

- A resident leaves the depicted home to collect a child. The school sends a heat-day notice to families.
- The meeting point is a largely unshaded paved square beside the school. The influence arrow connects paving to outdoor heat exposure.
- A maintained park path offers a shaded alternative after pickup. Parks staff maintain the canopy and path.
- A community cool room provides seating, drinking water and mechanical cooling. Community staff publish opening information to the school. The room needs staff, power, working cooling and an open entrance.
- In the ordinary story the room is open and reachable. In the exception it has closed unexpectedly, and the resident has an outdated notice. The drawing remains a cutaway of the facility; the active scenario explicitly states the changed access condition.
- After finding the room closed, the family returns to park shade and needs another indoor place to take a break.

## Scenarios

1. **A hot afternoon (four steps):** walk from home to school → meet at the sunlit square and understand the paving's influence → move to the park's shaded path → reach the open cool room for an indoor break.
2. **A closed door (three steps):** follow the published notice from the park to the cool room → discover access is unavailable → return to park shade while an accessible indoor alternative remains unresolved.

Both stories use the same relationships as the map. Movement, information, access dependencies and environmental influence have distinct line styles.

## Meaning → drawing

| Entity | Recipe | Reason |
|---|---|---|
| `home` | Existing `house` | Residential starting point |
| `school` | New `school` | Cutaway classroom, desks, books, children and teacher make the pickup context visible |
| `square` | New `square` | Exposed dark paving, waiting bench and ground markings make surface exposure legible |
| `park` | New `park` | Mature tree canopy, planted soil, path, benches and people show a shaded route |
| `cool-room` | New `cool-room` | Cutaway common room with seats, visitors, water station and wall cooling unit makes respite and operating dependencies concrete |

Use the shared material palette, typed connections, labels, scenario annotations, controls and offline build.

## Illustrated movement

One resident in an ochre coat follows the narrated trip. Each step declares the actor's location and access condition; scene paths follow sidewalks, the crossing, park paths and the room entrance. The room is closed throughout the exception, including before the resident discovers it. The overview shows the default open cutaway.

Backwards or direct step selection resolves to the selected state. The final step of the closed-door story ends in the park with the indoor break still outstanding.
