# Audit technique complet — Application Legacy TodoList

**Projet audité :** `getting-started-app` / base Legacy TodoList  
**Date de l’audit :** 02/09/2026  
**Périmètre :** archive source fournie (`getting-started-app.zip`)  
**Objectif :** établir un état des lieux factuel avant la refonte vers l’application Kanban.

---

## 1. Synthèse exécutive

Le dépôt audité est une **application TodoList monolithique très simple**, issue du projet de démonstration `docker/getting-started-app`. Elle combine dans un même processus Node.js :

- un serveur HTTP Express ;
- une API CRUD minimale sur des éléments Todo ;
- le service de fichiers frontend statiques ;
- une couche de persistance sélectionnant SQLite ou MySQL ;
- un frontend React ancien, livré sous forme de fichiers JavaScript précompilés/vendorizés et de JSX transpilé directement dans le navigateur avec Babel Standalone.

L’application est fonctionnellement limitée à quatre opérations : lister, créer, modifier et supprimer des éléments `todo_items`. Elle ne contient actuellement **ni authentification, ni utilisateurs, ni projets, ni véritable modèle de tâches Kanban, ni notifications, ni architecture événementielle**.

Sur le plan d’ingénierie, le dépôt présente plusieurs dettes structurantes :

- JavaScript non typé ;
- responsabilités métier et persistance fortement couplées ;
- absence de validation des entrées ;
- absence de migrations de base de données ;
- schéma SQL très peu contraint ;
- dépendances frontend anciennes et non gérées par le gestionnaire npm ;
- tests présents dans le dépôt mais **non exécutables depuis les scripts npm**, Jest n’étant pas déclaré ;
- aucune configuration ESLint, formatter, couverture ou quality gate ;
- aucune CI/CD ;
- aucun Dockerfile ni fichier Compose dans le dépôt audité ;
- documentation minimale ;
- aucune stratégie explicite de version Node.js.

Le code existant reste néanmoins utile comme **référence fonctionnelle et point de départ d’analyse**, mais il n’est pas recommandé de conserver son architecture telle quelle. La refonte doit viser un **monolithe modulaire** : frontend React/TypeScript séparé, API REST Express/TypeScript, PostgreSQL via Prisma, RabbitMQ pour l’event-driven, tests automatisés, CI et conteneurisation.

---

# 2. Périmètre et méthode d’audit

L’audit a porté sur :

- la structure du dépôt ;
- les métadonnées npm ;
- les dépendances et versions verrouillées ;
- le frontend ;
- le backend ;
- l’API HTTP ;
- la persistance SQLite/MySQL ;
- le schéma de données ;
- les tests présents ;
- les scripts d’exécution ;
- la configuration Git ;
- la sécurité applicative observable ;
- la maintenabilité ;
- la qualité et le typage ;
- la CI/CD et le déploiement ;
- la conteneurisation ;
- la documentation ;
- l’aptitude à évoluer vers le cahier des charges Kanban.

L’audit décrit **l’état du snapshot fourni**. Les paramètres GitHub non stockés dans le dépôt, tels que les branch protections, permissions de l’organisation ou secrets GitHub, ne sont pas vérifiables depuis l’archive seule.

---

# 3. Structure actuelle du dépôt

```text
getting-started-app/
├── .dockerignore
├── .git/
├── README.md
├── package.json
├── package-lock.json
│
├── spec/
│   ├── persistence/
│   │   └── sqlite.spec.js
│   └── routes/
│       ├── addItem.spec.js
│       ├── deleteItem.spec.js
│       ├── getItems.spec.js
│       └── updateItem.spec.js
│
└── src/
    ├── index.js
    │
    ├── persistence/
    │   ├── index.js
    │   ├── mysql.js
    │   └── sqlite.js
    │
    ├── routes/
    │   ├── addItem.js
    │   ├── deleteItem.js
    │   ├── getItems.js
    │   └── updateItem.js
    │
    └── static/
        ├── index.html
        ├── css/
        │   ├── bootstrap.min.css
        │   ├── styles.css
        │   └── font-awesome/
        └── js/
            ├── app.js
            ├── babel.min.js
            ├── react-bootstrap.js
            ├── react-dom.production.min.js
            └── react.production.min.js
```

