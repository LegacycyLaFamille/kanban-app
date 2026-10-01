# Déclaration d'accessibilité — BROUILLON

> **Brouillon, non publié.** Ce document suit la structure du
> [modèle officiel de déclaration d'accessibilité RGAA 4.1](https://accessibilite.numerique.gouv.fr/obligations/declaration-accessibilite/).
> Il décrit l'état réel du projet au 2026-10-01. Les champs `[À compléter]`
> doivent être remplis avant toute publication. Ce projet est un exercice
> scolaire : il n'est pas soumis à l'obligation légale (voir
> [ACCESSIBILITY_RGAA.fr.md](ACCESSIBILITY_RGAA.fr.md#2-quest-ce-que-le-rgaa)),
> la déclaration est rédigée par bonne pratique.

[À compléter : nom de l'entité] s'engage à rendre ses sites internet,
intranet, extranet et ses progiciels accessibles conformément à
l'article 47 de la loi n° 2005-102 du 11 février 2005.

Cette déclaration d'accessibilité s'applique à **Kanban App**
([À compléter : URL de production]).

## État de conformité

**Kanban App est non conforme** avec le RGAA 4.1.

Aucun audit de conformité complet (les 106 critères, sur un échantillon de
pages) n'a encore été réalisé. Sans résultats d'audit en cours de validité,
le RGAA impose de déclarer le site non conforme, même si une démarche
d'accessibilité est en place (voir ci-dessous).

## Résultats des tests

Pas encore d'audit complet, donc pas de taux de conformité.

Ce qui a été fait (détail dans [ACCESSIBILITY_RGAA.fr.md](ACCESSIBILITY_RGAA.fr.md)) :

- audit automatisé axe-core (règles WCAG 2.1 A et AA) sur toutes les pages,
  y compris avec la palette daltonienne : aucune violation au 2026-10-01 ;
- revue du code selon la checklist RGAA du projet (formulaires, titres,
  modales, clavier, alternatives au glisser-déposer, couleurs, animations).

## Contenus non accessibles

### Non-conformités connues

- Le fond des boîtes de dialogue (composant `Overlay` de la bibliothèque
  Reshaped) porte un `role="button"` qui englobe la boîte de dialogue
  (critère 7.1).
- Le titre des boîtes de dialogue est un `<h6>`, ce qui saute des niveaux de
  titre (critère 9.1).
- Les textes d'aide de formulaire (composant `FormControl.Helper` de
  Reshaped) portent `role="alert"` et peuvent être annoncés comme des
  alertes (critère 7.5).

### Points non vérifiés

- Restitution par les lecteurs d'écran (NVDA, JAWS, VoiceOver).
- Affichage à 320 px de large et zoom à 200 % / 400 % (critère 10.11),
  modification de l'espacement du texte (critère 10.12).
- Contrastes des états survol, focus et désactivé (critère 3.2).
- Tableau de bord administrateur.

### Contenus non soumis à l'obligation d'accessibilité

- L'ancienne application TodoList, accessible sur `/legacy`, conservée le
  temps de sa dépréciation et exclue de la démarche.

## Établissement de cette déclaration

Cette déclaration a été établie le [À compléter : date de publication].

### Technologies utilisées

HTML5, CSS, JavaScript (React, TypeScript), WAI-ARIA.

### Environnement de test

Audit automatisé avec Microsoft Edge et Chromium (Playwright). Aucun test
avec lecteur d'écran à ce jour.

### Outils utilisés pour vérifier l'accessibilité

- axe-core via `@axe-core/playwright` (`frontend/e2e/accessibility.e2e.test.ts`)
- Arbre d'accessibilité de Playwright (`A11Y_REPORT=1`)
- Mesure de contraste au pixel pour le texte sur dégradé (même test)

### Pages du site ayant fait l'objet de la vérification

Accueil (`/`), connexion, inscription, page 403, page 404, liste des
projets, détail d'un projet, tableau Kanban, fenêtre d'édition d'une tâche,
mes tâches, notifications, profil.

## Aménagements proposés

- Palette adaptée aux daltoniens : Profil → Accessibility.
- Bouton « Pause animations » sur la page d'accueil, et aucune animation si
  le système demande moins de mouvement (`prefers-reduced-motion`).
- Toute action de glisser-déposer du Kanban est aussi faisable au clavier
  (Entrée sur une carte, puis choix du statut).

## Retour d'information et contact

Si vous n'arrivez pas à accéder à un contenu ou à un service, contactez
[À compléter : adresse e-mail ou formulaire de contact] pour être orienté
vers une alternative accessible ou obtenir le contenu sous une autre forme.

## Voies de recours

Si vous avez signalé un défaut d'accessibilité qui vous empêche d'accéder à
un contenu ou à un service et que vous n'avez pas obtenu de réponse
satisfaisante, vous pouvez :

- écrire un message au [Défenseur des droits](https://formulaire.defenseurdesdroits.fr/) ;
- contacter [le délégué du Défenseur des droits dans votre région](https://www.defenseurdesdroits.fr/saisir/delegues) ;
- envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) :
  Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07.

## Avant de publier

1. Faire réaliser un audit complet sur un échantillon représentatif de pages
   et remplacer les sections « État de conformité » et « Résultats des
   tests » par le taux obtenu.
2. Remplir les champs `[À compléter]`.
3. Publier la déclaration dans l'application et ajouter en pied de la page
   d'accueil la mention « Accessibilité : non / partiellement / totalement
   conforme » avec un lien vers elle.
4. Mettre à jour la déclaration à chaque nouvel audit.
