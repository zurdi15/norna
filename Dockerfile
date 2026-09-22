# syntax=docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

# This image only packages a binary built beforehand:
#
#   cd frontend && pnpm build          # the binary embeds frontend/dist
#   go tool mage build:static          # → dist/norna-linux-<arch>
#   docker build .
#
# Compiling outside Docker keeps Go's build cache between runs, which is most of the
# difference between a one-minute image and a ten-minute one. The release workflow
# builds each architecture on a runner of that architecture, so nothing cross-compiles.

# An empty image has no directories to write to and no CA certificates. Neither
# depends on the target architecture, so this stage runs on the build platform.
FROM --platform=$BUILDPLATFORM alpine:3.22@sha256:5291449c3df73caf6ed85e649dec1b9e818b39a5d8c871e97afc13e9cd5e8fa8 AS rootfs

RUN mkdir -p /tmp && chmod 1777 /tmp && mkdir -p /data/files

#  ┬─┐┬ ┐┌┐┐┌┐┐┬─┐┬─┐
#  │┬┘│ │││││││├─ │┬┘
#  ┘└┘┘─┘┘└┘┘└┘┴─┘┘└┘

# The actual image
FROM scratch

LABEL org.opencontainers.image.url='https://github.com/zurdi15/norna'
LABEL org.opencontainers.image.documentation='https://github.com/zurdi15/norna#readme'
LABEL org.opencontainers.image.source='https://github.com/zurdi15/norna'
LABEL org.opencontainers.image.licenses='AGPL-3.0-or-later'
LABEL org.opencontainers.image.title='Norna'
LABEL org.opencontainers.image.description='Tasks and projects, woven together.'

WORKDIR /app/norna
ENTRYPOINT [ "/app/norna/norna" ]
EXPOSE 3456

COPY --from=rootfs --chown=1000:1000 --chmod=1777 /tmp /tmp
# Owned by the app's user, so a new named volume starts writable.
COPY --from=rootfs --chown=1000:1000 /data /data

USER 1000

ENV NORNA_SERVICE_ROOTPATH=/app/norna/
# Everything worth keeping lives in /data: the sqlite database and the uploaded files.
ENV NORNA_DATABASE_PATH=/data/norna.db
ENV NORNA_FILES_BASEPATH=/data/files

ARG TARGETOS TARGETARCH
COPY dist/norna-${TARGETOS}-${TARGETARCH} norna
COPY --from=rootfs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
