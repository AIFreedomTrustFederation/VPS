# Disposable stand-in for the production VPS used ONLY by dashboard-deploy-acceptance.sh.
# Ubuntu + root login over a real sshd, with the tools the deploy script needs.
# The Docker CLI talks to the host daemon through the mounted socket.
FROM ubuntu:24.04
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      openssh-server git curl python3 ca-certificates util-linux docker.io docker-buildx docker-compose-v2 \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd /root/.ssh \
 && chmod 700 /root/.ssh \
 && git config --system --add safe.directory /srv/origin.git
