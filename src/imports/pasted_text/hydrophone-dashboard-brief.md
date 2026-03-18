You are a senior product designer, acoustic dashboard UX designer, scientific data-visualisation designer, and Figma systems architect. You are helping me **modify and upgrade the Hydrophone / Acoustic section** of an existing dark-mode buoy dashboard in Figma for my final-year engineering project.

You are **not** designing a whale-species dashboard.  
You are **not** making a wildlife-identification product.  
You are **not** creating a generic audio-player UI.

You are designing a **coastal hydrophone monitoring dashboard** for a compact engineering buoy that measures **ocean and coastal acoustic conditions** and may include **event classification for underwater/coastal sound events**, but not species-specific whale metrics.

Your goal is to take inspiration from the SeaStats-style metric structure and interactive acoustic analytics patterns, while adapting them into a more technically credible, engineering-led, modern, dark-mode interface that matches my buoy project.

Do not give vague design ideas.  
Do not give generic SaaS dashboard advice.  
Do not keep it high-level.  
Make strong decisions and produce a **concrete, implementation-ready redesign brief** for the Hydrophone section in Figma.

---

# 1. PROJECT CONTEXT

This project is a **coastal multi-sensor sensing buoy** with a **hydrophone-led payload**.

The hydrophone system is intended to monitor the **underwater/coastal soundscape** and related acoustic conditions around a coastal deployment region. The system is not focused on whale species detection. Instead, it should support analysis of:

- broad soundscape conditions
- ocean/coastal acoustic energy trends
- band-limited sound levels
- acoustic event detection / classification
- equipment recording effort and data completeness
- preview-based review of acoustic chunks and spectrograms
- environmental interpretation of acoustic conditions

Possible event classifications can include categories such as:
- vessel passage
- propeller / cavitation event
- surf / wave-breaking dominance
- rainfall / weather-driven noise
- port / industrial activity
- broadband transient / impulse
- unknown anomaly
- low-frequency persistent hum
- sediment / debris-related transient
- optional future “bioacoustic / natural event” category, but **not** whale-species-first

The hydrophone dashboard must feel:
- technically serious
- engineering-led
- scientific
- modern
- reusable for presentation/report/poster visuals
- realistic for a compact prototype buoy
- expandable, but not fake or over-scoped

---

# 2. IMPORTANT REALISM RULES

You must respect these rules in the redesign:

1. This is **not a whale dashboard**. Replace whale-centric concepts with **coastal acoustic monitoring concepts**.
2. Do **not** use species cards like “Orca” or “Humpback” as the primary concept.
3. The hydrophone system should support **event classes**, **soundscape metrics**, **spectral metrics**, **sound level bands**, and **recording effort**, not wildlife-species branding.
4. Raw audio should be represented as:
   - preview clips
   - event replays
   - downloadable chunks
   - spectrogram-linked segments
   - indexed files
   not fake 24/7 full-stream theatre.
5. The buoy is a compact academic prototype, not a giant commercial observatory.
6. Metrics should feel genuinely useful for:
   - deployment monitoring
   - acoustic environment interpretation
   - system validation
   - anomaly spotting
   - instrumentation review
7. The design should feel expandable for future classifiers, but should not falsely imply that everything is already production-grade.

---

# 3. WHAT I WANT ADDED TO THE HYDROPHONE DASHBOARD

I want the Hydrophone / Acoustic section to be expanded so it includes a serious acoustic analytics suite inspired by the examples I attached, but adapted to my actual project.

Use the SeaStats metric structure as a **functional inspiration**, not a literal copy.

I want the hydrophone section to include the following major areas/pages/modules:

## A. Station Summary
A concise acoustic station summary page/card group that gives an immediate understanding of the hydrophone state.

Include:
- current hydrophone status
- recording state
- latest acoustic event
- latest average noise level
- recent event class summary
- dominant band summary
- data freshness
- recording effort / coverage
- storage / chunk availability
- quick summary of whether the station is acoustically quiet / active / anomalous relative to recent baseline

Possible summary cards:
- latest acoustic event class
- latest noise level
- dominant spectral band
- last event timestamp
- daily event count
- daily recording effort
- storage availability
- data latency / ingest age

## B. Daily Event Detections
Replace “Daily Whale Detections” with a more appropriate coastal acoustic equivalent.

Create a page/panel for:
- daily event detections over time
- counts per day or event rate per 24h
- stacked or grouped categories
- event classifier categories instead of species
- recording-gap handling
- smoothing controls
- date range selection
- filter by event class
- optional intensity weighting or confidence weighting

