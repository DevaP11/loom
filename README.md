# Loom (v1)

## Table of Contents
- [About](#-about)
- [Roadmap Items](#-roadmap-items)
- [Self Hosting](#-self-hosting)

## 🚀 About

**Loom** is a Typescript + Go software designed to setup a simple plug-and-play feature flag management system. 

- **Simple**: Loom makes all the changes to a JSON file, this file can be read and parsed by an system with relative ease
- **Cloud Agnostic**: Setup in a way that these flags can be used for multiple clouds like AWS, Azure, etc...
- **Self-Hostable**: Loom can be hosted as a docker container.
- **Language Neutral**: The file can be stored in any of the supported internet file systems or you can use the built in webhook to save data any where you want. Allowing you to integrate loom anywhere you want.

## ✨ Roadmap Items

- **Auth**: Social login support 
- **RBAC**: Role based access control list

## 📝 Self Hosting

**Loom (v1)** can be deployed as docker container or by cloning the repository.

Create this docker-compose.yml file in your local or add this service to your existing compose file. 

```
version: "3.9"
services:
  loom:
    build:
      context: https://github.com/DevaP11/loom.git 
      dockerfile: ./Dockerfile
    image: loom:latest
    ports:
      - "4144:4144"
```

Run this compose with `docker compose up --force-recreate --build -d`. Visit `http://localhost:4144/` to visit loom.