### Observations

La structure est courte et compréhensible, mais elle correspond à une application de démonstration plutôt qu’à une application métier destinée à évoluer.

Il n’existe notamment pas de séparation explicite entre :

- domaine métier ;
- services métier ;
- contrôleurs HTTP ;
- repositories ;
- infrastructure ;
- configuration ;
- validation ;
- événements.

---

# 4. Inventaire technologique et versions

## 4.1 Backend npm

| Technologie | Déclaration `package.json` | Version résolue | Rôle actuel | Évaluation |
|---|---:|---:|---|---|
| Node.js | Non déclarée | Non imposée | Runtime | Version non reproductible |
| Express | `^5.2.1` | `5.2.1` | Serveur HTTP/API/statique | Conservable |
| mysql2 | `^3.16.1` | `3.16.1` | Accès MySQL | À retirer avec migration PostgreSQL |
| sqlite3 | `^5.1.7` | `5.1.7` | Persistance par défaut | À retirer avec migration PostgreSQL |
| uuid | `^13.0.0` | `13.0.0` | Génération des identifiants | À revoir |
| wait-port | `^1.1.0` | `1.1.0` | Attente de MySQL au démarrage | À retirer/repenser |
| nodemon | `^3.1.9` | `3.1.11` | Redémarrage dev | Outil dev uniquement |

Le lockfile contient **271 entrées de packages** en incluant les dépendances transitives.

### Point important : version Node.js

Le projet ne possède aucun :

```text
.nvmrc
.node-version
engines dans package.json
```

Express 5.2.1 déclare Node.js `>=18`, mais certaines dépendances verrouillées dans le graphe déclarent `20 || >=22`. Le dépôt ne permet donc pas à lui seul de déterminer clairement la version Node officiellement supportée par l’équipe.

**Action recommandée :** choisir une version Node.js LTS supportée et la figer dans le dépôt, dans la CI et dans les futures images Docker.

### Point de compatibilité `uuid`

Le backend utilise CommonJS :

```js
const { v4: uuid } = require('uuid');
```

alors que `uuid` 13 appartient aux versions récentes distribuées en ESM. Cette combinaison dépend du comportement du runtime Node utilisé et constitue un risque de portabilité entre versions/outils.

Pour la refonte, deux options cohérentes sont possibles :

- standardiser le nouveau backend en ESM/TypeScript ;
- ou supprimer cette dépendance et utiliser `crypto.randomUUID()` lorsque cela suffit.

---

## 4.2 Frontend livré dans `src/static`

| Technologie | Version identifiable | Gestion | Évaluation |
|---|---:|---|---|
| React | `16.8.6` | Fichier vendorizé | Ancien |
| ReactDOM | `16.8.6` | Fichier vendorizé | Ancien |
| Babel Standalone | `6.26.0` | Fichier vendorizé | Très ancien / runtime browser |
| Bootstrap | `4.3.1` | Fichier vendorizé | Ancien |
| Font Awesome Free | `5.10.2` | Fichiers vendorizés | Ancien |
| React-Bootstrap | Version exacte non déclarée de manière fiable | Fichier vendorizé | Non traçable proprement |
| Google Fonts / Lato | Version non figée | Appel externe | Dépendance externe runtime |

### Problème de gestion des dépendances frontend

Ces bibliothèques ne sont pas déclarées dans `package.json`. Elles sont copiées directement dans le repository.

Conséquences :

- les versions ne sont pas centralisées ;
- les mises à jour sont manuelles ;
- `npm audit` ne couvre pas ces bibliothèques vendorizées ;
- il n’existe pas de mécanisme reproductible de build frontend ;
- certaines versions ne peuvent pas être identifiées proprement depuis le manifest du projet.

---

# 5. Architecture applicative actuelle

## 5.1 Vue générale

```text
Navigateur
   │
   ├── GET fichiers statiques
   │
   ▼
Express / Node.js
   │
   ├── sert src/static/
   │
   └── API /items
          │
          ▼
      Route Handler
          │
          ▼
     Persistence API
          │
      ┌───┴────┐
      ▼        ▼
   SQLite     MySQL
```

