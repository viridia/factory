#!/bin/bash
RETHINKDB_HOST=$(minikube service rethinkdb-proxy --url --format "{{.IP}}:{{.Port}}") yarn start
