FROM postgis/postgis:17-3.4

# Maintainer
LABEL maintainer="Volunteer Flyer Distribution System"
LABEL description="PostgreSQL 17 with PostGIS 3.4 and pgvector 0.7.4"

# Install build dependencies and pgvector
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      git \
      postgresql-server-dev-17 \
      ca-certificates && \
    # Clone and build pgvector
    cd /tmp && \
    git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make clean && \
    make OPTFLAGS="" && \
    make install && \
    # Cleanup
    cd / && \
    apt-get remove -y build-essential git postgresql-server-dev-17 && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/pgvector

# Expose PostgreSQL port
EXPOSE 5432

# Use the default postgres entrypoint from the base image
# No need to override CMD or ENTRYPOINT
