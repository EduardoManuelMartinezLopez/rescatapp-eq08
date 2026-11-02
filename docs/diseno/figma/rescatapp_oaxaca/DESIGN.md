---
name: RescatApp Oaxaca
colors:
  surface: '#f7f9ff'
  surface-dim: '#c9dcf3'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#d9eaff'
  surface-container-highest: '#d1e4fb'
  on-surface: '#091d2e'
  on-surface-variant: '#3d4a3e'
  inverse-surface: '#203243'
  inverse-on-surface: '#e8f2ff'
  outline: '#6c7b6d'
  outline-variant: '#bbcbbb'
  surface-tint: '#006d37'
  primary: '#006d37'
  on-primary: '#ffffff'
  primary-container: '#2ecc71'
  on-primary-container: '#005027'
  inverse-primary: '#4ae183'
  secondary: '#944a00'
  on-secondary: '#ffffff'
  secondary-container: '#fc8f34'
  on-secondary-container: '#663100'
  tertiary: '#b4271d'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff9687'
  on-tertiary-container: '#8e0505'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bfe9c'
  primary-fixed-dim: '#4ae183'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#ffb783'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#713700'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a9'
  on-tertiary-fixed: '#410000'
  on-tertiary-fixed-variant: '#910807'
  background: '#f7f9ff'
  on-background: '#091d2e'
  surface-variant: '#d1e4fb'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for a hyper-local, community-driven non-profit food rescue mobile web app operating in Oaxaca de Juárez, Mexico. The brand embodies trust, human warmth, civic urgency, and radical accessibility. It serves two distinct audiences: local food donors (panaderías, comedores, tortillerías, mercados tradicionales) and community members or food rescue volunteers retrieving surplus food.

### Aesthetic Movement & Philosophy
The aesthetic follows **Tactile Minimalism with High-Contrast Utility**. The interface strips away commercial clutter—there are strictly zero transactional mechanics, monetary displays, or photo upload bottlenecks. Instead, it relies on crisp, high-visibility visual cues, immediate physical legibility under intense Oaxacan sunlight, and reassuring tactile feedback. The UI projects the warmth of a community bulletin board combined with the speed and reliability of civil emergency infrastructure.

### Copywriting Standard
All interface labels, microcopy, dialogues, and system states strictly use Mexican Spanish (`es-MX`) with authentic, respectful, and direct terminology (e.g., *Apartar*, *Publicar*, *Recogida*, *Donativo comunitario*, *Ubicación del rescate*).

## Colors

The palette balances positive social impact with clear, unmistakable temporal urgency.

### Core Swatches
- **Primary Green (`#2ECC71`)**: Represents life, positive harvest, and successful handoff. Used strictly for constructive confirmations and progress actions: *Publicar*, *Confirmar*, *Aprobar*.
- **Alert Orange (`#E67E22`)**: Denotes critical preservation windows, impending expiration thresholds, warnings, and the primary reservation action: *Apartar*.
- **Dark Slate (`#2C3E50`)**: Provides deep structural contrast for primary text, major titles, iconography, and navigation landmarks.
- **Canvas Neutral (`#F7F9FA`)**: Cool off-white background preventing glare while maintaining high baseline contrast.
- **Card Background (`#FFFFFF`)**: Pure white tactile surfaces for discrete donor packages and distribution logs.
- **Alert Red (`#E74C3C`)**: Reserved exclusively for terminal states (*Expirada*) and critical cancellation alerts.

### Status Surface Tints
Status chips and contextual banners utilize translucent tints paired with deep contrast foregrounds for WCAG 2.1 AA compliance:
- **Publicada**: Surface `rgba(46, 204, 113, 0.12)`, Border `rgba(46, 204, 113, 0.35)`, Text `#1E8449`
- **Reservada**: Surface `rgba(230, 126, 34, 0.12)`, Border `rgba(230, 126, 34, 0.35)`, Text `#A04000`
- **Recogida**: Surface `rgba(44, 62, 80, 0.08)`, Border `rgba(44, 62, 80, 0.25)`, Text `#2C3E50`
- **Expirada**: Surface `rgba(231, 76, 60, 0.12)`, Border `rgba(231, 76, 60, 0.35)`, Text `#922B21`

## Typography

The design system exclusively employs **Inter** across all typographic hierarchies to ensure uncompromising legibility on varied mobile viewports under field conditions. 

- Headings use heavier weights (`700`, `800`) to anchor scanning eyes immediately to location names, donor addresses, and expiry windows.
- Body text retains generous line heights (`1.45` to `1.5`) and strict dark slate contrast (`#2C3E50`) against white cards and light canvas surfaces to ensure WCAG 2.1 AA (4.5:1+) readability for senior donors and volunteers.
- Micro-labels and chip indicators use bold weights (`600`, `700`) with modest positive tracking to prevent letter blur on lower-end mobile displays.

