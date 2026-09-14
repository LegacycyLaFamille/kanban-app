# Guide d'intégration de l'équipe

Bienvenue sur le projet Kanban App.

Ce guide regroupe les informations essentielles dont un nouvel arrivant a besoin pour comprendre comment l'équipe communique, collabore et organise son travail.

## 1. Présentation du projet

Le projet consiste à moderniser progressivement une application TodoList legacy afin d'en faire une application Kanban maintenable.

La migration est incrémentale : l'application legacy doit rester fonctionnelle pendant que les anciennes parties sont isolées, remplacées, validées puis supprimées.

### Technologies principales

- React
- TypeScript
- Vite
- Reshaped
- Node.js
- Express
- Prisma
- PostgreSQL
- RabbitMQ
- Docker
- GitHub Actions

### Architecture

Frontend :
- React + TypeScript
- Architecture orientée fonctionnalités

Backend :
- Node.js + Express + TypeScript
- Monolithe modulaire
- Controller -> Service -> Repository -> Prisma -> PostgreSQL

Approche de migration :
1. Comprendre l'application existante.
2. Isoler le code legacy.
3. Protéger le comportement existant.
4. Introduire l'architecture cible.
5. Remplacer progressivement les composants legacy.
6. Supprimer le code legacy obsolète uniquement après validation.

## 2. Liens importants

