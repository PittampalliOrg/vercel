# 'frontend-proxy/Dockerfile'

FROM envoyproxy/envoy:v1.32-latest

# Install envsubst for dynamic config
RUN apt-get update && apt-get install -y gettext-base && apt-get clean && rm -rf /var/lib/apt/lists/*

USER envoy
WORKDIR /home/envoy

# Because our build context is "frontend-proxy/", 
# we can COPY the file by name (no need for ./frontend-proxy/...).
COPY envoy.tmpl.yaml ./envoy.tmpl.yaml

# Generate final config with environment variable substitution, then run Envoy
ENTRYPOINT ["/bin/sh", "-c", "envsubst < envoy.tmpl.yaml > envoy.yaml && envoy -c envoy.yaml;"]
