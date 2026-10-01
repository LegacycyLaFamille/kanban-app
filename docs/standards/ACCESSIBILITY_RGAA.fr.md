# Norme d'accessibilité (RGAA)

## 1. Objectif

Ce document explique ce qu'est le RGAA, ce que ce projet fait actuellement pour le respecter, et ce qu'un contributeur doit faire pour que toute nouvelle interface frontend reste conforme. Il s'adresse à quelqu'un qui rejoint le projet sans connaissance préalable de l'accessibilité.

---

## 2. Qu'est-ce que le RGAA

Le RGAA (*Référentiel Général d'Amélioration de l'Accessibilité*) est le référentiel d'accessibilité de l'État français. Il décline le standard international **WCAG 2.1** (Web Content Accessibility Guidelines) en 106 critères de test concrets, regroupés en 13 thématiques (images, couleurs, formulaires, navigation, structuration, scripts, etc.).

Le RGAA est une **obligation légale** pour les sites publics français et certains sites privés. Ce projet est un exercice scolaire/portfolio, pas un service public — il n'y a donc aucune obligation légale ici — mais l'équipe suit les critères du RGAA comme bonne pratique, car :

- il recouvre presque entièrement le WCAG 2.1 AA, le standard de fait au niveau mondial ;
- il donne une liste de vérifications concrète plutôt qu'un vague objectif « être accessible » ;
- le travail d'accessibilité fait maintenant (HTML sémantique, support clavier, formulaires étiquetés) coûte bien moins cher que de le rattraper plus tard.

Référence : <https://accessibilite.numerique.gouv.fr/>

**Niveaux de conformité** : les critères RGAA sont notés A, AA ou AAA, comme le WCAG. Ce projet vise le niveau **AA**, celui qu'exige quasiment tout audit réel (y compris l'audit légal).

---

## 3. État actuel : ce que fait ce projet

Il s'agit d'une base de travail établie par une revue au niveau du code (branche `feat/rgaa`), pas d'un rapport RGAA certifié et entièrement audité. Un audit certifié demande des tests manuels (outils de mesure de contraste, plusieurs lecteurs d'écran, un passage au clavier seul, des utilisateurs en situation de handicap) qui n'ont pas été réalisés. Voir le [§6](#6-manques-connus--non-traité) pour ce qui n'est explicitement pas couvert.

### 3.1 Éléments obligatoires (thématique RGAA 8)

