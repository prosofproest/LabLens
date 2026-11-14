# LabLens AI — Design System

**Document:** `design.md`  
**Project:** LabLens AI — Smart Laboratory Fault Reporting and Equipment Intelligence Platform  
**Design Direction:** Minimal, premium, Apple-inspired academic technology interface  
**Status:** Design specification for Phase 1

---

## 1. Design Philosophy

LabLens AI should feel like a polished, modern technology product rather than a generic college management dashboard.

The interface should communicate:

- Clarity and simplicity
- Trust and reliability
- Professionalism
- Efficient fault reporting
- Easy navigation
- Intelligent technology without unnecessary visual complexity

Take inspiration from Apple's design philosophy: precise typography, generous whitespace, restrained colors, subtle depth, and carefully designed interactions.

**Important:** Create an original LabLens AI identity. Do not copy Apple's website, logos, product layouts, proprietary graphics, or branding.

---

## 2. Color System

### Primary colors

| Purpose | Color | Hex |
|---|---|---|
| Primary accent | Blue | `#0071E3` |
| Primary text | Deep charcoal | `#1D1D1F` |
| Secondary text | Grey | `#656565` |
| Muted text | Light grey | `#86868B` |
| Main background | Soft neutral | `#F5F5F7` |
| Surface | White | `#FFFFFF` |
| Borders | Subtle grey | `#E5E5EA` |

### Semantic colors

Use semantic colors only when communicating a meaningful state.

| Purpose | Color |
|---|---|
| Success / Resolved | `#248A3D` |
| Warning / Medium priority | `#D97706` |
| Critical / High priority | `#DC2626` |
| Informational | `#0071E3` |
| Neutral / Pending | `#6B7280` |

Do not use bright colors excessively. Maintain a calm, professional appearance.

---

## 3. Typography

Use a clean system font stack.

Preferred:
- Inter, when available
- System UI / native system fonts as fallback

Typography guidelines:

- Large, bold headings with tight letter spacing.
- Clear section headings.
- Comfortable body text line-height.
- Muted colors for supporting information.
- Avoid excessive font weights and sizes.

Suggested hierarchy:

| Element | Suggested size |
|---|---|
| Hero heading | 48–64px desktop |
| Page heading | 32–40px |
| Section heading | 24–28px |
| Card heading | 18–20px |
| Body text | 15–16px |
| Supporting text | 13–14px |

On mobile, reduce heading sizes proportionally while maintaining readability.

---

## 4. Layout and Spacing

Use a consistent spacing system based on multiples of 4px.

Guidelines:

- Keep layouts spacious and uncluttered.
- Use clear visual grouping.
- Maintain consistent horizontal alignment.
- Avoid unnecessarily dense dashboards.
- Use a centered maximum-width content container where appropriate.
- Ensure forms are easy to scan and complete.

Use responsive layouts rather than fixed-width designs.

---

## 5. Surfaces and Components

### Cards

- White backgrounds.
- Rounded corners: approximately 16–20px.
- Thin, subtle borders.
- Very soft shadows.
- Comfortable internal padding.
- Avoid heavy outlines and excessive shadows.

### Buttons

Primary buttons:
- Blue background (`#0071E3`).
- White text.
- Rounded pill or softly rounded corners.
- Clear hover, focus, active, and disabled states.

Secondary buttons:
- White or transparent background.
- Subtle border.
- Dark text.

Destructive actions:
- Use red carefully.
- Provide clear confirmation for important destructive actions.

### Inputs and forms

- Clean white input surfaces.
- Subtle neutral borders.
- Consistent corner radius.
- Visible labels.
- Clear focus states using the primary blue.
- Helpful validation and error messages.

### Badges

Use compact rounded badges for:
- Report status
- Priority
- Equipment category

Badges must remain readable and should not dominate the interface.

---

## 6. LabLens AI Visual Identity

The product should have its own recognizable identity.

**Product name:** LabLens AI

**Product description:** Smart Laboratory Fault Reporting and Equipment Intelligence Platform.

**Brand personality:**
- Intelligent
- Reliable
- Academic
- Modern
- Professional

Use a simple, original text-based logo or a minimal custom icon if needed.

Do not use the Apple logo or any unrelated company branding.

---

## 7. Landing Page Design

The landing page should introduce LabLens AI clearly and guide users toward reporting or tracking laboratory faults.

Recommended sections:

1. **Navigation**
   - LabLens AI identity.
   - Simple navigation links.
   - Sign in and Get Started actions.

2. **Hero**
   - Clear headline explaining the platform.
   - Short supporting description.
   - Primary call to action: Report a Fault.
   - Secondary action: Explore Platform.
   - Original product-related visual or interface preview.

3. **Platform Overview**
   - Explain centralized fault reporting.
   - Highlight AI-assisted classification.
   - Explain maintenance tracking.

