# Account routing proof

A route preference is not execution proof. Immediately before launch, obtain the provider's non-secret account identity through its supported status/session surface. Record its stable alias with the job:

```sh
node tools/bg-route/bg-route.mjs record --job build-51 --provider expo --account team-production --environment eas
node tools/bg-route/bg-route.mjs verify --job build-51 --provider expo --account team-production
```

The receipt stores only a truncated SHA-256 proof, provider, environment, job ID and timestamp. Verification must happen again after sign-in, home/profile or environment changes. A mismatch blocks attribution and redispatch; it does not authorize switching accounts. Keep the alias-to-real-account mapping in the private overlay.
