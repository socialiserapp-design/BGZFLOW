# Simple implementation

Apply Ponytail's useful principle: the smallest complete solution. Understand the requested result and affected callers, then look for existing project code, standard library or platform features, and suitable maintained packages before writing custom machinery. This is a quick engineering choice, not a compulsory research project for every edit.

Choose the least complex option that meets the full outcome, including accessibility, security, reliability and maintenance. Native UI is appropriate only when it meets the design and interaction needs. A dependency is appropriate when it provides needed capability more reliably than custom code; a tiny well-tested local function can also be correct.

Fix shared causes rather than scattering symptom patches. Avoid speculative abstractions and unrequested features. Reuse unchanged evidence; test the changed behaviour and meaningful failure paths. Do not shorten code by obscuring intent or remove verification to save tokens. Do not override the user's architecture or product decisions under the name of efficiency.