- `index.html` déclare `lang="en"` (la langue réelle de l'interface) et un `<title>` descriptif.
- Chaque page de premier niveau affiche exactement un `<h1>` (le sien, ou hérité d'un layout qui en a déjà un) — voir [§4.3](#43-hiérarchie-des-titres).

### 3.2 Navigation (thématique 12)

- `MainLayout` affiche un **lien d'évitement** (« Skip to main content ») comme premier élément focusable, pointant vers `<main id="main-content">`. Il est masqué visuellement jusqu'à recevoir le focus clavier (`frontend/src/app/layouts/MainLayout.tsx` / `.module.css`).
- La navigation de la barre latérale (`AppSidebar`) est encapsulée dans `<nav aria-label="Main navigation">`.
- Chaque colonne du tableau kanban est une région (`role="region"`) nommée d'après son titre (« To Do column », etc.), pour permettre aux utilisateurs de lecteur d'écran de naviguer entre les colonnes.

### 3.3 Formulaires (thématique 11)

- Chaque champ de texte doit avoir un **label associé programmatiquement** — soit via `FormControl` / `FormControl.Label` de reshaped (voir `LoginPage.tsx`, `RegisterPage.tsx`, la modale de tâche dans `Board.tsx`), soit via un `<label htmlFor={id}>` natif couplé à un `id` généré par `useId()` (voir `ProjectForm.tsx`, `BoardForm.tsx`). Un `<Text>` placé visuellement au-dessus d'un champ n'est **pas** un label — un lecteur d'écran n'a aucun moyen de relier les deux.
- Les erreurs de validation/serveur sont liées à leur champ via `aria-describedby` et signalées avec `aria-invalid` + `role="alert"`, pas seulement par la couleur.
- Les groupes de boutons à choix exclusif (ex. les sélecteurs Priorité/Statut dans la modale de tâche) sont encapsulés dans `role="group"` avec un `aria-label`, et chaque bouton porte `aria-pressed` — l'état sélectionné n'est pas transmis uniquement par la couleur.
- `Select` de reshaped : toujours passer des enfants `<option>` natifs, jamais `Select.Option`. Avec `Select.Option`, reshaped affiche un bouton de liste déroulante personnalisé que ni `FormControl.Label` ni `inputAttributes` ne peuvent nommer (`inputAttributes` arrive sur un `<input>` caché) : un lecteur d'écran n'entend que la valeur sélectionnée. Avec `<option>`, il affiche un `<select>` natif correctement étiqueté.

### 3.4 Boîtes de dialogue (thématique 7 / 12)

- Chaque modale utilise `Modal.Title` de reshaped (pas un `<Text>` simple) pour son titre. `Modal.Title` s'enregistre pour que le `aria-labelledby` de la boîte de dialogue pointe vers lui — sans cela, un lecteur d'écran annonce une boîte de dialogue sans nom. Un `<Text>` stylé pour ressembler à un titre ne fait **pas** cela.
- Les boutons uniquement iconographiques (un bouton de fermeture `✕`, un simple `+`) portent toujours un `aria-label` explicite — leur glyphe visible n'est pas un nom accessible fiable.

> **Piège rencontré en corrigeant ceci** : donner à une modale un vrai `aria-labelledby` via `Modal.Title` peut rendre ambiguë une requête de test `getByRole("button", ...)` sans rapport. L'`Overlay` de reshaped (le fond de la modale) est lui-même `role="button"` sans label propre ; le calcul ARIA du « nom à partir du contenu » parcourt alors la boîte de dialogue, trouve *son* nom dérivé de `aria-labelledby`, et l'utilise aussi comme nom de l'overlay — le fond et le bouton de soumission peuvent donc se retrouver avec le même nom accessible. La correction se fait dans le test, pas dans le balisage : limiter la requête avec `within(screen.getByRole("dialog"))` plutôt que d'interroger tout le document. Voir `Board.test.tsx` pour un exemple.

### 3.5 Accès clavier et glisser-déposer (thématique 7 / WCAG 2.5.7)

Le glisser-déposer HTML5 natif (utilisé par le tableau kanban, via `react-dnd`) n'a **aucun équivalent clavier intégré** — un utilisateur à la souris uniquement ou sur dispositif de pointage alternatif ne peut pas glisser une carte entre les colonnes. Le critère WCAG 2.5.7 (« Mouvements de glisser ») exige qu'une interaction de glisser ait toujours une alternative sans glisser.

L'alternative de ce projet : chaque carte de tâche (`DraggableTaskCard`) est aussi un `role="button"`, focusable (`tabIndex={0}`), avec un gestionnaire `onKeyDown` pour <kbd>Entrée</kbd>/<kbd>Espace</kbd>, qui ouvre la même boîte de dialogue d'édition qu'un clic souris. Cette boîte de dialogue contient un sélecteur **Statut** (un groupe `role="group"` de boutons à bascule) qui permet à un utilisateur clavier de déplacer la tâche vers une autre colonne sans jamais glisser quoi que ce soit. Le glisser-déposer reste disponible pour les utilisateurs souris ; ce n'est pas l'unique chemin vers le même résultat.

Si une autre interaction de glisser-déposer est ajoutée ailleurs dans l'application, elle doit recevoir le même traitement : un élément focusable, un gestionnaire clavier, et un moyen sans glisser d'atteindre le même état final.

### 3.6 Contenu décoratif (thématique 1)

- Les icônes/émojis purement décoratifs (le tag 🏷️ de priorité, le glyphe 👤 d'assigné, les icônes SVG de navigation) sont encapsulés dans `<span aria-hidden="true">` ou portent directement `aria-hidden="true"`, pour qu'un lecteur d'écran n'annonce pas un nom de glyphe ambigu en plus du texte réel qui porte déjà l'information.
- Une icône qui constitue le *seul* contenu d'un élément interactif (un bouton, un lien) doit à la place recevoir un `aria-label` sur cet élément — masquer l'icône sans nommer le contrôle le rendrait muet.
- Pour donner aux lecteurs d'écran un texte non affiché à l'écran (ex. le badge de notifications non lues dans `AppSidebar`), utiliser la classe globale `.sr-only` (`frontend/src/styles/index.css`) et masquer la version purement visuelle avec `aria-hidden="true"`. Ne pas mettre d'`aria-label` sur un simple `<span>`/`<div>` : ARIA interdit de nommer les éléments génériques, et les lecteurs d'écran l'ignorent.

### 3.7 Visibilité du focus (thématique 10 / 12)

- Une règle globale `:focus-visible` (`frontend/src/styles/index.css`) dessine un contour visible sur tout élément recevant le focus clavier. Ne pas la surcharger avec `outline: none` sans fournir un remplacement tout aussi visible.

### 3.8 Couleurs (thématique 3) et palette daltonienne

- Les couleurs des tâches (priorité, urgence de l'échéance, statut de colonne) sont des variables CSS dans `frontend/src/styles/index.css` (`--task-*`, `--status-*`). Les utiliser plutôt que des valeurs hexadécimales en dur, pour que la palette daltonienne s'applique partout.
- La couleur n'est jamais le seul indice : chaque badge de priorité a un libellé et une forme (▼ faible, ● moyenne, ▲ haute), chaque badge d'échéance dit ce qu'il signifie (« Overdue · 28 Sep », « Due tomorrow »), et un badge en retard a en plus un contour plein. Chaque texte atteint 4.5:1 sur son fond teinté.
- **Profil > Accessibility** propose une palette *Colour-blind friendly* (teintes Okabe-Ito : bleu / jaune / rose, qui diffèrent aussi en luminosité) qui ajoute des motifs sur la bande de priorité des cartes. Elle pose `data-color-vision="colorblind"` sur `<html>` ; le choix est mémorisé par appareil (`localStorage`) et appliqué avant le premier rendu (`frontend/src/shared/preferences/colorVision.ts`).
- Les cartes interactives sont nommées « Open task … » et pointent `aria-describedby` vers leurs badges : les lecteurs d'écran annoncent toujours la priorité, l'échéance et l'assigné.

### 3.9 Animations (thématique 13)

La landing page (`/`, `frontend/src/features/landing/`) est animée.

- Les animations en boucle (la maquette de Kanban, le bandeau des technologies, le fond) peuvent être arrêtées avec le bouton **« Pause animations »** (`aria-pressed`), comme l'exige tout contenu en mouvement de plus de 5 secondes (RGAA 13.8 / WCAG 2.2.2).
- Avec `prefers-reduced-motion: reduce`, rien ne bouge : animations et apparitions au défilement sont désactivées et toutes les sections sont visibles d'emblée. Le bouton pause est alors masqué, puisqu'il n'y a rien à mettre en pause.
- Le contenu qui apparaît au défilement n'est masqué qu'une fois que JavaScript a pris le relais (`data-motion="on"`) : il ne reste jamais invisible si l'observer est indisponible.
- La maquette est décorative et `aria-hidden` : le texte autour dit la même chose.
- Rien ne clignote plus de 3 fois par seconde (RGAA 13.7).

---

## 4. Checklist pour toute nouvelle interface

Avant d'ouvrir une PR qui ajoute ou modifie une interface frontend, vérifier :

### 4.1 Formulaires

- [ ] Chaque champ a un label connecté via `FormControl.Label` ou `<label htmlFor>` — jamais un simple `<Text>`/`<span>` placé à côté du champ.
- [ ] Les erreurs de validation utilisent `aria-invalid` + `aria-describedby` + `role="alert"`, pas seulement la couleur.
- [ ] Un groupe de boutons à bascule/choix a `role="group"` + `aria-label`, et chaque option reflète son état via `aria-pressed` ou `aria-checked` — pas seulement le style visuel.

### 4.2 Éléments interactifs

- [ ] Chaque bouton/lien uniquement iconographique a un `aria-label` décrivant ce qu'il fait (« Close dialog », « Add task to {column} »), pas son apparence.
- [ ] Tout élément cliquable qui n'est pas un `<button>`/`<a>` natif (un `<div onClick>`) est aussi utilisable au clavier : `tabIndex={0}`, `role="button"` (ou un rôle plus précis), et un `onKeyDown` gérant <kbd>Entrée</kbd>/<kbd>Espace</kbd>.
- [ ] Toute interaction de glisser-déposer a une alternative sans glisser qui atteint le même résultat.

### 4.3 Hiérarchie des titres

- [ ] Chaque page de premier niveau a exactement un `<h1>` (reshaped : `<Text as="h1" ...>`), et aucun niveau n'est sauté (pas de `<h3>` directement sous un `<h1>` sans `<h2>` entre les deux, sauf raison réelle).
- [ ] Une nouvelle page sous `MainLayout` a besoin de son propre `<h1>` — le layout lui-même n'en fournit pas.

### 4.4 Boîtes de dialogue

- [ ] Utiliser `Modal.Title` (et `Modal.Subtitle` s'il y a un sous-titre), jamais un `<Text>` stylé simplement, pour que la boîte de dialogue ait un vrai nom accessible.
- [ ] Si un test doit ensuite distinguer un bouton dont le nom correspond au titre, limiter la requête avec `within(screen.getByRole("dialog"))` plutôt que d'interroger la racine du document (voir [§3.4](#34-boîtes-de-dialogue-thématique-7--12)).

### 4.5 Images et icônes

- [ ] Une icône/émoji décoratif à côté d'un texte qui dit déjà la même chose : `aria-hidden="true"`.
- [ ] Une icône qui est le *seul* contenu d'un contrôle : `aria-label` sur le contrôle.
- [ ] Un texte destiné uniquement aux lecteurs d'écran : `.sr-only`, jamais un `aria-label` sur un `<span>`/`<div>` sans rôle.
- [ ] Une image porteuse de sens (non décorative, non dupliquée par le texte adjacent) : un vrai `alt` qui la décrit.

### 4.6 Couleur et contraste

- [ ] Ne jamais utiliser la couleur comme seul moyen de transmettre un état (sélectionné/erreur/succès) — l'associer à du texte, une icône, ou un attribut d'état ARIA.
- [ ] En cas de nouvelle association de couleurs (nouvelle combinaison texte/fond), vérifier un contraste d'au moins 4.5:1 (texte normal) / 3:1 (grand texte) — par exemple avec le vérificateur de contraste des outils de développement du navigateur. L'audit automatisé ([§5](#5-audit-automatisé-et-pourquoi-il-ne-suffit-pas)) ne vérifie que les états par défaut : vérifier à la main les états survol/focus/désactivé.

---

## 5. Audit automatisé, et pourquoi il ne suffit pas

`frontend/e2e/accessibility.e2e.test.ts` lance axe-core (règles WCAG 2.1 A + AA) sur chaque page de l'application en fonctionnement, dans le vrai thème, avec des données de test qu'il crée lui-même : landing page, connexion, inscription, 404, 403, projets, détail d'un projet, tableau kanban, modale de tâche, mes tâches, notifications, profil. Les données de test couvrent toutes les priorités et tous les états d'échéance, et le tableau kanban et le profil sont audités une seconde fois avec la **palette daltonienne** (§3.8). La landing page est auditée avec les animations réduites, pour qu'axe voie la page stabilisée et non une image d'animation. Il vérifie aussi que le focus reste piégé dans la modale de tâche et revient sur la carte à sa fermeture.

```bash
# backend (API + Postgres) démarré, puis depuis frontend/
npx playwright test e2e/accessibility.e2e.test.ts
# affiche aussi ce qui demande un œil humain : l'arbre d'accessibilité de
# chaque page et une mesure du contraste au pixel pour le texte sur dégradé
A11Y_REPORT=1 npx playwright test e2e/accessibility.e2e.test.ts
```

À lancer avant d'ouvrir une PR qui touche à l'interface. Une nouvelle page doit y avoir son propre test.

Les outils automatisés détectent une part significative des critères RGAA/WCAG — labels manquants, `alt` manquant, ARIA invalide, contraste — mais ils ne peuvent pas tout détecter de cette checklist : si une alternative clavier à un geste de glisser atteint réellement le même résultat, si une hiérarchie de titres a du sens, si un `aria-label` décrit la bonne chose. L'outillage automatisé est un plancher, pas un substitut à la checklist ci-dessus.

---

## 6. Manques connus / non traité

Pour être explicite, afin que personne ne confonde « une passe a été faite » avec « ceci est certifié RGAA » :

- **Le contraste des couleurs** de l'état par défaut de chaque page est vérifié par l'audit automatisé ([§5](#5-audit-automatisé-et-pourquoi-il-ne-suffit-pas)), y compris le texte sur dégradé. Non couverts : les états survol, focus et désactivé, les états d'erreur que le test ne déclenche pas, et le tableau de bord admin (l'audit n'a pas d'utilisateur admin).
- **Redimensionnement et zoom** : les mises en page ont été vérifiées à 390 px de large, pas à 320 px ni à 200 % / 400 % de zoom (RGAA 10.11 / WCAG 1.4.10), et la modification de l'espacement du texte (RGAA 10.12 / WCAG 1.4.12) n'a pas été testée.
- **Aucune déclaration d'accessibilité n'est publiée** dans l'application. Un brouillon rempli avec l'état réel du projet est dans [ACCESSIBILITY_STATEMENT.fr.md](ACCESSIBILITY_STATEMENT.fr.md) ; le publier demande un audit complet pour calculer un taux de conformité.
- **Aucune campagne de test avec lecteur d'écran** (NVDA, JAWS, VoiceOver) n'a été menée. L'arbre d'accessibilité exposé par chaque page a été relu, mais personne n'a écouté le rendu réel.
- **L'audit automatisé ne tourne pas en CI** : les tests e2e ont besoin du backend et d'une base de données, que les workflows de CI ne démarrent pas encore.
- **Défauts connus de reshaped** (code de la bibliothèque, non corrigeable depuis le nôtre ; à signaler en amont) :
  - Le fond des modales (`Overlay`) impose `role="button"` autour de toute la boîte de dialogue : un lecteur d'écran peut annoncer un bouton qui englobe la modale (axe `nested-interactive` ; l'audit ignore uniquement ce nœud précis).
  - `FormControl.Helper` pose toujours `role="alert"` : un texte d'aide statique (ex. l'indication sous l'email de la page profil) peut être annoncé comme une alerte quand il réapparaît.
  - `Modal.Title` rend un `<h6>`, ce qui saute des niveaux de titre dans les modales.
- **`frontend/src/app/legacy/**`** et **`backend/src/legacy/**`** sont explicitement hors périmètre (même exclusion que la porte de qualité et SonarQube — voir `docs/quality-gate.md`) : le code legacy pré-migration n'est pas touché pour ce chantier.
- Les tableaux du tableau de bord admin et de la page « My Tasks » sont simples (pas de cellules fusionnées, une seule ligne d'en-tête, des `<th>`). Chacun porte le nom de son projet via `aria-labelledby` (RGAA 5.4), posé par `shared/utils/labelTable.ts` : le `Table` de reshaped ne transmet pas d'attributs à son `<table>`, et un enfant `<caption>` casse sa détection du `<thead>`/`<tbody>`. Réutiliser cet utilitaire pour tout nouveau tableau.
- Ce document lui-même n'a fait l'objet d'aucune relecture juridique/conformité — à considérer comme un guide d'ingénierie, pas un livrable de certification.