Le choix de la base est effectué dans `src/persistence/index.js` :

```text
MYSQL_HOST présent  → MySQL
MYSQL_HOST absent   → SQLite
```

## 5.2 Style architectural

Le projet est un **monolithe simple avec séparation technique minimale**.

Il existe une distinction entre `routes` et `persistence`, ce qui est positif, mais les routes HTTP appellent directement la couche de persistance :

```text
HTTP Route
   ↓
Persistence
   ↓
Database
```

Il n’y a donc pas de véritable couche :

```text
Controller
   ↓
Service / Use Case
   ↓
Repository
```

### Conséquence

Dès que des règles métier apparaissent — ownership, autorisation, transitions Kanban, priorités, deadlines, notifications — elles risquent d’être placées dans les handlers HTTP ou les repositories, ce qui rendrait le projet difficile à tester et maintenir.

---

# 6. Analyse du backend

## 6.1 Initialisation

`src/index.js` réalise directement :

- création de l’application Express ;
- middleware JSON ;
- service des fichiers statiques ;
- déclaration des routes ;
- initialisation DB ;
- écoute sur le port ;
- gestion des signaux système.

### Points positifs

- code simple à lire ;
- initialisation DB avant ouverture du serveur ;
- arrêt gracieux prévu pour les signaux `SIGINT`, `SIGTERM` et `SIGUSR2` ;
- utilisation d’Express 5 récent.

### Limites

- port `3000` codé en dur ;
- aucune validation de configuration ;
- aucun logger structuré ;
- aucun healthcheck ;
- aucun middleware d’erreur applicatif ;
- aucune séparation `app` / `server`, ce qui complique les tests HTTP ;
- frontend et API servis par le même processus.

---

# 7. Analyse de l’API HTTP

## 7.1 Routes présentes

```text
GET    /items
POST   /items
PUT    /items/:id
DELETE /items/:id
```

### Modèle exposé

```text
TodoItem
├── id
├── name
└── completed
```

## 7.2 Fonctionnalités réellement disponibles

- création d’un Todo ;
- liste de tous les Todos ;
- modification du nom et/ou du statut `completed` via l’API ;
- suppression ;
- bascule terminé/non terminé depuis le frontend.

Le frontend ne propose pas réellement d’interface complète d’édition du nom malgré la capacité de l’endpoint `PUT`.

## 7.3 Conformité REST

L’API utilise correctement les méthodes HTTP de base, mais plusieurs conventions doivent être améliorées :

- pas de préfixe `/api` ;
- pas de version d’API ;
- `POST /items` renvoie implicitement `200` au lieu de `201 Created` ;
- `DELETE` renvoie toujours `200`, même si l’élément n’existe pas ;
- `PUT` ne vérifie pas l’existence de l’élément avant/après modification de manière métier ;
- aucun format d’erreur uniforme ;
- aucune pagination ;
- aucun filtrage ;
- aucun tri ;
- aucun endpoint de santé.

---

# 8. Validation et gestion des erreurs

## 8.1 Validation

Aucune validation de schéma n’est présente.

Exemple :

```js
name: req.body.name
```

La valeur est transmise directement à la persistance.

Il n’existe pas de contrôle explicite sur :

- présence de `name` ;
- type de `name` ;
- longueur ;
- chaîne vide ou whitespace ;
- type de `completed` ;
- format d’un ID ;
- champs inconnus.

## 8.2 Gestion des erreurs

Les handlers `async` ne définissent pas de politique d’erreur métier ni de mapping d’erreurs.

Express 5 peut transmettre les rejets de Promises au mécanisme d’erreur Express, mais le projet ne possède aucun middleware personnalisé produisant un format d’erreur stable.

Conséquences :

- réponses d’erreur non contractuelles ;
- distinction métier `404`, `409`, `422`, etc. inexistante ;
- risque d’exposer des détails techniques selon l’environnement ;
- frontend incapable de traiter proprement les erreurs.

---

# 9. Persistance et modèle de données

## 9.1 Moteurs disponibles

Le projet possède deux implémentations pratiquement dupliquées :

```text
SQLite
MySQL
```

L’interface commune expose :

```text
init()
teardown()
getItems()
getItem(id)
storeItem(item)
updateItem(id, item)
removeItem(id)
```

