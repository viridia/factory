#!/bin/bash
# Locates the address of the rethinkdb database when running a local cluster.
RETHINKDB_HOST=$(minikube service rethinkdb-proxy --url --format "{{.IP}}:{{.Port}}") yarn start
