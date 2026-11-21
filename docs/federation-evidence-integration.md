# Source evidence integration audit and acceptance criteria

## Audit scope

This is a source-level integration audit, not a security or production-readiness
assessment. The reviewed revisions are:

| Repository | Reviewed commit | Observed boundary |
| --- | --- | --- |
| AIFT-OS | `57b482cb255b26b0fe4e81cfba7dc97caf86bf1c` | `scripts/check_federation_evidence.py` reads supplied v1 records, checks explicit expected commits, and rejects missing, stale or failed evidence. It does not fetch or authenticate artifacts. |
| AIFT-Runtime | `b437db4b8102e6f85f5f357e3e4e16dac578528e` | `scripts/run_runtime_verification.py` runs source QA and emits `aift.verification.v1` with commit identity and explicit verification gaps. Its source workflow uploads that record. |
| VPS | `60ca6db2afae9ca3eb6c8d7590dbdd6689ccece8` | `npm run qa:local` and the additional Local QA regressions return process results, but do not emit the record already understood by AIFT-OS. |

The OS readiness scanner also derives some readiness labels from declarations
and file presence (`internal/readiness/readiness.go`). Its README distinguishes
those declarations from executed verification. Runtime health/model startup and
the VPS runtime contract cover larger operational surfaces; source checks alone
cannot establish them. Expanding scheduling or deployment now would require more
interfaces and operational evidence than this integration needs.

## Smallest useful integration

Add a VPS producer for the existing v1 evidence contract, then pass its real
output and the existing Runtime producer's output to the unchanged AIFT-OS
consumer. This gives the control plane a common source-check result for both
repositories without adding a service, credentials, deployment, or a new schema.

The implementation belongs in VPS. The other two repositories retain ownership
of their existing producer/consumer interfaces. The integration workflow pins
both external source revisions; updating those pins requires rerunning the test.

## Acceptance criteria

1. `python3 -B scripts/run_source_verification.py --output /tmp/aift-vps-verification.json`
   runs the local source gate, node-refresh, blue/green and heartbeat regressions,
   plus the producer's regression tests. No check uses `--if-present`.
2. The record identifies `AIFreedomTrustFederation/VPS`, the checkout's actual
   full commit SHA, a UTC timestamp, each attempted command and its exit code.
3. A failed, missing or timed-out command produces failed evidence and a nonzero
   exit. Later checks still run. An initially dirty checkout, a newly dirty
   checkout, or a changed HEAD cannot produce a passing record.
4. Output resolves outside the checkout, including through symlinks. Invalid
   checkout or CI identity fails before QA; early preflight failures may leave
   no artifact. Workflow output paths must start fresh.
5. Security and dependencies remain `not_checked`, deployment remains
   `not_applicable`, and the limitations explain the source-only scope.
6. The actual AIFT-OS consumer accepts passing VPS and Runtime records for their
   expected revisions as `partial`, retaining unsigned provenance and unchecked
   gates. Missing, stale and consistently failed records return failure.
7. CI uses Node.js 22 and Python 3.13, checks all three checkouts remain clean,
   and attempts to upload the producer records even if a verification step fails.

## How to run

From a clean VPS checkout with Git, Bash, Node.js 22, npm and Python 3.13:

```sh
python3.13 -B tests/test-source-verification.py
python3.13 -B scripts/run_source_verification.py --output /tmp/aift-vps-verification.json
```

The runner needs no Python packages and performs no dependency installation.
The existing Node/socket regressions require permission to create local sockets.
It can execute checked-in source tests; inspect the revision before running it.

For the complete integration, use `.github/workflows/federation-evidence.yml`.
It checks out the pinned OS and Runtime revisions next to VPS, runs both real
producers, and invokes `tests/check-federation-evidence.py` with independently
read Git HEADs. Runtime evidence is marked `local` because its checks execute in
the VPS workflow, rather than falsely linking to a Runtime workflow run.

The existing Local QA workflow remains separate. A green source integration is
not a dashboard build, a live runtime API test, authenticated CI provenance, or
permission to deploy. No production operation is introduced by this change.