### Point positif

Une abstraction minimale de persistance existe déjà, ce qui montre une intention de ne pas exposer directement SQL aux routes.

### Limite

Les deux implémentations dupliquent la majorité de leur logique et utilisent des callbacks enveloppés manuellement dans des Promises.

---

## 9.2 Schéma SQL

Schéma actuel :

```sql
CREATE TABLE IF NOT EXISTS todo_items (
    id varchar(36),
    name varchar(255),
    completed boolean
)
```

### Problèmes structurels

Aucune contrainte explicite :

- `PRIMARY KEY` absente ;
- `NOT NULL` absent ;
- unicité de l’ID non garantie ;
- aucun index ;
- aucun timestamp ;
- aucune relation ;
- aucune clé étrangère ;
- aucune notion utilisateur/projet.

Le schéma est créé au démarrage avec `CREATE TABLE IF NOT EXISTS`, pas avec un système de migrations.

### Conséquences

- évolution du schéma difficile ;
- changements non versionnés ;
- risque de divergence entre environnements ;
- rollback de schéma absent ;
- contraintes métier non garanties par la base.

---

## 9.3 SQLite

Configuration par défaut :

```text
SQLITE_DB_LOCATION || /etc/todos/todo.db
```

### Limites

- chemin Unix codé comme valeur par défaut ;
- dépendance au filesystem local ;
- configuration peu portable ;
- incompatible avec une stratégie de scaling horizontal basée sur plusieurs instances partageant les mêmes données ;
- pas adaptée à la cible collaborative du projet.

---

## 9.4 MySQL

La configuration peut être chargée depuis :

```text
MYSQL_HOST
MYSQL_USER
MYSQL_PASSWORD
MYSQL_DB
```

ou leurs variantes `*_FILE`.

### Points positifs

- requêtes paramétrées, ce qui limite les injections SQL classiques ;
- pool de connexions ;
- prise en charge de valeurs de secrets via fichiers ;
- charset `utf8mb4`.

### Points à corriger

- absence de validation de configuration ;
- valeurs `*_FILE` lues sans encodage/trim explicite ;
- attente du port MySQL intégrée à l’application ;
- aucune stratégie de migration ;
- aucune transaction métier ;
- aucune observabilité des connexions.

---

# 10. Analyse du frontend

## 10.1 Architecture

Le frontend est contenu principalement dans un seul fichier :

```text
src/static/js/app.js
```

Composants :

```text
App
TodoListCard
AddItemForm
ItemDisplay
```

L’état est géré avec :

```text
React.useState
React.useEffect
React.useCallback
```

## 10.2 Chargement

`index.html` charge globalement :

```text
React
ReactDOM
React-Bootstrap
Babel Standalone
app.js en text/babel
```

Le JSX est donc transformé **dans le navigateur au runtime**.

### Impacts

- pas de build de production réel ;
- pas de tree shaking ;
- pas de bundling ;
- dépendances frontend non gérées par npm ;
- temps de chargement inutilement accru ;
- stratégie CSP plus difficile avec Babel runtime ;
- pas de vérification TypeScript ;
- architecture non adaptée à l’augmentation du nombre d’écrans.

Les fichiers statiques représentent plusieurs mégaoctets dans le dépôt, essentiellement à cause des bibliothèques vendorizées et des fonts Font Awesome.

## 10.3 Gestion des appels HTTP

Le frontend utilise directement `fetch()`.

Aucune couche cliente API centralisée n’existe.

Les appels ne vérifient pas systématiquement :

```js
response.ok
```

### Exemple de conséquence

Un `DELETE` retournant un statut HTTP d’erreur peut tout de même déclencher la suppression locale de l’élément, car `fetch()` résout la Promise sur les réponses HTTP 4xx/5xx.

## 10.4 États UI

Présent :

- chargement initial minimal ;
- état pendant création ;
- état vide.

Absent :

- gestion d’erreur ;
- retry ;
- feedback global ;
- routing ;
- authentification ;
- gestion de session ;
- état projet ;
- Kanban ;
- notifications.

---

# 11. Sécurité

## 11.1 Authentification

**Absente.**

