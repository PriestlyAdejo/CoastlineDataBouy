You are a senior product designer, dashboard UX designer, design systems designer, and Figma systems architect. You are modifying an existing Figma dashboard for my final-year university engineering project. You are **not** inventing a vague concept from scratch and you are **not** replacing the whole file unless absolutely necessary.

Your task is to upgrade the current design into a more realistic, modular, technically credible buoy monitoring platform that matches the real architecture, data strategy, and likely sensor scope of my project.

You must think like a product designer embedded with an engineering team. That means you should:
- improve information architecture
- improve component logic and reusability
- improve realism of sensors, telemetry, and data presentation
- improve usability and clarity
- improve interactions and state handling
- preserve strong parts of the current design where they already work
- make the system feel portfolio-worthy, presentation-ready, and academically defensible

Do **not** give generic SaaS-dashboard advice.  
Do **not** give a shallow summary.  
Do **not** produce vague moodboard-only output.  
Make strong decisions, assume sensible defaults, and produce implementation-ready design guidance that could be used directly in Figma.

---

# 1. CONTEXT: WHAT THIS PROJECT ACTUALLY IS

This is a **coastal multi-sensor sensing buoy** for a university engineering project.

The buoy is best understood as a **compact, modular, power-aware sensing platform** with:
- a **primary hydrophone payload**
- onboard **Raspberry Pi** data collection
- **local-first logging**
- **lightweight telemetry**, not full high-bandwidth continuous streaming
- environmental sensing
- GPS/location tracking
- system health monitoring
- cloud/backend processing for indexing, summaries, and historical access
- a web dashboard for live status, trends, alerts, previews, and download access

The dashboard must feel:
- scientifically credible
- technically serious
- modern and clean
- engineering-led
- useful to assessors, academics, and engineers
- visually strong enough for poster, presentation, report, and portfolio screenshots

---

# 2. CURRENT FILE: WHAT ALREADY EXISTS AND SHOULD BE CONSIDERED

The existing design already includes a strong dark-mode technical direction and some good starting pieces. You should **upgrade and extend**, not blindly restart.

Current screens/components already visible in the file include:
- a **map-centric overview page** with right-side contextual rail
- **Hydrophone / Acoustic Analysis** page
- **Data Archive / Explorer** page
- **Design System / Style Guide** page
- a left navigation with items such as:
  - Overview
  - Acoustic / Hydrophone
  - Environment
  - Data Explorer
  - Design System
- a right-side contextual area on the overview with tabs like:
  - Overview
  - Telemetry
  - Trends
  - Alerts

These are good starting points.  
However, the current design still feels partially prototype-like and needs to be made more robust, consistent, and realistic.

Important: preserve the strongest aspects where possible:
- dark technical visual language
- map-first monitoring feel
- overall cleanliness
- acoustic page direction
- data explorer structure
- technical presentation quality

Do not destroy good work unnecessarily. Improve it.

---

# 3. REAL SYSTEM ARCHITECTURE YOU MUST DESIGN AROUND

Assume the buoy architecture is:

## Core sensing and monitoring
- Hydrophone + analog front end
- GPS / location
- IMU / motion / orientation / tilt
- Battery voltage and current monitoring
- Internal enclosure temperature and humidity
- At least one external environmental sensor, prioritising:
  - water temperature
  - optional pressure/depth
- Optional expansion sensors depending on configuration:
  - air temperature / humidity
  - solar irradiance / light estimate
  - turbidity
  - conductivity
  - future water-quality modules

## Embedded/device system
- Raspberry Pi main compute
- optional helper MCU / low-power controller
- local storage for raw hydrophone audio and sensor logs
- watchdog / power monitoring

## Communications
- LoRa for low-rate telemetry, health summaries, alerts, and status
- Wi-Fi for servicing / dockside / local access / retrieval
- optional cellular shown only as a future or advanced mode, not default

