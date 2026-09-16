# ADR-008 — RabbitMQ pour les workflows event-driven

## Statut

Accepted

## Date

2026-09-14

## Contexte

L'application cible nécessite au moins un workflow event-driven complet et démontrable.

Les notifications et effets secondaires similaires ne doivent pas forcer l'opération métier d'origine à exécuter directement tous les traitements en aval.

L'architecture doit démontrer une messagerie asynchrone sans introduire des microservices.

## Décision

RabbitMQ sera utilisé comme message broker pour les workflows event-driven.

Le backend reste un monolithe modulaire.

Les services métier publient des événements de domaine/applicatifs via une abstraction d'Event Bus.

Exemple de workflow :

`Task créée -> publication task.created -> RabbitMQ -> consumer Notification -> persistence de la notification`

Le nommage des événements suit :

`<domain>.<action>`

Exemple :

`task.created`

La conception doit supporter les acknowledgements, retries, logs, gestion d'échec et consumers idempotents lorsque nécessaire.

## Alternatives étudiées

### Redis Streams

Étudié, mais RabbitMQ a été retenu car exchanges, queues, acknowledgements, retries et dead-letter patterns rendent le modèle de messagerie explicite et facile à démontrer.

### Event emitter uniquement en mémoire

Rejeté car il ne fournirait pas le workflow asynchrone basé sur un broker ni un comportement réaliste de retry/échec.

### Microservices

Rejetés car la messagerie ne nécessite pas de services déployés indépendamment dans le périmètre actuel.

## Conséquences

### Positives

- Workflow asynchrone clair.
- Découple les effets secondaires de la requête d'origine.
- Supporte acknowledgements, retries et stratégies dead-letter.
- Répond au besoin event-driven sans microservices.

### Négatives / Compromis

- Ajoute une infrastructure aux environnements locaux et déployés.
- Nécessite gestion d'échec et observabilité.
- Les consumers doivent gérer les livraisons en double.

## Notes d'implémentation

Les consumers doivent être conçus de manière idempotente lorsque des doublons peuvent se produire.

Les identifiants et URLs RabbitMQ doivent être fournis via la configuration d'environnement.

## Documentation associée

- `docs/architecture/BACKEND_MIGRATION.fr.md`
- `docs/standards/TESTING_CONVENTIONS.fr.md`

## Remplace

Aucun

## Remplacé par

Aucun