Toutes les routes sont accessibles sans identité utilisateur.

## 11.2 Autorisation

**Absente.**

Il n’existe aucune notion de propriété ou de permission.

## 11.3 Validation

**Absente.**

Les données utilisateur sont envoyées directement à la couche de persistance.

## 11.4 SQL Injection

Point positif : les requêtes SQL dynamiques utilisent des placeholders `?`, ce qui réduit fortement le risque d’injection SQL classique sur les paramètres concernés.

## 11.5 Headers HTTP de sécurité

Aucun outil tel que `helmet` n’est configuré.

Aucune stratégie explicite n’est définie pour :

- CSP ;
- HSTS ;
- frame protection ;
- MIME sniffing ;
- politique de referrer.

## 11.6 Rate limiting

Absent.

## 11.7 Secrets

Les secrets MySQL peuvent être fournis via variables ou fichiers, ce qui constitue un bon point de départ.

Cependant :

- pas de `.env.example` ;
- pas de validation centralisée ;
- pas de documentation des secrets ;
- l’archive ne permet pas d’auditer les secrets GitHub.

## 11.8 Dépendance Google Fonts

Le navigateur contacte `fonts.googleapis.com` pour Lato.

Dans le cadre d’une application devant traiter la conformité RGPD, cette dépendance externe doit être évaluée. Le self-hosting des fonts est préférable si l’objectif est de réduire les dépendances et transferts externes.

---

# 12. Tests

## 12.1 Tests présents

Le dépôt contient **9 tests** répartis ainsi :

| Zone | Nombre |
|---|---:|
| SQLite persistence | 5 |
| `addItem` route | 1 |
| `deleteItem` route | 1 |
| `getItems` route | 1 |
| `updateItem` route | 1 |

Les tests utilisent l’API de Jest :

```text
test()
expect()
jest.mock()
jest.fn()
```

## 12.2 Problème bloquant

`package.json` ne contient :

- ni dépendance `jest` ;
- ni script `test`.

L’exécution :

```bash
npm test
```

échoue donc immédiatement avec :

```text
Missing script: "test"
```

Les fichiers de tests sont présents, mais **la stratégie de test n’est plus opérationnelle depuis l’état actuel du dépôt**.

## 12.3 Couverture fonctionnelle insuffisante

Absents :

- tests MySQL ;
- tests HTTP via un vrai serveur Express ;
- tests frontend ;
- tests d’intégration ;
- tests E2E ;
- tests de sécurité ;
- tests de validation ;
- tests de cas d’erreur ;
- tests de concurrence ;
- tests événementiels ;
- mesure de couverture.

## 12.4 Robustesse des tests SQLite

Les tests initialisent la DB plusieurs fois mais n’appellent pas systématiquement `teardown()` après chaque test.

Cela peut produire des handles ouverts et rend la suite moins portable, notamment sur les systèmes où un fichier ouvert ne peut pas être supprimé proprement.

---

# 13. Typage et qualité du code

## 13.1 Typage

Le projet est intégralement en JavaScript.

Absents :

```text
TypeScript
tsconfig.json
DTO typés
types partagés
```

Aucun contrôle compile-time n’empêche par exemple :

```text
completed = "hello"
name = undefined
```

avant l’arrivée dans le code d’exécution.

## 13.2 Lint / formatter

Absents :

```text
ESLint
Prettier
EditorConfig
lint script
format script
```

## 13.3 Analyse de qualité

Absents :

```text
SonarQube / SonarCloud
quality gate
coverage gate
analyse statique dans la CI
```

## 13.4 Complexité

Le code est actuellement peu complexe uniquement parce que le périmètre fonctionnel est extrêmement réduit.

Cette simplicité n’est pas une garantie de maintenabilité à l’échelle du cahier des charges : l’architecture actuelle ne fournit pas les frontières nécessaires avant l’ajout d’authentification, projets, tâches, notifications et événements.

---

# 14. Configuration npm et reproductibilité

## 14.1 Scripts présents

Un seul script :

```json
"dev": "nodemon -L src/index.js"
```

Absents :

```text
start
test
lint
lint:fix
format
format:check
typecheck
build
coverage
```

## 14.2 Métadonnées

