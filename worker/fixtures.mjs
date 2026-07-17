// worker/fixtures.mjs — static import manifest for the mock API (epic #1, ticket #4).
// The Worker bundles the SAME committed files the static fallback serves
// (scenarios/*/fixtures/*.json) — one source, no copy drift.
// Adding a scenario = add its imports here + a scenarios/index.json entry — data
// registration, not engine logic; the Worker's routes (api.mjs) never change.
// If fixtures ever outgrow the bundle (1 MiB gzipped), switch to a Workers
// static-assets binding (rejected for now: extra platform concept, zero benefit at this size).

import verdantPlants from "../scenarios/verdant/fixtures/plants.json" with { type: "json" };
import verdantCareTasks from "../scenarios/verdant/fixtures/care-tasks.json" with { type: "json" };
import fieldworkJobs from "../scenarios/fieldwork/fixtures/jobs.json" with { type: "json" };
import fieldworkTechnicians from "../scenarios/fieldwork/fixtures/technicians.json" with { type: "json" };
import fieldworkSchedule from "../scenarios/fieldwork/fixtures/schedule.json" with { type: "json" };

export const FIXTURES = {
  verdant: {
    plants: verdantPlants,
    "care-tasks": verdantCareTasks,
  },
  fieldwork: {
    jobs: fieldworkJobs,
    technicians: fieldworkTechnicians,
    schedule: fieldworkSchedule,
  },
};