## Data strategy
- raw hydrophone files are logged locally
- live dashboard data is summary-driven, not full raw audio streaming
- dashboard shows health, previews, trends, alerts, map state, and file availability
- historical and downloadable data is accessed through indexed views, not fake raw streaming

Important realism rule:
The dashboard must **not** pretend the buoy is a giant commercial full-ocean observatory if the project is actually a compact academic prototype.  
However, it **should** feel extensible and professionally structured.

---

# 4. OVERALL DESIGN GOAL

Modify the current Figma dashboard into a robust, modular, realistic monitoring platform with:

1. a stronger overview page
2. deeper drill-down pages from the left navigation
3. configurable overview content
4. richer and more useful interactions
5. a realistic sensor/data model
6. clear distinction between current sensors and future-expandable modules
7. moving / live-feeling graphs and data states
8. a more capable map and deployment-support experience
9. support for poster/presentation/report extraction
10. component consistency across all screens

---

# 5. MOST IMPORTANT CHANGES I WANT

You must incorporate all of the following into the redesign.

## A. OVERVIEW PAGE MUST BECOME MORE INTERACTIVE AND USEFUL
The overview page is already visually promising, but it needs much more functionality.

### Required changes
- Add **hover tooltips over buoy markers**
- Tooltip must show at minimum:
  - buoy name / ID
  - live status
  - last sync time
  - battery %
  - telemetry state
  - key alert state
  - quick environmental summary
- Clicking a buoy must update the right-side contextual panel and selected system state
- The overview must feel like a real command/monitoring centre, not a static hero map

## B. EVERYTHING IN THE RIGHT OVERVIEW RAIL MUST ALSO HAVE A TRUE LEFT-NAV DESTINATION
Right now too much is trapped in the overview context rail.

The left navigation must become a true information architecture with dedicated, deeper pages.

### Required left-nav structure
Add or improve the left navigation so it includes:
- Overview
- Telemetry
- Hydrophone
- Environment
- Location / Map
- System Health
- Alerts
- Historical Data
- Files / Downloads
- Deployment Tools
- Documentation / How It Works
- Settings
- Design System

### Required behaviour
Each non-overview section must:
- have its own proper page
- contain more detailed readings and controls than the overview
- include a mechanism for selecting what summary widgets appear back on the Overview page

Example:
- Telemetry page contains detailed telemetry graphs, link health, cadence, packet loss, comms mode, uptime, etc.
- Telemetry page also includes controls like:
  - “Show on Overview”
  - “Pin summary card”
  - “Use as overview metric”
- Same logic for Environment, Hydrophone, Alerts, and System Health

This overview customisation must look and feel intentional, not fake.

## C. ENVIRONMENT MUST NOT BE GREYED OUT
The Environment item currently looks disabled/incomplete. Fix that.

The Environment section must become a fully active page with realistic structure and sensor grouping.

It should include:
- current environmental summary cards
- trend charts
- thresholds and warnings
- active vs optional vs future module states
- realistic environmental organisation

Use explicit tags/states like:
- Active
- Installed
- Optional
- Available
- Future module
- Not installed on current buoy

This is important because I want scalability shown without falsely implying all sensors are currently present.

## D. SETTINGS MUST LOOK REAL AND BE WORTH HAVING
The settings dropdown/settings system currently feels too placeholder-like.

Create a real settings area with sensible categories such as:
- Dashboard preferences
- Overview layout management
- Units and display preferences
- Map display settings
- Alert thresholds
- Data refresh behaviour
- File retention / sync settings
- Theme / dark-light mode
- Deployment planning overlays
- API / integration placeholders
- Sensor visibility / installed module toggles

Use realistic controls:
- toggles
- dropdowns
- segmented controls
- save/reset actions
- “default vs current” state indicators
- editable but credible settings layout

## E. ALL GRAPHS SHOULD FEEL LIVE BY DEFAULT
The graphs across the dashboard should not feel like static screenshots.

