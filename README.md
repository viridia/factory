# Render Factory

A render farm and compute job scheduler built on Kubernetes and RethinkDB.

Various components:

* Director: Accepts job requests from web clients and reports on job status.
* Scheduler: Schedules individual tasks.
* Client: Web client which shows current jobs and allows submitting new jobs.
* (TBW)
