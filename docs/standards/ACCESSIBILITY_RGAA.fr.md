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
- [ ] En cas de nouvelle association de couleurs (nouvelle combinaison texte/fond), vérifier un contraste d'au moins 4.5:1 (texte normal) / 3:1 (grand texte) — par exemple avec le vérificateur de contraste des outils de développement du navigateur. Ce projet n'a pas fait l'objet d'un audit de contraste complet (voir [§6](#6-manques-connus--non-traité)) ; ne pas supposer qu'une association existante est déjà vérifiée.

---

## 5. Pourquoi ne pas simplement tout automatiser avec un linter ?

Les outils automatisés (axe-core, Lighthouse, eslint-plugin-jsx-a11y) détectent une part significative des critères RGAA/WCAG — labels manquants, `alt` manquant, ARIA invalide — et méritent d'être ajoutés à la CI comme amélioration future (voir [§6](#6-manques-connus--non-traité)). Ils ne peuvent pas tout détecter de cette checklist : si une alternative clavier à un geste de glisser atteint réellement le même résultat, si une hiérarchie de titres a du sens, si un `aria-label` décrit la bonne chose. L'outillage automatisé est un plancher, pas un substitut à la checklist ci-dessus.

---

## 6. Manques connus / non traité

Pour être explicite, afin que personne ne confonde « une passe a été faite » avec « ceci est certifié RGAA » :

- **Aucun audit de contraste des couleurs** n'a été réalisé sur le thème réellement affiché (reshaped `slate`, mode sombre). Les associations devraient être vérifiées ponctuellement avec un outil de contraste avant d'être considérées comme fiables au niveau AA.
- **Aucune campagne de test avec lecteur d'écran** (NVDA, JAWS, VoiceOver) n'a été menée — les corrections ici s'appuient sur un usage correct d'ARIA/HTML sémantique, pas sur une écoute réelle du rendu.
- **Aucun linting d'accessibilité automatisé en CI** (axe-core, `eslint-plugin-jsx-a11y`, Lighthouse CI) — ce serait la prochaine étape naturelle pour éviter les régressions sur les futures PR.
- **`frontend/src/app/legacy/**`** et **`backend/src/legacy/**`** sont explicitement hors périmètre (même exclusion que la porte de qualité et SonarQube — voir `docs/quality-gate.md`) : le code legacy pré-migration n'est pas touché pour ce chantier.
- Les tableaux du tableau de bord admin et de la page « My Tasks » (`Table`/`Table.Row`) n'ont pas été individuellement réaudités pour la sémantique des tableaux complexes (`scope`, `<caption>`) — ils sont assez simples (pas de cellules fusionnées, une seule ligne d'en-tête) pour que la sémantique de base suffise probablement, mais cela n'a pas été explicitement vérifié au regard des critères RGAA sur les tableaux.
- Ce document lui-même n'a fait l'objet d'aucune relecture juridique/conformité — à considérer comme un guide d'ingénierie, pas un livrable de certification.