Event class examples:
- Vessel
- Wave / Surf
- Rain / Weather
- Port / Machinery
- Broadband Transient
- Unknown / Anomaly

Important:
- days with poor recording effort must be visually differentiated
- no-data or low-effort days should be shaded and explained
- allow smoothing options like the examples, but adapted to event counts

## C. Acoustic Events View
Replace “Acoustic Whale Events” with a more general **Acoustic Events** page.

This page should show clusters or discrete acoustic events over time, with richer event metadata.

Include:
- event bubbles or markers across time
- event timing vs time-of-day and time-of-year
- event duration
- event count or event intensity
- event class colour coding
- hover popup with details
- click interaction to open event detail drawer/modal

Event detail popup/drawer should include:
- event class
- timestamp
- duration
- confidence
- dominant frequency band
- peak level
- preview spectrogram
- short waveform preview
- optional replay clip if available
- download/open source chunk
- related metadata

Keep the general interaction model from the examples, but adapt it to engineering sound events rather than animal calls.

## D. Event Replay / Event Detail
Create a proper event replay/detail view or modal pattern.

When the user selects an event, show:
- event metadata
- 30s / 60s / 120s preview options
- preview waveform
- preview spectrogram
- band-energy breakdown
- summary tags like:
  - likely vessel
  - likely surf-dominant
  - broadband transient
  - unknown anomaly
- chunk file reference / download option
- sensor/system context if relevant:
  - recording effort at the time
  - hydrophone gain / configuration
  - whether the segment overlaps weather or deployment changes

Important:
Do not make this a Spotify-like media player.  
It should feel like a scientific/acoustic inspection tool.

## E. Daily Soundscape / Spectral Averages
Add a page inspired by “Daily Soundscape” / “Spectral Averages”.

This should display the soundscape across a 24-hour day as a heatmap/spectrogram-like visual:
- time on x-axis
- frequency on y-axis
- colour = acoustic energy / sound pressure level / PSD proxy
- missing data shown clearly
- selectable day/month/year controls
- optional colour scale legend
- ability to browse day by day
- optional toggle for linear/log frequency axis
- optional overlay markers for notable events or gaps

This is a very important page because it visually communicates the changing coastal soundscape at a glance.

It should feel:
- scientific
- readable
- polished
- useful for interpreting vessel/wave/weather patterns
- credible for acoustic monitoring

## F. Spectral Densities
Add a page inspired by “Spectral Densities”.

This should present the statistical distribution of energy across frequency over a selected period, likely month-scale or custom period.

Include:
- frequency on x-axis
- level on y-axis
- density/probability shading
- percentile curves such as:
  - L05
  - L50
  - L95
  - Leq or equivalent average line
- legend
- downloadable figure/data
- period controls
- station metadata/header
- explanation that this is useful for instrumentation review and soundscape characterisation

This page should feel especially strong for engineering credibility.

## G. Sound Levels
Add a page inspired by “Sound Levels”.

This should show averaged sound pressure levels over time for selectable frequency bands.

Allow band selection such as:
- 10–100 Hz
- 100–1000 Hz
- 1–10 kHz
- custom band
- broadband
- optional project-specific bands relevant to coastal noise sources

Explain and visually support the idea that different bands correspond to different acoustic regimes, for example:
- low frequency = vessel / flow / swell / structural hum
- mid frequency = mixed coastal activity / machinery / some wave energy
- higher frequency = rain / spray / sharper transients / surface effects

Include:
- date range
- band selector
- metric selector
- smoothing
- hover values
- missing-data shading
- downloadable output

## H. Station Recording Effort
Add a page inspired by “Station Recording Effort”.

This should show:
- percentage of time recorded per day
- recording coverage over time
- missing periods
- outages / dropouts
- useful context for interpreting acoustic metrics

Include:
- daily recording effort plot
- tooltip
- smoothing if appropriate
- thresholds for “usable data”
- no-data handling
- clear relationship to all other acoustic pages

This page is important because it makes the rest of the hydrophone data believable.

---

# 4. EVENT CLASSIFICATION MODEL TO USE

Do not use whale species. Use a coastal acoustic classification model more suitable for my project.

Use a realistic structure like this:

## Core active acoustic classes
- Vessel passage
- Wave / Surf dominant
- Rain / Weather noise
- Port / Machinery / Anthropogenic activity
- Broadband transient
- Unknown anomaly

## Optional / future acoustic classes
- Propeller / cavitation
- Anchor / chain / mooring interaction
- Impact / collision-like transient
- Bioacoustic / natural source
- Sediment / debris motion
- Hydrophone handling / servicing artefact

Visually distinguish:
- Active classifier outputs
- Experimental classifier outputs
- Future / placeholder categories

