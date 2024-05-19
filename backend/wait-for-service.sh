#!/bin/bash

set -e

host="$1"
port="$2"
shift
cmd="$@"

until nc -z $host $port; do
  >&2 echo "$host:$port is unavailable - sleeping"
  sleep 2
done

>&2 echo "$host:$port is up - executing command"
exec $cmd