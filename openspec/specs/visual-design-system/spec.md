# visual-design-system Specification

## Purpose
Keeps the app's RTL visual design in 1:1 sync with the sister Laravel/Filament app BMS-CM, so every UI-bearing capability shares one non-functional visual contract instead of re-deriving styling per feature.

## Requirements

### Requirement: RTL-first layout
The system SHALL render the entire application in right-to-left (RTL) layout, consistent with its Persian-language UI.

#### Scenario: Rendering any page
- **WHEN** any page in the application is rendered
- **THEN** the layout direction is RTL, not LTR

### Requirement: Design tokens sourced from BMS-CM, never invented
The system SHALL derive every color, radius, and shadow token from BMS-CM's real CSS (`D:\DEV-ENV\BMS-CM`); no visual token SHALL be invented independently of that source.

#### Scenario: Adding a new UI element requiring a color or radius
- **WHEN** a developer needs a new color or border-radius value for a UI element
- **THEN** the value is ported from BMS-CM's existing CSS rather than chosen arbitrarily

### Requirement: Consistent card, icon, and modal conventions
The system SHALL apply consistent card-tier styling, an icon-to-verb mapping, and a shared modal component contract (`Modal.jsx`) across all features, rather than each feature defining its own variant.

#### Scenario: A new feature adds a modal dialog
- **WHEN** a new feature needs a modal dialog
- **THEN** it reuses the shared `Modal.jsx` component contract rather than building a bespoke dialog
