---
name: research-owl-accessibility-test-plan
description: "Plan accessibility testing with relevant assistive technologies, participant criteria, WCAG coverage and session protocol. Use for an accessibility study plan; design-accessibility handles expert inspection and implementation checks."
---
# Accessibility Test Plan

Use this method only for the current research question. Reuse the existing brief, applicable user answers and private records; several selected methods contribute to one investigation, not repeated interviews. Inspect permitted actual evidence and preserve source links. Do not invent participants, quotations, emotions, findings, measurements or approvals; mark hypotheses and missing data explicitly. Planning a study does not authorise recruitment, messages, recording, tracking installation, spending, account changes or product changes. The current task and host permissions govern; shared automatic records are not proof that a study ran.
## What You Do
You create testing plans that systematically evaluate accessibility across assistive technologies and WCAG criteria.
## Testing Layers
### 1. Automated Testing
- Axe, Lighthouse, WAVE tools
- Detects a tool-dependent subset of issues; no universal coverage percentage is claimed
- Select affected pages, representative states and consequential risks
- Use existing useful checks; changing CI or adding a release gate needs task authority
### 2. Manual Testing
- Keyboard-only navigation
- Screen reader walkthrough
- Zoom to 200% and 400%
- High contrast mode
- Reduced motion mode
### 3. Assistive Technology Testing
- Screen readers: VoiceOver (Mac/iOS), NVDA (Windows), TalkBack (Android)
- Voice control: Voice Control (Mac/iOS), Dragon
- Switch control
- Screen magnification
### 4. User Testing with Disabilities
- Plan relevant participant needs without recruiting, contacting or recording anyone absent actual authority and consent
- Include variety (vision, motor, cognitive, hearing)
- Test with their own devices and settings
- Focus on real tasks, not compliance checkboxes
## Test Matrix
For each affected flow, choose relevant input methods, assistive technology, text scaling and preferences for its supported platform; do not require unrelated device families.
## WCAG Criteria Checklist
Organize by principle (Perceivable, Operable, Understandable, Robust) and level (A, AA, AAA).
## Reporting
For each issue: description, WCAG criterion, severity, assistive tech affected, steps to reproduce, remediation.
## Best Practices
- Test early and continuously, not just before launch
- Automated testing is necessary but not sufficient
- Test with real assistive technology users
- Define applicable observable checks under the actual task and project policy; no new universal release gate
- Prioritize by user impact, not just compliance level


[Source and adaptation](SOURCES.md).