4. **How It Works**
   - Report an issue.
   - AI assists with classification.
   - Admin reviews and assigns.
   - Track resolution.

5. **Feature Highlights**
   - Smart fault reporting.
   - AI-assisted analysis.
   - Equipment tracking.
   - Maintenance status visibility.

6. **Final Call to Action**
   - Encourage users to access the platform.

Keep the landing page purposeful. Avoid unnecessary marketing sections or exaggerated claims.

---

## 8. Application Dashboard Design

The authenticated application should use a clean, functional layout.

### User dashboard

Display:
- Welcome message.
- Report Fault action.
- Total reports.
- Pending reports.
- In-progress reports.
- Resolved reports.
- Recent submissions.
- Report status tracking.

Users should only see their own reports.

### Admin dashboard

Display:
- Total reported faults.
- Pending reports.
- In-review reports.
- In-progress reports.
- Resolved reports.
- Recent reports.
- Priority distribution.
- Report management actions.

Admin screens should prioritize operational clarity over decorative visuals.

### Report details

Each report should clearly show:
- Equipment name.
- Asset ID.
- Laboratory name.
- Fault description.
- Uploaded image, if available.
- AI-generated suggestions.
- Priority.
- Current status.
- Assigned technician, if applicable.
- Admin notes.
- Submission date.

Clearly label AI-generated information as suggestions, not confirmed technical diagnoses.

---

## 9. Status and Priority Visual Language

### Report statuses

Use consistent status labels:

- Reported
- In-Review
- Assigned
- In-Progress
- Resolved
- Cancelled

Each status should have a distinguishable but restrained badge style.

### Priority levels

- Low
- Medium
- High
- Critical

Use semantic colors consistently. Critical priority should be visually noticeable without making the entire interface alarming.

---

## 10. Interaction and Motion

Animations should be subtle and purposeful.

Allowed:
- Smooth hover transitions.
- Small button interaction feedback.
- Gentle card hover elevation.
- Subtle page transitions where appropriate.
- Loading indicators.
- Clear success and error feedback.

Avoid:
- Excessive animations.
- Large distracting transitions.
- Constant moving backgrounds.
- Unnecessary parallax.
- Decorative effects that reduce usability.

Respect reduced-motion accessibility preferences.

---

## 11. Responsive Design

The application must work properly across:

| Device | Viewport |
|---|---:|
| Small mobile | 360px |
| Mobile | 390px |
| Large mobile | 430px |
| Tablet | 768px |
| Laptop | 1024px |
| Desktop | 1440px |
| Large desktop | 1920px |

Requirements:

- No horizontal overflow.
- Navigation must adapt to smaller screens.
- Cards should stack naturally on mobile.
- Forms must remain usable on touch screens.
- Tables should adapt using responsive layouts or controlled horizontal scrolling.
- Text must remain readable.
- Buttons must have comfortable touch targets.
- Maintain consistent spacing across breakpoints.

---

## 12. Accessibility

Follow practical accessibility standards:

- Maintain sufficient text/background contrast.
- Use semantic HTML elements.
- Provide labels for all form inputs.
- Ensure keyboard navigation works.
- Provide visible keyboard focus states.
- Do not communicate status through color alone.
- Add meaningful alternative text to informative images.
- Ensure interactive controls have accessible names.

---

## 13. Design Consistency Rules

1. Use the same colors and typography throughout the application.
2. Reuse components instead of creating visually different versions of the same element.
3. Keep corner radii, spacing, and shadows consistent.
4. Avoid excessive gradients.
5. Avoid unnecessary glassmorphism.
6. Avoid emoji-based interface icons.
7. Prefer a consistent icon library such as Lucide.
8. Use real product-related visuals only when they improve understanding.
9. Do not introduce visual elements that conflict with the product's academic and professional purpose.
10. Do not sacrifice usability for appearance.

---

## 14. Technical Design Constraints

- Use the existing approved stack: Next.js App Router, TypeScript, and Tailwind CSS.
- Keep UI components reusable and maintainable.
- Use responsive utility classes.
- Keep design tokens centralized where practical.
- Do not introduce additional UI frameworks without approval.
- Do not add unnecessary dependencies.
- Maintain compatibility with the approved Firebase and application architecture.

---

## 15. Final Design Acceptance Criteria

The design is acceptable only when:

- The interface looks like a cohesive, original product.
- The visual hierarchy is clear.
- The design is consistent across pages.
- All major components have consistent styling.
- The interface works at all specified viewport sizes.
- No horizontal overflow or overlapping elements exist.
- Forms and navigation are easy to use.
- Accessibility basics are respected.
- The dashboard feels professional and information is easy to understand.
- The design does not copy Apple's branding or website.

**Final direction:** Build LabLens AI as a minimal, premium, trustworthy academic technology platform. Every visual element must serve clarity, usability, or product identity.