They should look like they are:
- actively updating
- receiving incoming buoy data
- part of a rolling live feed
- operating within a monitoring context

Use tasteful visual cues such as:
- latest-point glow or pulse
- small live dot and timestamp
- rolling timeline window
- incoming data edge
- subtle movement indication
- update cadence labels
- buffered/live states where appropriate

Avoid tacky or over-sci-fi animation language.

## F. ADD A DOCUMENTATION / HOW IT WORKS SECTION
I need a left-nav section that explains the dashboard and system.

This should include placeholder but well-structured content areas for:
- Getting Started
- Dashboard Guide
- Sensor Guide
- Deployment Notes
- Troubleshooting
- API / Integrations
- Data Definitions
- System Architecture
- Maintenance & calibration notes

It must look like a serious knowledge area I can fill in later, not a blank placeholder page.

## G. MAP LAYERS AND DEPLOYMENT DECISION SUPPORT MUST BE UPGRADED
Add map functionality beyond the current dark basemap.

### Required features
- switch between:
  - standard
  - satellite
  - marine / nautical
  - terrain / bathymetry-inspired if appropriate
- optional weather overlays / forecast overlays
- deployment suitability / warning cues for selected zones
- contextual deployment summary

Examples of useful deployment-related information:
- wind / wave / weather warning
- GPS confidence / quality
- rough deployment suitability
- risk zones / restricted zones / caution zones
- environmental overlay toggles

This should feel like an intelligent deployment-planning tool, not just a decorative map.

## H. ADD SENSOR PANES INSPIRED BY SIMILAR PROJECTS, BUT KEEP THEM REALISTIC
Use lessons from similar buoy/environmental monitoring systems, but do not turn this into a fake all-sensors mega platform.

### Core / active categories
- Hydrophone / Acoustic
- GPS / Track / Position
- Motion / Orientation / Tilt / IMU
- Battery / Power / Uptime
- Internal enclosure health
- Water temperature
- optional pressure/depth if relevant

### Optional / expandable categories informed by similar systems
- Air temperature / humidity
- Light / solar input
- Turbidity
- Conductivity
- Dissolved oxygen
- pH
- Weather
- Water quality bundle
- Current / wave / deployment environment
- temperature profiles / multi-depth sensing

### Critical rule
Clearly label everything as:
- Active
- Installed
- Optional
- Future
- Not installed on current buoy

Do **not** misrepresent the project as already having everything installed.

---

# 6. DESIGN LANGUAGE GOAL

The dashboard design language should feel:
- premium
- scientific
- engineering-led
- modern
- coherent
- reusable
- portfolio-worthy
- suitable for a final-year engineering project
- adaptable across dashboard, poster, slides, report figures, and GitHub visuals

Lean toward:
- dark technical dashboard aesthetics
- restrained marine/acoustic cues
- strong typography
- intelligent hierarchy
- minimal clutter
- high-quality data presentation
- subtle depth and component polish
- technical seriousness without visual dullness

Avoid:
- childish blue-ocean clichés
- generic startup SaaS emptiness
- over-neon cyberpunk visuals
- messy, overcomplicated screen layouts
- random accent colours with no logic
- implausible full live audio streaming theatre

---

# 7. REALISM RULES YOU MUST FOLLOW

You must respect these rules in the redesign:

1. The buoy is hydrophone-led and compact, not an infinite commercial monitoring empire.
2. Raw audio should be represented as preview, analysis, and downloadable chunks, not unrealistic continuous full-band live streaming.
3. Live telemetry should be lightweight and summary-driven.
4. Current vs optional vs future sensors must be clearly distinguished.
5. The design should feel expandable without misrepresenting current scope.
6. The dashboard must support both live monitoring and retrospective review.
7. Interactions must feel useful, not decorative.
8. Data explorer/files views should reflect actual indexed files and logs, not vague fake documents.
9. System health should be treated as a first-class monitoring layer, not an afterthought.
10. Environmental sensing must be present but secondary to the hydrophone-led mission of the project.