```text
name: 101-app
version: 1.0.0
license: MIT
main: index.js
```

### Points à corriger

- `101-app` n’exprime pas le domaine du projet ;
- `main: index.js` ne correspond pas au véritable entrypoint `src/index.js` ;
- aucun `private: true`, donc le package n’est pas explicitement protégé contre une publication npm accidentelle ;
- aucune version Node déclarée ;
- la licence MIT est déclarée dans `package.json`, mais aucun fichier `LICENSE` n’est présent dans le snapshot.

---

# 15. Git et gouvernance du dépôt

Le dépôt Git contenu dans l’archive pointe encore vers :

```text
git@github.com:docker/getting-started-app.git
```

Dernier commit du snapshot :

```text
6b025fc — update app to remove vulns (#98)
Date : 2026-01-28
```

L’historique montre notamment plusieurs mises à jour de dépendances liées à des vulnérabilités.

### Remarque importante

Le dépôt ne contient pas de `.gitignore`.

C’est un risque concret : des répertoires tels que `node_modules` ou des fichiers `.env` peuvent être ajoutés accidentellement si l’équipe ne les ignore pas autrement.

### Ce qui n’est pas auditable depuis l’archive

- protections de branche GitHub ;
- règles d’approbation ;
- permissions de l’organisation ;
- GitHub Project ;
- secrets GitHub ;
- règles de merge configurées côté plateforme.

---

# 16. Docker, déploiement et CI/CD

## 16.1 Docker

Le projet fourni **ne possède pas de Dockerfile**.

Il ne possède pas non plus :

```text
compose.yaml
docker-compose.yml
```

Il existe seulement :

```text
.dockerignore
```

avec :

```text
node_modules
Dockerfile
```

Ce fichier est donc actuellement un vestige de l’origine Docker du projet, mais **ne constitue pas une conteneurisation**.

## 16.2 CI

Aucun dossier :

```text
.github/workflows/
```

n’est présent.

Il n’y a donc pas de pipeline automatisé versionné dans le snapshot.

## 16.3 CD

Absent.

## 16.4 Publication d’image

Absente.

## 16.5 Healthcheck / readiness

Absents.

---

# 17. Observabilité

L’observabilité est quasiment inexistante.

Présent :

```text
console.log()
console.error()
```

Absent :

- logger structuré ;
- niveaux de log ;
- correlation/request ID ;
- métriques ;
- tracing ;
- endpoint health ;
- endpoint readiness ;
- audit logs ;
- monitoring.

Pour le périmètre de trois semaines, métriques/tracing avancés ne sont pas prioritaires, mais un logging structuré et des healthchecks sont recommandés.

---

# 18. Documentation

Le `README.md` contient uniquement quelques lignes indiquant qu’il s’agit d’une application de démonstration issue du guide Docker.

Absents :

- instructions d’installation détaillées ;
- version Node ;
- variables d’environnement ;
- architecture ;
- conventions ;
- API ;
- tests ;
- workflow Git ;
- stratégie DB ;
- instructions de déploiement ;
- troubleshooting.

La documentation actuelle ne permet pas à un nouveau développeur d’installer et comprendre proprement le projet sans lire directement le code.

---

# 19. Évaluation de l’architecture face à l’évolution demandée

## 19.1 Ce qui peut être conservé conceptuellement

- Node.js comme runtime backend ;
- Express comme framework HTTP ;
- principe d’une couche d’accès aux données séparée ;
- requêtes paramétrées ;
- graceful shutdown ;
- UUID comme stratégie d’identifiant si elle est standardisée ;
- principe de petits handlers/fichiers faciles à lire.

## 19.2 Ce qui doit être remplacé ou restructuré

- frontend statique React 16 ;
- Babel runtime ;
- dépendances frontend vendorizées ;
- JavaScript backend non typé ;
- routes directement couplées à la DB ;
- dualité SQLite/MySQL ;
- création de schéma au runtime ;
- gestion d’erreur actuelle ;
- configuration actuelle ;
- système de tests cassé ;
- absence de CI/qualité ;
- documentation minimale.

---

# 20. Écart avec les besoins du projet Kanban

