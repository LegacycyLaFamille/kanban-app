# Guide d'intégration de l'équipe

Bienvenue sur le projet Kanban App.

Ce document regroupe les informations essentielles permettant de comprendre rapidement comment l'équipe communique, collabore et organise son travail.

---

## 1. Présentation du projet

Le projet consiste à moderniser progressivement une application TodoList legacy afin d'en faire une application Kanban maintenable.

La modernisation est incrémentale : l'application existante doit rester fonctionnelle pendant que les différentes parties legacy sont progressivement isolées puis remplacées.

Technologies principales :

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

Le projet utilise une architecture backend en monolithe modulaire et une architecture frontend orientée fonctionnalités.

---

## 2. Liens importants

### Dépôt GitHub

[Github](https://github.com/LegacycyLaFamille/kanban-app)

### GitHub Project

[Github Project](https://github.com/orgs/LegacycyLaFamille/projects/1/)

Le GitHub Project constitue la source de vérité concernant :

- Le backlog
- Les Sprints
- L'attribution des tâches
- Le statut actuel des tâches
- Les priorités
- Les estimations
- Les dépendances

### Discord

[Discord](https://discord.gg/cUBWcBGasE)

Discord est la plateforme principale de communication de l'équipe.

Les décisions importantes concernant le projet ne doivent pas rester uniquement dans des messages privés.

Lorsqu'une discussion mène à une décision d'architecture ou d'organisation, son résultat doit être documenté dans GitHub ou dans la documentation du projet.

---

## 3. Utilisation de Discord

Discord est utilisé pour les échanges rapides entre les membres de l'équipe.

Organisation recommandée des salons :

| Salon | Utilisation |
| --- | --- |
| `#announcements` | Annonces importantes concernant l'équipe et le projet |
| `#general` | Discussions générales concernant le projet |
| `#development` | Discussions techniques et questions d'implémentation |
| `#pull-requests` | Pull Requests nécessitant une review |
| `#ci-cd` | Notifications CI/CD et GitHub Actions |
| `#help` | Blocages ou demandes d'aide |

Les noms des salons peuvent varier selon la configuration actuelle du Discord.

Évitez de répartir une même discussion technique dans plusieurs salons.

Lorsque cela est possible, conservez les réponses liées à un même sujet dans la même discussion ou le même thread.

---

## 4. Règles de communication

Utilisez Discord pour :

- Les questions rapides
- La coordination
- Les blocages
- Les discussions techniques courtes
- Les demandes de review de PR

Utilisez les GitHub Issues pour :

- Les développements à réaliser
- Les bugs
- Les fonctionnalités
- Les critères d'acceptation
- Les tâches techniques
- Les dépendances entre tâches

Utilisez les Pull Requests pour :

- La review de code
- Les discussions liées à une implémentation
- Les retours techniques directement liés à une modification

Utilisez `/docs` pour :

- Les décisions d'architecture
- Les conventions de développement
- Les stratégies de migration
- La documentation technique
- Les informations devant être conservées à long terme

Les décisions importantes doivent toujours laisser une trace écrite.

---

## 5. Attentes concernant la communication

Il n'est pas nécessaire de surveiller Discord en permanence.

Pendant les périodes de travail :

- Consultez régulièrement Discord.
- Consultez les issues qui vous sont attribuées.
- Réagissez rapidement lorsqu'un autre développeur est bloqué par votre travail.
- Mentionnez une personne uniquement lorsque son intervention est nécessaire.
- Préférez les salons publics du projet aux messages privés pour les informations liées au projet.

Si vous êtes bloqué, communiquez-le le plus rapidement possible plutôt que d'attendre la prochaine réunion.

Lorsque vous demandez de l'aide, précisez :

- Ce que vous essayez de faire
- Le résultat attendu
- Ce qui se produit réellement
- Les logs ou erreurs pertinentes
- Ce que vous avez déjà essayé

---

## 6. Rythme de l'équipe

Le projet suit Scrum avec des cycles de développement courts.

### Daily Scrum

Fréquence :

**Chaque jour travaillé**

Le Daily doit rester court.

Chaque développeur communique :

1. Ce qui a été terminé depuis le Daily précédent.
2. Ce qui va être réalisé ensuite.
3. Les éventuels blocages.

Le Daily sert à la coordination et non à résoudre de longues problématiques techniques.

Les discussions techniques doivent continuer après le Daily avec les personnes concernées.

---

### Sprint Planning

Fréquence :

**Au début de chaque Sprint**

Objectifs :

- Revoir l'objectif du Sprint
- Sélectionner les éléments du backlog
- Vérifier les priorités
- Vérifier les estimations
- Attribuer ou confirmer les responsables
- Identifier les dépendances

---

### Sprint Review

Fréquence :

**À la fin de chaque Sprint**

Objectifs :

- Présenter les fonctionnalités terminées
- Vérifier les livrables du Sprint
- Vérifier ce qui a réellement été terminé
- Recueillir les retours

Seules les fonctionnalités fonctionnelles et démontrables doivent être présentées comme terminées.

---

### Sprint Retrospective

Fréquence :

**À la fin de chaque Sprint**

Discuter de :

- Ce qui a bien fonctionné
- Ce qui a posé problème
- Ce qui doit être modifié
- Ce que l'équipe doit continuer à faire

L'objectif est d'améliorer le fonctionnement de l'équipe pour le Sprint suivant.

---

## 7. Workflow GitHub Project

Cycle classique d'une tâche :

```text
Backlog
   ↓
Ready
   ↓
In Progress
   ↓
In Review
   ↓
Testing
   ↓
Done