---

# 8. WHAT I NEED YOU TO PRODUCE

Produce a detailed, implementation-ready redesign brief for the current Figma file.

Structure your response exactly like this:

## A. Design intent for the modification
Explain the overall philosophy of the redesign and what should be preserved vs changed.

## B. Updated information architecture
Show:
- final left-nav structure
- overview vs drill-down relationship
- sub-page grouping
- how right-rail content relates to full pages
- how overview widgets can be configured from deeper pages

## C. Page-by-page redesign guidance
Provide updated guidance for:
1. Overview
2. Telemetry
3. Hydrophone
4. Environment
5. Location / Map
6. System Health
7. Alerts
8. Historical Data
9. Files / Downloads
10. Deployment Tools
11. Documentation / How It Works
12. Settings
13. Design System

For each page define:
- purpose
- layout structure
- key modules/cards
- primary vs secondary information
- interactions
- empty states
- future/expandable states if relevant

## D. Component/system changes required
Define or modify reusable components for:
- sidebar nav items
- buoy map markers
- buoy hover tooltips
- right-side contextual rail modules
- sensor summary cards
- live metric cards
- time-series chart containers
- waveform cards
- spectrogram cards
- alert cards
- status badges
- active/optional/future module tags
- settings controls
- map layer toggles
- tabs
- data tables
- file rows
- section headers
- documentation blocks
- overview widget cards with pin/select behaviour

Use component/variant thinking, not isolated frames.

## E. Sensor and data model structure
Define how the UI should organise:
- core installed sensors
- optional sensors
- future modules
- telemetry summaries
- health states
- file types
- hydrophone summaries
- environment data
- deployment overlays

Make the information model realistic and consistent.

## F. Interaction and behaviour updates
Specify:
- map hover/click behaviour
- overview-to-detail drill-down logic
- live graph behaviour
- overview widget configuration behaviour
- filter/search behaviour
- file browser/detail drawer behaviour
- alert acknowledgement flow
- tab behaviour
- settings save/reset behaviour

## G. Map and deployment-layer improvements
Define:
- map style switching
- weather overlays
- deployment risk layers
- marker states
- selected buoy behaviour
- tooltip content structure
- deployment planning widgets

## H. Styling and visual consistency notes
Provide a refined design direction that can be applied across:
- dashboard
- poster
- slide deck
- report figures
- GitHub visuals

Include:
- colour logic
- typography logic
- chart logic
- map logic
- state colour logic
- visual hierarchy rules
- component consistency guidance

## I. Figma build order / implementation priority
Tell me which parts should be modified first in the existing file.

Prioritise the redesign in a realistic order, for example:
1. information architecture
2. sidebar + contextual rail
3. overview page
4. map interactions
5. telemetry and environment
6. hydrophone refinement
7. alerts/system health
8. historical/files
9. settings/documentation
10. design system cleanup and extraction

---

# 9. FIGMA-SPECIFIC EXPECTATIONS

Think in terms of actual Figma implementation.

Where useful, recommend:
- page/file structure
- component page structure
- auto-layout strategy
- token consistency
- variants/states
- prototyping interactions
- reusable patterns
- which current screens to modify rather than rebuild

If helpful, use a Figma page structure like:
- 00 Foundations
- 01 Components
- 02 Patterns
- 03 App Screens
- 04 Map + Data Viz
- 05 Documentation
- 06 Poster / Slide Assets

---

# 10. OUTPUT QUALITY BAR

Your response must feel like a real senior designer/product systems designer presenting a serious redesign plan to an engineering team.

It must be:
- detailed
- concrete
- specific
- implementation-ready
- realistic
- visually intelligent
- not repetitive filler
- not generic
- not shallow

Do not ask unnecessary clarifying questions.  
Make strong decisions and reasonable assumptions.  
Treat this as a serious design upgrade brief for a technically credible buoy dashboard in Figma.