#!/bin/bash
kubectl apply -f ./config/rethinkdb-quickstart.yml
POD_RETHINKDB=$(kubectl get pods -l role=replica,db=rethinkdb \
    -o template --template '{{range .items}}{{.metadata.name}} {{.status.phase}}{{"\n"}}{{end}}' \
    | grep Running | head -1 | cut -f1 -d' ')
echo "RethinkDB pod name is:" ${POD_RETHINKDB}
POD_REGISTRY=$(kubectl get pods --namespace kube-system -l k8s-app=kube-registry \
    -o template --template '{{range .items}}{{.metadata.name}} {{.status.phase}}{{"\n"}}{{end}}' \
    | grep Running | head -1 | cut -f1 -d' ')
    echo "Registry pod name is:" ${POD_REGISTRY}

# kubectl port-forward rethinkdb-replica-1481724718-19hr7 8090:8080 8091:29015 8092:28015 > /dev/null
