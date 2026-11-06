# Select a test tool by the thing being checked

Reuse an installed project runner when it already fits. Installing this skill does
not install these tools or authorise calls to a paid judging model.

- **Node test, pytest and the project's own runner:** exact outcomes, failures,
  permissions, data transformations and recovery. Keep the expected value
  independent of the implementation.
- **Playwright:** real web journeys, accessibility-aware selectors, network and
  trace evidence. Use a real target account/environment within authority and
  inspect durable effects. https://playwright.dev/docs/trace-viewer
- **Native device automation:** use the host's installed device tool and project
  testing skill. A browser screenshot is not evidence of a native mobile journey.
- **fast-check / Hypothesis:** broad input rules with shrinking to a small failing
  example. Use the property-based-testing skill for fitting problems.
- **Stryker / mutmut / mewt:** check whether tests detect altered behaviour. Select
  the supported tool for the language; the bundled mutation-testing skill's detailed
  commands concern mewt/muton and are not interchangeable with other runners.
- **Promptfoo:** provider comparisons, multi-turn and traced-agent evaluations,
  executable assertions and separate model judgments. Use trace assertions for
  action order/arguments and direct effect read-back for success. A recorded call
  does not establish that its result was correct or used.
  https://www.promptfoo.dev/docs/tracing/
  https://www.promptfoo.dev/docs/configuration/expected-outputs/
- **Inspect AI:** an alternative when a research evaluation needs managed tasks,
  sandboxes, agent bridges and custom scorers. Do not add it alongside a working
  runner without a concrete need. https://inspect.aisi.org.uk/
- **DeepEval:** an alternative when already integrated with a traced Python agent.
  TaskCompletion assesses trace/goal alignment, including supported Jev modes. It
  is a judgment over supplied evidence, not an independent probe of the live world.
  https://deepeval.com/docs/metrics-task-completion

Keep execution and grading separate. A builder must not replace the expected answer
or hide its failed attempts. Use trusted runners to collect observable results and
keep failures. Compare quality, elapsed time, usage and regression rate separately;
a single blended score can conceal a serious failure.
