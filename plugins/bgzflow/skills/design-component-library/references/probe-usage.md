# Optional browser probes

These are isolated, task-invoked test tools, not host hooks or release gates. They use an existing Playwright package from the skill environment or current project's dependencies and launch a fresh isolated browser. They do not use an existing signed-in profile, install a browser or add permissions. Node 22 or later is required. If tooling is missing, report the gap and use available authorised checks; setup needs its own existing authority.

Invoke from the authorised project's working directory, using an absolute script path when needed:

```text
node <skill>/scripts/verify-focus-trap.mjs http://localhost:<port>/<test-page> --open=<trigger-selector> --dialog=<dialog-selector>
node <skill>/scripts/verify-rtl.mjs <owned-fixture.html>
```

One explicit HTTP(S) test URL or existing HTML file is required. Use the actual already authorised test instance and reconcile that it is the intended version. Do not put credentials or private tokens in URLs. Remote access and any test effects still require the task's existing permission; a URL being accepted by the script grants none. The focus probe clicks the selected opener, traverses Tab and presses Escape; do not target a control with a financial, publishing or destructive effect. `--dark` in the focus probe applies the upstream `data-theme="dark"` convention only where that matches a supported mode; it does not introduce a theme.

The focus probe checks a visible dialog's role/modal/name markers, Tab containment, Escape close and return to the original trigger. It is not a full accessible-name algorithm or screen-reader check, and does not inspect the results of arbitrary dialog form submissions. Its default desktop viewport is 1100 by 800. The RTL probe compares horizontal overflow before and after setting `dir="rtl"` at 1280 by 900, with animation disabled. It detects additional overflow, not translation quality, correct icon mirroring, reading order, truncation, native layout or general RTL conformance. A page initially RTL should use an appropriate LTR fixture for this comparison.

Exit status 0 means the specific observation completed with no detected defect; 1 means a detected defect; 2 means missing tooling, invalid target or an interrupted observation. Preserve that distinction in the existing evidence route. Neither an unavailable result nor a successful narrow probe establishes the whole user outcome. No browser probe has been executed as part of the initial source import; browser behaviour remains unverified until an authorised actual run.
