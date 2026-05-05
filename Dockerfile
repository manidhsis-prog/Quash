FROM debian:bookworm-slim AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY cpp_backend/server.cpp cpp_backend/server.cpp
COPY cpp_backend/third_party cpp_backend/third_party

RUN g++ -std=c++17 -O2 -Wall -Wextra \
    -Icpp_backend/third_party cpp_backend/server.cpp \
    -o /quash_server -lssl -lcrypto -pthread

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home quash

WORKDIR /app
COPY --from=build /quash_server /app/quash_server
COPY index.html styles.css app.js reels-fix.css reels-fix.js README.md /app/

RUN mkdir -p /app/data /app/uploads \
    && chown -R quash:quash /app

USER quash
ENV HOST=0.0.0.0
ENV PORT=10000
EXPOSE 10000

CMD ["./quash_server"]
