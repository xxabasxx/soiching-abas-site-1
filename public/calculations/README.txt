ABAS SOFT - Bilingual Flyback DCM design worksheets

These are working calculators, not placeholders.

VERSION 1.2 WORKSHEETS:
Every section shares the same darker charcoal reading theme. Start with four basic
inputs; the advanced assumptions are collapsed and scoped to the section.
No calculations or model self-tests run on initial load. Enter your values,
then press Calculate Step By Step. Importing a project, changing a value,
saving inputs, or requesting print never triggers a calculation implicitly.

The worksheet displays one result about every 800 milliseconds. It follows
the active row with vertical scrolling while keeping horizontal table scroll
unchanged. The bottom controls offer Pause/Resume, Show All and Follow Row.
Pause cancels the pending timer and scrolling; resume starts at the next row.
Changing an input discards the previous run and waits for Calculate again.
Switching to a hidden browser tab pauses the run instead of finishing it.

The worksheet includes a formula bar, numeric substitution and replay.
Click a result or use ArrowUp/ArrowDown/Home/End to inspect its formula.
Inspecting a row pauses the run. Reduced-motion mode disables smooth effects
and turns automatic following off by default. The slow row timing remains.
Report buttons use only existing current results, never a hidden recalculation.

SOURCE AND TOPOLOGY:
The initial input panel explicitly shows Supply type and Topology.
The implemented combination is isolated AC/DC with a DCM flyback.
Other supply types and topologies are visibly disabled and labelled as
unsupported. This update does not implement DC/DC, CCM, LLC or bridge models.
Project JSON includes supplyType and topology. Legacy projects without a
supplyType are interpreted as the previous isolated AC/DC model. Unsupported
configurations are rejected, not silently calculated as a flyback.
Configuration metadata also appears in Excel, text and print reports.

PROGRESSIVE REVEAL:
Future rows contain empty cells, not hidden prefilled formulas or tooltips.
The full row (label, note, symbol, formula, value and unit) is inserted only
when playback reaches it. Group headings appear with their first row.
Supporting calculations are added when the sequence completes or Show All
is selected. The current row gets a soft green frame that moves with playback
and stays on the last revealed row when paused or completed. Green indicates
the playback position, not engineering approval.

Only the active section and its actual dependencies are evaluated. Unrelated
errors, such as output ESR in a transformer worksheet, do not block it.
Any needed shared results are listed separately as calculated prerequisites.

Open ../offline.html for the offline home page, then choose a module:
  input.html         Rectifier, bulk capacitor, hold-up, discharge
  transformer.html   Lp, turns, currents, flux swing, gap and copper fill
  switching.html     MOSFET, sense resistor, losses, RCD and feedback divider
  output.html        Diode, capacitance, ESR, ripple and optional LC post-filter

Keep engine.js, workbook.js, calculator.js and calculator.css in this folder.
JavaScript must be enabled. No server, network, CDN or npm installation is
required by these calculators. The downloadable package includes local fonts.

READABILITY:
Persian text uses Vazirmatn. Latin formulas and technical symbols use
JetBrains Mono with programming ligatures disabled. Both fonts are embedded
in the downloaded calculator HTML and included with their licenses.
Primary table text is 13px, row notes 11.5px, and formulas 11.5px or larger.
Neutral text, a softer charcoal background, more row spacing and subtle
alternating rows replace the small purple text of the earlier theme.
Smaller screens stack table rows without shrinking calculation text.
These visual changes do not alter calculations, timing or auto-scroll.

LANGUAGE AND TABLE UPDATE:
Select Persian or EN in the header. The preference is saved locally and
carried by ?lang=fa or ?lang=en in links, including file:// navigation.
Labels, notes, errors and exported reports follow the chosen language.
Switching language never recalculates a project or replaces its inputs.
User project names and notes are preserved without translation.
Keep ../i18n.js and ../i18n-dom.js with the package.

The table now fits its container. On narrow screens, each row stacks its
formula, result and unit so the last cells cannot disappear off the edge.
The newer .abas.json project format accepts legacy .volta.json files too.

Toolbar:
  Import project     Read .abas.json or a legacy .volta.json project
  Save project       Download inputs and notes as .abas.json
  Print              Print the current section and only its used inputs
  Text               UTF-8 report for the current section
  Excel              Real .xlsx workbook scoped to the current section

Excel sheets: Inputs, Calculations, Dependencies, Checks, References,
Standards. Dependencies contains only the supporting formulas needed for
this worksheet, not full result tables from other sections.
Change Inputs column D to recalculate formulas. Read Checks after changes.
References contains a snapshot of warnings at export time. PASS only means
one numerical model constraint passed, not that a design is safe to build.

The project importer reads JSON only, not Excel. Previous version-1 project
files remain compatible. A project preserves all section inputs, but each
worksheet validates only its required values after the Calculate button is
pressed. Import fills the form and waits; it never starts computation.
An imported project with invalid values remains editable.
Browser storage is temporary; save the JSON file for a durable backup.

MODEL SCOPE AND SAFETY:
Single-output isolated fixed-frequency DCM flyback only. Not CCM, LLC,
forward, half-bridge or full-bridge. Core and device defaults are examples.
The formulas are preliminary engineering estimates, not a certified design.
Core/copper loss, insulation, creepage, clearance, EMI, parasitic behavior,
full feedback compensation and stability are not verified by this tool.
AC mains and bulk capacitors can cause fatal electric shock and fire.
Use component datasheets, independent calculations and qualified lab testing.

Pin=Pout/eta sizes the design reserve. Operating current uses
Psec=(Vo+Vf)*Io to maintain secondary charge balance in the ideal magnetic
model. Read the on-screen assumptions for the distinction and limitations.

Built-in checks include power and current identities, DCM/tolerance checks,
rounding behavior, invalid input tests, and a reference case whose Lp is
409.6 uH and design peak current is 1.5625 A.

Hosting: upload the full extracted website, including this directory.
Custom HTML files can still replace a module, but back up these calculators
first and preserve any dependencies of your replacement document.