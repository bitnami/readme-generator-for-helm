#
# Copyright 2021-2021 VMware, Inc.
# SPDX-License-Identifier: Apache-2.0
#
FROM bitnami/node:16

LABEL org.opencontainers.image.authors="https://bitnami.com/contact" \
      org.opencontainers.image.description="Readme Generator For Helm" \
      org.opencontainers.image.source="https://github.com/bitnami-labs/readme-generator-for-helm" \
      org.opencontainers.image.title="readme-generator-for-helm" \
      org.opencontainers.image.vendor="VMware, Inc."

COPY . /app
WORKDIR /app
RUN npm install
RUN ln -s /app/bin/index.js /app/bin/readme-generator

ENV PATH="/app/bin:$PATH"

CMD ["readme-generator"]