Use labels like:
- Active
- Experimental
- Future
- Not enabled
- Manual review needed

---

# 5. SETTINGS SIDEBAR / FILTER MODEL

The SeaStats examples have a very useful right-side settings approach.  
I want that pattern adapted into my dark-mode system.

For the hydrophone pages, include a settings/filter rail that can support different controls depending on the page.

Possible controls:
- date range
- year / month / day selectors
- event class toggles
- smoothing
- band selection
- metric selection
- overlay toggles
- colour map selection
- percentile visibility
- show recording gaps
- show confidence
- show only reviewed events
- station / buoy selector if multi-buoy view exists
- export/download

The settings rail should feel:
- functional
- component-based
- reusable
- consistent across hydrophone pages
- not visually clunky

---

# 6. VISUAL / UX GOALS

Maintain the existing project’s high-quality dark technical style.

Do **not** copy the light SeaStats aesthetic literally.  
Instead, translate the **functional ideas** into my current dashboard’s dark-mode design language.

The hydrophone/acoustic section should feel:
- deep navy / slate / cyan / restrained alert accents
- scientific and premium
- readable
- not cluttered
- chart-led
- serious enough for engineering review
- good for screenshots in report/poster/slides

Use:
- strong chart framing
- clear labels
- clean acoustic terminology
- consistent legends
- sensible axes
- subtle live/updated states
- hover details
- well-structured filter/settings rail

Avoid:
- overly decorative audio-wave graphics
- generic music-player tropes
- wildlife-park branding
- neon sci-fi
- empty visual drama with no analytical value

---

# 7. WHAT I NEED YOU TO PRODUCE

Structure your response exactly like this:

## A. Design intent for the hydrophone dashboard upgrade
Explain the overall direction and how it differs from a whale-monitoring dashboard.

## B. Updated hydrophone information architecture
Define the Hydrophone section/page tree and how the pages relate to one another.

Include pages such as:
- Hydrophone Overview / Station Summary
- Daily Event Detections
- Acoustic Events
- Event Replay / Detail
- Daily Soundscape
- Spectral Densities
- Sound Levels
- Recording Effort
- Hydrophone Files / Clips if useful

## C. Page-by-page redesign guidance
For each hydrophone page, define:
- purpose
- layout
- key panels/cards
- chart type
- required controls
- interactions
- empty/no-data states
- realistic notes

## D. Component/system changes required
Define reusable Figma components and variants for:
- hydrophone summary cards
- event class chips
- acoustic event bubbles
- spectrogram cards
- sound level charts
- spectral density charts
- recording effort charts
- filter/settings rail blocks
- date controls
- band selectors
- event detail drawers/modals
- data-quality/no-data states
- recording gap overlays
- download/export actions

## E. Acoustic metric and data model structure
Define the hydrophone metric model, including:
- station summary metrics
- event detection metrics
- event cluster metrics
- soundscape metrics
- spectral density metrics
- band-level metrics
- recording effort metrics
- file/chunk linkage
- active vs experimental vs future classifiers

## F. Interaction and behaviour updates
Define:
- hover tooltip behaviour
- click-through behaviour
- event replay behaviour
- day browsing behaviour
- band selection behaviour
- smoothing behaviour
- missing-data shading behaviour
- export behaviour
- overview-to-detail drilldown logic

## G. Visual and charting rules
Define how to style:
- spectrograms
- heatmaps
- density charts
- event bubbles
- sound-level trends
- gap shading
- legends
- axes
- tooltips
- settings rail
- event-class colours

## H. Figma implementation priority
Tell me the order in which to modify the Hydrophone section in the existing file.

---

# 8. FIGMA-SPECIFIC EXPECTATIONS

Think in terms of actual Figma implementation.

Be explicit about:
- which existing Hydrophone screen should be expanded vs rebuilt
- how to use auto-layout
- how to make chart containers reusable
- how to structure acoustic pages on the App Screens page
- how to create reusable settings-rail components
- how to create event chips/tags and class colour variants
- how to structure modals/drawers for event replay
- how to keep chart styles consistent across all acoustic pages

---

# 9. OUTPUT QUALITY BAR

Your response must feel like a real senior product designer/scientific dashboard designer creating a serious Hydrophone dashboard upgrade brief for Figma.

Be:
- detailed
- structured
- decisive
- implementation-ready
- realistic
- chart-literate
- acoustics-aware
- not generic
- not shallow

Do not ask me unnecessary clarifying questions.  
Make strong assumptions.  
Use the attached SeaStats examples as **functional references only**, not literal aesthetic templates.