| Besoin cible | État Legacy |
|---|---|
| Interface fonctionnelle | Partiel — TodoList minimale |
| Authentification sécurisée | Absente |
| Gestion utilisateur RGPD | Absente |
| CRUD projets | Absent |
| CRUD tâches métier | Très partiel — Todo items uniquement |
| Workflow Kanban | Absent — booléen `completed` uniquement |
| Priorités | Absentes |
| Deadlines | Absentes |
| Notifications | Absentes |
| Home personnalisée | Absente |
| Event-driven | Absent |
| CI | Absente |
| Publication Docker | Absente |
| Quality gate | Absent |
| Tests opérationnels | Non — sources de tests présentes mais runner non configuré |
| Couverture | Absente |
| Documentation architecture | Absente |

Le legacy constitue donc bien un **point de départ à analyser et refondre**, et non une base architecturale à étendre sans changement.

---

# 21. Risques techniques prioritaires

## Priorité haute

### R1 — Architecture trop couplée pour le nouveau domaine

Les handlers HTTP appellent directement la persistance. L’ajout des règles métier augmenterait rapidement le couplage.

**Action :** introduire modules, services/use cases et repositories dès Sprint 1.

### R2 — Tests présents mais non opérationnels

Jest n’est ni déclaré ni scripté.

**Action :** reconstruire immédiatement la stratégie de tests et l’intégrer à la CI.

### R3 — Données sans contraintes ni migrations

Le schéma actuel ne possède pratiquement aucune garantie d’intégrité.

**Action :** PostgreSQL + Prisma + migrations versionnées.

### R4 — Aucune validation ni politique d’erreur

Les entrées HTTP ne sont pas validées.

**Action :** validation de schéma à la frontière HTTP et format d’erreur standardisé.

### R5 — Frontend techniquement obsolète et non reproductible

Les dépendances sont vendorizées et Babel compile le JSX dans le navigateur.

**Action :** React moderne + TypeScript + Vite, dépendances npm.

### R6 — Aucune automatisation qualité

Pas de lint, tests scriptés, couverture, CI ou quality gate.

**Action :** ESLint, TypeScript, tests, couverture, analyse statique, GitHub Actions.

### R7 — Absence de version Node contractuelle

Les développeurs et la CI peuvent utiliser des runtimes différents.

**Action :** figer une version LTS et l’utiliser partout.

---

## Priorité moyenne

### R8 — Configuration non centralisée

Port et chemin SQLite codés en dur, variables non validées.

### R9 — Pas de logging structuré

Diagnostic de production difficile.

### R10 — `.gitignore` absent

Risque de commit accidentel de dépendances ou secrets locaux.

### R11 — Documentation insuffisante

Onboarding et maintenance difficiles.

### R12 — Dépendances frontend invisibles à npm

Mises à jour et suivi de sécurité incomplets.

---

# 22. Architecture cible recommandée

Le projet ne nécessite pas de microservices pour répondre au cahier des charges.

La cible recommandée est un **monolithe modulaire avec mécanisme événementiel**.

```text
                         ┌──────────────────┐
                         │  React + TS/Vite │
                         │     Frontend     │
                         └────────┬─────────┘
                                  │ REST / JSON
                                  ▼
┌──────────────────────────────────────────────────────────┐
│                Express + TypeScript API                  │
│                                                          │
│  Auth/Users   Projects   Tasks   Notifications           │
│      │           │         │           │                 │
│      └───────────┴─────────┴───────────┘                 │
│                      Services                            │
│                         │                                │
│                    Repositories                          │
└──────────────┬──────────────────────────────┬────────────┘
               │                              │
               ▼                              ▼
          Prisma ORM                       RabbitMQ
               │                              │
               ▼                              ▼
          PostgreSQL                      Consumers
```

## Technologies recommandées pour la refonte

| Domaine | Cible |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + TypeScript + Express 5 |
| Validation | Zod ou équivalent |
| API | REST |
| ORM | Prisma |
| Base | PostgreSQL |
| Event-driven | RabbitMQ |
| Auth | Mécanisme sécurisé défini par l’équipe, stockage partagé/persistant si nécessaire |
| Lint | ESLint |
| Formatting | Prettier si retenu |
| Unit tests | Vitest |
| API integration | Supertest |
| Front tests | React Testing Library |
| E2E | Playwright ou équivalent si retenu |
| Code quality | SonarQube/SonarCloud ou équivalent |
| CI | GitHub Actions |
| Containers | Docker + Docker Compose |
| API docs | OpenAPI |

