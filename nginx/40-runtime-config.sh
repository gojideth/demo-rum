#!/bin/sh
set -eu

envsubst '${RUM_APP_MONITOR_ID} ${AWS_REGION} ${RUM_IDENTITY_POOL_ID} ${RUM_RELEASE_ID}' \
  < /etc/nginx/config.js.template \
  > /usr/share/nginx/html/config.js
