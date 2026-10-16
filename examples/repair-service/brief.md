# Northbank Repair — example brief

## Question and audience

Why does an appliance-repair service miss its promised completion dates?

Audience: service operators, customers and people learning to map a complex issue. The example explains cross-team handoffs and their consequences.

## Scope

The example covers a single repair from request to return, including collection, diagnosis, quote approval, parts supply and customer communication. Appliance manufacture, payment settlement, staffing policy and long-term demand are outside the boundary.

Source `fixture` refers to the participants and operating rules in this example brief, version 1, authored 12 October 2026.

## Participants

Customer; service coordinator; repair technician; supplier stock clerk; delivery dispatcher/driver. Each has a place of activity and software that supports their work.

## Authored operating rules

1. The customer requests a repair through the service desk. Booking holds the supplied address and preferred collection window. Job records track diagnosis, quote approval and repair state.
2. The service desk books collection with the depot. Dispatch communicates the collection and return runs. The depot brings the appliance to the workshop.
3. The technician diagnoses the fault and reports a quote to the desk. The desk gets customer approval before authorizing repair.
4. The workshop checks the local inventory. Inventory is a record; the physical shelf may disagree with it.
5. With an approved quote and the needed part, the technician repairs and quality-checks the appliance. The workshop releases it to the depot for return.
6. If the recorded part is absent, supplier ordering sends an order to the supplier. The job waits until the part arrives. The desk updates the customer through notifications. No replacement completion date is asserted until supply is confirmed.
7. While waiting, the customer asks the desk for progress. The desk checks with the workshop and passes the update back to the customer.
8. An incorrect collection address causes a failed collection. The depot reports failure, the desk requests a correction, booking is updated, and the dispatcher schedules another collection. The ordinary repair sequence resumes only after collection succeeds.

## Explanation

A completion promise depends on several handoffs, not only on the repair itself. The normal sequence works when address information and parts availability are correct. A missing part causes a supply wait; an incorrect address prevents the repair from reaching the workshop. In either case, the customer experiences a delay while separate people and systems coordinate recovery.

## Scenarios

- **S1 · Book a repair:** a customer visits the open service desk → the coordinator enters the address and preferred collection window in Booking → Booking executes on the application servers → the application stores the record in the operational database. The service-to-server link is a hosting dependency, not an extra message hop. This story ends with a record, before physical collection or repair approval.
- **S2 · Routine repair:** request → collection and intake → diagnosis and approval → repair and quality check → return. Condition: correct address and required part physically available.
- **S3 · Missing part:** follows S2 through approval → stock discrepancy → supplier order and wait → customer update/status cycle → part delivery → repair and return.
- **S4 · Missed collection:** request → failed collection → address correction → collection rescheduled → successful intake → diagnosis, approval, repair and return. Condition: the required part is available after intake.

The data model groups related exchanges into steps. Connection direction follows the sender and receiver of each exchange.

## Semantic-to-visual mapping

| Entity | Visual object | Reason and anchor |
|---|---|---|
| `home` | Pitched-roof residence | Customer's physical context; front-garden service point |
| `desk` | Cutaway service reception | Customer and coordinator at a counter, workstation, forms and waiting chairs; entrance service point |
| `workshop` | Open-front repair workshop | Diagnosis, stock check and repair made visible; loading/service point |
| `supplier` | Stock warehouse | External parts provision; goods-door service point |
| `depot` | Dispatch building and delivery van | Physical collection and return; loading service point |
| `booking` | Labeled filing/server cabinet | Logical address and appointment service; pedestal connection point |
| `jobs` | Labeled filing/server cabinet | Logical job-state service; pedestal connection point |
| `inventory` | Labeled filing/server cabinet | Logical stock record; pedestal connection point |
| `orders` | Labeled filing/server cabinet | Logical supplier-order service; pedestal connection point |
| `dispatch` | Labeled filing/server cabinet | Logical transport scheduling; pedestal connection point |
| `notifications` | Labeled filing/server cabinet | Logical customer messages; pedestal connection point |

Cabinets represent logical services. Trees, benches, window bays, parked vehicles and paving establish the neighbourhood setting.

## Technical architecture — authored extension

The technical area connects the services to their runtime, data storage and external integrations.

- **T1 · Application servers:** a shared runtime for Booking, Job records, Inventory and Dispatch. Each service has its own directed link to this group.
- **T2 · Operational database:** stores these applications' addresses, appointments, job state, recorded stock and dispatch schedules. A link from the servers represents reading and writing records.
- **T3 · Integration gateway:** Supplier orders and Notifications use this group for external exchanges. The application servers also submit exchanges through it. The existing business links to the supplier and customer show the destinations of those exchanges.

The technical foundation is shown beside the business district, connected to the six logical services.

All relationships are visible in the overview. Solid green routes carry appliances/parts, solid blue routes carry business information, dashed ochre routes indicate a business dependency, and dash-dot purple routes describe technical usage or hosting. Arrow direction follows the relationship wording; technical links are not packet traces. Crossings are not junctions: only the named endpoint anchors connect entities. Selecting a component or scenario highlights its relationships without hiding the rest of the network.

## Animated booking symbol

The ochre document represents the request: it appears on the service counter, follows registration to Booking, stays there during the hosting step, and appears on the database when stored. Each step has a complete final state for direct navigation.