---

# 23. Structure backend cible

```text
apps/api/src/
├── config/
├── middleware/
├── events/
├── infrastructure/
│   ├── database/
│   └── messaging/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── projects/
│   ├── tasks/
│   └── notifications/
└── server.ts
```

Pour chaque module métier :

```text
Controller
   ↓
Service / Use Case
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

Cette structure reste simple, testable et compatible avec l’échelle réelle du projet.

---

# 24. Stratégie de migration recommandée

## Phase 1 — Stabiliser les fondations

1. préserver le snapshot legacy ;
2. documenter l’audit et la dette technique ;
3. définir la version Node ;
4. définir conventions Git, code, tests et nommage ;
5. configurer ESLint/TypeScript ;
6. mettre en place la CI ;
7. créer le frontend React/TypeScript/Vite ;
8. restructurer le backend TypeScript ;
9. configurer PostgreSQL + Prisma ;
10. créer Docker/Compose ;
11. configurer tests et couverture.

## Phase 2 — Domaine principal

1. Users/Auth ;
2. Projects ;
3. Tasks ;
4. ownership ;
5. workflow Kanban ;
6. frontend connecté à l’API.

## Phase 3 — Event-driven et qualité

1. RabbitMQ ;
2. `task.created` ;
3. consumer de notification ;
4. workflow complet démontrable ;
5. qualité bloquante ;
6. tests d’intégration/E2E ;
7. durcissement sécurité ;
8. documentation finale.

---

# 25. Conclusion

Le projet Legacy est **adapté à son rôle initial de démonstrateur TodoList**, mais son architecture et son outillage ne sont pas adaptés aux exigences d’une application Kanban maintenable et production-ready.

Le principal enjeu n’est pas de corriger progressivement chaque fichier actuel. Il est de **préserver le comportement utile, tout en remplaçant les fondations techniques qui ne permettent pas l’évolution**.

Les problèmes les plus structurants sont :

1. absence de vraie couche métier ;
2. frontend ancien, vendorizé et sans build ;
3. absence de typage et validation ;
4. modèle de données sans contraintes/migrations ;
5. stratégie de tests actuellement non exécutable ;
6. absence complète de CI/quality gate ;
7. absence actuelle de conteneurisation malgré la présence d’un `.dockerignore` ;
8. absence d’authentification, de sécurité applicative et d’event-driven ;
9. documentation insuffisante ;
10. environnement Node non figé.

La trajectoire recommandée — **monolithe modulaire TypeScript + REST + Prisma/PostgreSQL + RabbitMQ + CI/qualité + Docker** — répond directement à ces faiblesses sans introduire la complexité inutile de microservices ou d’un scaling horizontal prématuré.

---

## Annexe A — Constats rapides vérifiés

```text
Routes HTTP                     4
Tests présents                  9
Script npm test                 absent
Jest dans package.json          absent
TypeScript                      absent
ESLint                          absent
Prettier                        absent
Coverage                        absente
CI GitHub Actions               absente
Dockerfile                      absent
Docker Compose                  absent
.dockerignore                   présent
.gitignore                      absent
Authentification                absente
Autorisation                    absente
Event-driven                    absent
RabbitMQ                        absent
Prisma                          absent
PostgreSQL                      absent
SQLite                          présent
MySQL                           présent
API REST complète métier        absente
OpenAPI                         absent
Healthcheck                     absent
Logging structuré               absent
```

## Annexe B — Versions détectées

```text
Application package             1.0.0
Express                         5.2.1
mysql2                          3.16.1
sqlite3                         5.1.7
uuid                            13.0.0
wait-port                       1.1.0
nodemon                         3.1.11 (lockfile)
React                           16.8.6
ReactDOM                        16.8.6
Babel Standalone                6.26.0
Bootstrap                       4.3.1
Font Awesome Free               5.10.2
React-Bootstrap                 version non fiablement déclarée
Node.js                         non figée dans le dépôt
```
