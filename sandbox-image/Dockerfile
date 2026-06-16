FROM ubuntu:24.04

RUN apt update && apt install -y \
    gcc \
    g++ \
    python3 \
    openjdk-21-jdk \
    nodejs

RUN useradd -m sandbox

USER sandbox

WORKDIR /app