# Brief — a dispatch tool for a field-service company

Human-authored input to the recorded run (`portal/record-build.mjs`). It is not agent output, and
it deliberately contains no board: it states the problem, never the answer.

## Who it is for

The one person at a 40-technician field-service company who decides, every morning and then all day
long, which technician goes to which job. They are not a manager and not an admin — dispatching is
their whole job, and they do it under time pressure with the phone ringing.

## The job it does

Keep today's committed work covered. A job that will be missed has to become visible before the
customer is the one who notices.

## What that person must be able to do

- See where today stands well enough to know whether they need to act at all.
- Work through the jobs that are at risk, one at a time, rather than scanning everything.
- Move a job to a different technician, and see that the move actually took.

## Out of scope

No customer-facing communication. This tool does not send anything to a customer; telling the
customer is a phone call the dispatcher makes, and building that in would double the appetite.