- [Dépôt GitHub](https://github.com/LegacycyLaFamille/kanban-app)
- [GitHub Project](https://github.com/orgs/LegacycyLaFamille/projects/1/)
- [Discord](https://discord.gg/cUBWcBGasE)

Le GitHub Project constitue la source de vérité pour le backlog, la planification des Sprints, les responsables, les priorités, les estimations, les dépendances et le statut des tâches.

Discord est la plateforme principale de communication de l'équipe.

Les décisions importantes concernant le projet ne doivent pas rester uniquement dans des messages privés. Lorsqu'une discussion mène à une décision technique ou organisationnelle importante, son résultat doit être documenté sur GitHub ou dans `docs/`.

## 3. Communication

### Discord

Utilisez Discord pour :
- Les questions rapides
- La coordination
- Les blocages
- Les discussions techniques courtes
- Les demandes de review de Pull Request

Organisation typique :
- `#annonces` : annonces importantes concernant le projet
- `#general` : discussions générales
- `#dev` : discussions techniques
- `#pull-requests` : Pull Requests nécessitant une review
- `#github-notifications` : notifications de github (commit, pull request, ...)
- `#ressources` : toutes les ressources utiles

Les noms des salons peuvent varier selon la configuration actuelle du Discord.

### GitHub Issues

Utilisez les GitHub Issues pour :
- Les fonctionnalités
- Les bugs
- Les tâches techniques
- Les critères d'acceptation
- Les dépendances
- L'attribution du travail

### Pull Requests

Utilisez les Pull Requests pour :
- La review de code
- Les discussions liées à une implémentation
- Les retours techniques
- La validation avant merge

### Documentation

Les informations techniques devant être conservées à long terme sont placées dans `docs/`.

Principales zones :
- `docs/audit/`
- `docs/architecture/`
- `docs/standards/`
- `docs/team/`

## 4. Attentes concernant la communication

Il n'est pas nécessaire de surveiller Discord en permanence.

Pendant les périodes de travail :
- Consultez régulièrement Discord.
- Consultez les GitHub Issues qui vous sont attribuées.
- Signalez les blocages le plus rapidement possible.
- Préférez les salons publics du projet aux messages privés.
- Mentionnez un autre développeur uniquement lorsque son intervention est nécessaire.
- Regroupez les discussions techniques liées au même sujet.

Lors d'une demande d'aide, indiquez :
- Ce que vous essayez de faire
- Le résultat attendu
- Ce qui se produit réellement
- Les logs ou erreurs pertinentes
- Ce que vous avez déjà essayé

## 5. Rythme de l'équipe

Le projet suit Scrum avec des cycles de développement courts.

### Daily Scrum

Fréquence : **chaque jour travaillé**

Chaque développeur présente brièvement :
1. Ce qui a été terminé depuis le Daily précédent.
2. Ce qui va être réalisé ensuite.
3. Les éventuels blocages.

Le Daily sert à la coordination. Les longues discussions techniques doivent continuer après le Daily avec les développeurs concernés.

### Sprint Planning

Fréquence : **au début de chaque Sprint**

Objectifs :
- Revoir l'objectif du Sprint
- Sélectionner les éléments du backlog
- Confirmer les priorités
- Vérifier les estimations
- Confirmer les responsables
- Identifier les dépendances

### Sprint Review

Fréquence : **à la fin de chaque Sprint**

Objectifs :
- Présenter les fonctionnalités terminées
- Vérifier les livrables
- Recueillir les retours
- Confirmer ce qui a réellement été terminé

Seules les fonctionnalités fonctionnelles et démontrables doivent être présentées comme terminées.

### Sprint Retrospective

Fréquence : **à la fin de chaque Sprint**

L'équipe discute de :
- Ce qui a bien fonctionné
- Ce qui a posé problème
- Ce qui doit être amélioré
- Ce qui doit être conservé pour le Sprint suivant

## 6. Workflow GitHub Project

Workflow standard :

`Backlog -> Ready -> In Progress -> In Review -> Testing -> Done`

Le statut `Blocked` est utilisé lorsqu'une tâche dépend d'une autre tâche ou d'un problème non résolu.

Avant de commencer une issue :
1. S'assigner l'issue.
2. Passer l'issue en `In Progress`.
3. Lire la description et les critères d'acceptation.
4. Vérifier les dépendances.
5. Créer une branche dédiée.

## 7. Nommage des branches

Format :

`<type>/<issue-id>-<short-description>`

Exemples :
- `feature/S1-08-routing`
- `feature/S1-20-project-crud`
- `fix/S2-14-project-authorization`
- `ci/S1-31-github-actions`

Ne développez pas directement sur `main`.

## 8. Convention de commits

Le projet utilise Conventional Commits.

Format :

`<type>(optional-scope): <description>`

Exemples :
- `feat(projects): add project details page`
- `fix(auth): prevent expired session reuse`
- `refactor(tasks): extract task repository`
- `test(projects): add project service tests`
- `docs(team): add onboarding guide`
- `ci: add frontend quality check`

Types principaux :
- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `style`
- `perf`
- `ci`
- `build`
- `chore`
- `revert`

## 9. Pull Requests

Avant d'ouvrir une Pull Request :
- Vérifiez que l'application fonctionne toujours.
- Lancez les tests concernés.
- Lancez le lint lorsque nécessaire.
- Lancez le type checking lorsque nécessaire.
- Vérifiez les critères d'acceptation.
- Gardez la PR centrée sur une seule issue.

Une Pull Request doit contenir :
- Une description claire
- Les principales modifications
- Les validations effectuées
- Les éventuelles notes techniques
- L'issue GitHub associée

Utilisez `Closes #<issue-number>` lorsque cela s'applique.

Privilégiez des Pull Requests petites et ciblées.

## 10. Code review

Lors d'une review, vérifiez :
- Le bon fonctionnement
- La lisibilité
- La cohérence avec l'architecture
- Les implications de sécurité
- La gestion des erreurs
- Les tests
- Les critères d'acceptation
- Les éventuelles régressions
- La complexité inutile

Les conventions du projet doivent être privilégiées par rapport aux préférences personnelles.

## 11. Code legacy

Le code legacy ne doit pas être réécrit uniquement parce qu'il est ancien.

Principales zones legacy actuelles :
- `frontend/src/app/legacy/`
- `backend/src/legacy/`

Avant de supprimer du code legacy :
1. Son remplacement doit exister.
2. Son remplacement doit fonctionner.
3. Le comportement concerné doit être validé.
4. Aucune dépendance active ne doit encore utiliser l'ancien code.

## 12. Structure de la documentation

- `docs/audit/` : analyse de l'application legacy et dette technique
- `docs/architecture/` : architecture cible et stratégies de migration
- `docs/standards/` : conventions de développement, nommage, Git, tests, API et qualité
- `docs/team/` : organisation de l'équipe et intégration des nouveaux membres

## 13. Definition of Done

Une tâche n'est pas terminée uniquement parce que son code a été écrit.

Selon l'issue, sa finalisation comprend :
- Critères d'acceptation respectés
- Code review effectuée
- Tests nécessaires fonctionnels
- CI fonctionnelle
- Aucun problème qualité bloquant introduit
- Documentation mise à jour lorsque nécessaire
- Pull Request approuvée
- Modifications mergées
- Fonctionnalité démontrable lorsque nécessaire

## 14. Checklist du premier jour

- [ ] Rejoindre le serveur Discord
- [ ] Obtenir l'accès au dépôt GitHub
- [ ] Obtenir l'accès au GitHub Project
- [ ] Cloner le dépôt
- [ ] Lire le README principal
- [ ] Lire ce guide d'intégration
- [ ] Lire les conventions de développement
- [ ] Lire les conventions Git
- [ ] Lire la documentation d'architecture
- [ ] Installer les dépendances
- [ ] Lancer le frontend localement
- [ ] Lancer le backend localement
- [ ] Vérifier que l'application legacy fonctionne
- [ ] Identifier l'issue attribuée
- [ ] Vérifier ses dépendances
- [ ] Lire ses critères d'acceptation
- [ ] Créer la branche de développement

Si un élément nécessaire pour commencer à travailler est manquant, prévenez l'équipe le plus rapidement possible.
