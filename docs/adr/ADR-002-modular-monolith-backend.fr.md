# ADR-002 — Architecture backend en monolithe modulaire

## Statut

Accepted

## Date

2026-09-14

## Contexte

L'application cible introduit plusieurs domaines métier : authentification, utilisateurs, projets, tâches, notifications, persistence et workflows event-driven.

L'équipe a besoin de frontières métier claires et d'un code maintenable sans introduire la complexité opérationnelle de microservices distribués pendant une période de livraison courte.

## Décision

Le backend utilisera une architecture en monolithe modulaire.

Les capacités métier sont organisées en modules explicites tels que :

- `auth`
- `users`
- `projects`
- `tasks`
- `notifications`

À l'intérieur d'un module métier, la direction de dépendance privilégiée est :

`Controller -> Service / Use Case -> Repository -> Prisma -> PostgreSQL`

Les infrastructures partagées comme la configuration, l'accès à la base, la messagerie et les middlewares restent en dehors des modules métier lorsque cela est pertinent.

RabbitMQ est une infrastructure de support et ne transforme pas l'application en architecture microservices.

## Alternatives étudiées

### Microservices

Rejetés car le périmètre actuel ne justifie pas des déploiements indépendants, des communications réseau entre services, des transactions distribuées, de la découverte de services ou une responsabilité opérationnelle séparée.

### Monolithe non structuré

Rejeté car il reproduirait les problèmes de couplage et de maintenabilité que la modernisation doit réduire.

## Conséquences

### Positives

- Frontières métier claires.
- Déploiement plus simple que des microservices.
- Développement local et tests plus simples.
- Les modules peuvent évoluer indépendamment dans une même application déployable.
- L'architecture reste compatible avec une extraction future si un besoin réel apparaît.

### Négatives / Compromis

- Les modules partagent toujours le même processus applicatif.
- Les frontières doivent être respectées via les conventions et les reviews.
- Du code partagé mal conçu peut recréer du couplage.

## Notes d'implémentation

Les modules doivent communiquer via des interfaces explicites ou des services applicatifs, plutôt que d'accéder directement à l'implémentation de persistence d'un autre module.

Le backend doit rester stateless lorsque cela est pertinent afin de conserver la possibilité d'un scaling horizontal futur sans devoir l'implémenter maintenant.

## Documentation associée

- `docs/architecture/BACKEND_MIGRATION.fr.md`
- `docs/standards/DEVELOPMENT_CONVENTIONS.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