## Layout & Spacing

The layout is built for **mobile-first, single-column web execution** with a strictly enforced maximum content containment width of 480px on desktop screens to preserve ergonomic single-thumb interaction.

### Layout Mechanics
- **Canvas Margins**: Fixed `1rem` (16px) on mobile viewports; centers on wider viewports with a 480px boundary.
- **Rhythm**: All paddings and container bounds strictly map to an 8px base rhythm (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 32px).
- **Sticky Actions**: Critical interaction bars (e.g., sticky action footer for *Apartar* or *Confirmar Recogida*) stick to the viewport base with safe-area padding for mobile operating system docks.

## Elevation & Depth

Visual hierarchy uses **tactile ambient shadows** paired with distinct surface separation:

- **Level 0 (Canvas Base)**: `#F7F9FA`, totally flat.
- **Level 1 (Listing Cards & Form Sheets)**: Pure `#FFFFFF` with a soft ambient drop shadow: `box-shadow: 0 4px 16px -2px rgba(44, 62, 80, 0.08), 0 1px 3px 0 rgba(44, 62, 80, 0.04);`.
- **Level 2 (Modals, Confirmation Sheets & Bottom Drawers)**: Pure `#FFFFFF` elevated with high diffusion: `box-shadow: 0 10px 30px -4px rgba(44, 62, 80, 0.16);`.
- **Sticky Navigation & Floating Trigger Bar**: Grounded with an upward ambient rim shadow: `box-shadow: 0 -4px 12px rgba(44, 62, 80, 0.06);`.

## Shapes

The interface embraces a human, welcoming geometry. Cards feature a specified `12px` (`0.75rem`) border radius, while interactive buttons, status chips, and form controls leverage harmonized rounded boundaries.

- **Listing Cards**: Exactly `12px` border radius (`rounded-lg` equivalent).
- **Interactive Buttons**: `8px` (`0.5rem`) for crisp button tactility.
- **Status Chips & Pills**: Fully rounded pill shapes (`9999px`) to immediately distinguish informative badges from actionable cards.
- **Form Text Inputs**: `8px` (`0.5rem`) with 1.5px solid borders.

## Components

### Buttons
All buttons maintain a strict minimum height of `48px` to guarantee physical accessibility on touch screens.
- **Primary Affirmative Button (*Publicar*, *Confirmar*, *Aprobar*)**:
  - Background: `#2ECC71`
  - Text: `#FFFFFF`, weight 700
  - Hover/Active: `#27AE60`
  - Min-height: `52px`, horizontal padding: `24px`
- **Critical Action Button (*Apartar*)**:
  - Background: `#E67E22`
  - Text: `#FFFFFF`, weight 700
  - Hover/Active: `#D35400`
  - Min-height: `52px`, horizontal padding: `24px`
- **Secondary Neutral Button**:
  - Background: `transparent`
  - Border: `2px solid #2C3E50`
  - Text: `#2C3E50`, weight 600

### Status Chips
Compact pill badges (`height: 28px`, `padding: 4px 12px`, radius: `9999px`) indicating current rescue lifecycle states:
- **Publicada**: Tinted `#2ECC71` background, `#1E8449` text.
- **Reservada**: Tinted `#E67E22` background, `#A04000` text.
- **Recogida**: Tinted `#2C3E50` background, `#2C3E50` text.
- **Expirada**: Tinted `#E74C3C` background, `#922B21` text.

### Food Rescue Cards
- **Container**: White background, `12px` border radius, Level 1 ambient shadow, `16px` internal padding.
- **Header**: Neighborhood / Mercado tag (e.g., *Centro Histórico, Oaxaca* or *Jalatlaco*), paired with time of publishing.
- **Body**: Food title (e.g., *20 Tlayudas de maíz amarillo*, *Canasta de pan dulce*), quantity, and pickup window.
- **Expiry Urgency Tag**: Styled with `#E67E22` text and subtle clock icon indicating hours left to collect.
- **Footer**: Integrated single-tap action button (*Apartar* or *Ver detalles*).

### Input Fields & Selectors
- **Rules**: Zero file upload elements, zero currency symbols, and zero payment methods.
- **Inputs**: Min-height `50px`, padding `12px 16px`, border `1.5px solid rgba(44, 62, 80, 0.2)`, background `#FFFFFF`, text `#2C3E50`.
- **Focus State**: Border color `#2ECC71` with `0 0 0 3px rgba(46, 204, 113, 0.25)`.
- **Checkboxes & Radios**: Minimum touch wrapper `48x48px`, active fill `#2ECC71`.

### Neighborhood Filter Chips
Scrollable horizontal chip container for rapid filtering by municipal zone: *Centro*, *Reforma*, *Jalatlaco*, *Xochimilco*, *Candiani*, *San Martín*.