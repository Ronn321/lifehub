# Recipes Domain Overview

## Purpose

Die Recipes-Domain ist das **zentrale Rezept-Management-System** des LifeHub-Ökosystems. Sie dient als:

- **Backend für MorphCook** — Standardisierte JSON-API zur Versorgung der MorphCook-Flutter-App mit Rezeptdaten
- **Import-Pipeline** — Automatischer Import externer Rezepte (Chefkoch, generische HTML-Seiten, MorphCook-Export)
- **Management-UI** — Web-basierte Verwaltung, Suche und Kuratierung von Rezepten
- **Koch-Plattform** — Cook Mode, Meal Planning, Shopping List direkt im Browser

## Core Objectives

### 1. Vollständige Import-Pipeline
- Automatischer Import von Chefkoch-Rezepten per URL
- 9-stufige Pipeline: URL-Erkennung → HTML-Download → DOM/JSON-LD-Extraktion → Normalisierung → Ingredient-Mapping → Ontology-Mapping → Validierung → Draft
- Modulare Adapter-Architektur für zukünftige Quellen

### 2. MorphCook-kompatibles Datenmodell
- Explizite Rezept-Varianten unter Dish-Konzepten
- contains_flags + attributes + ontology_tags
- Multilinguale Textfelder (DE + EN)
- Deterministisch, keine Runtime-KI

### 3. NAS-Centric Architecture
- Läuft im LifeHub-Docker-Stack auf dem NAS
- PostgreSQL als zentrale Datenquelle
- Traefik für HTTPS + Tailscale für sicheren Remote-Zugriff

### 4. PWA-Offline-Fähigkeit
- Service Worker für App-Shell-Caching
- IndexedDB für lokale Rezeptspeicherung
- Cook Mode funktioniert offline

## System Boundaries

### Im Scope
- Rezept-Speicherung (PostgreSQL) + Verwaltung (NestJS API)
- Rezept-Import (Chefkoch + generische Quellen)
- Rezept-Suche (PostgreSQL Full-Text-Search)
- Matching-Engine (deterministisch, dietary-filtered)
- Variantensystem (explizite Varianten unter Dishes)
- Meal Planning (Wochenraster)
- Shopping List (Aggregation aus Rezepten)
- Dietary-Profile (avoid_flags, calorie_target, etc.)
- MorphCook-Sync (Export/Import JSON)
- Cook Mode (Web-UI)
- Ontology-Management (Flags, Ingredients-Tree)

### Out of Scope (v1)
- Native Mobile App (→ MorphCook)
- Real-time Multi-User-Kollaboration
- Social Features
- AI-Runtime-Inference

## Domain Entities (Hoch-Level)
- **Recipe** — Atomare Kocheinheit mit Zutaten + Schritten + Nährwerten
- **Dish** — Konzeptuelle Gruppierung von Rezept-Varianten ("Döner" → Classic, Vegan, Keto)
- **Variant** — Explizite Rezept-Variante, kein Overlay/Substitution
- **IngredientOntology** — Hierarchische Zutaten-Taxonomie
- **OntologyFlag** — Flag-Taxonomie (contains_flags, attributes, compound_flags)
- **DietaryProfile** — User-Einstellungen für Matching/Suche
- **MealPlan** — Wochen-Kalender-Zuweisung
- **ShoppingList** — Aggregierte Zutaten aus Rezepten
- **ImportJob** — Async-Import-Draft mit Status-Tracking

## Design-Prinzipien

| Prinzip | Bedeutung |
|---|---|
| **Deterministisch** | Matching, Suche, Import — keine Runtime-KI, keine Zufallslogik |
| **Explizit** | Varianten sind vollständige Rezepte, keine abgeleiteten Substitutionen |
| **Additiv** | Ontology wird nur erweitert, nie geändert oder gelöscht |
| **Schichten-Trennung** | Controller → Service → Repository → DB. Nie überspringen. |
| **Modular** | Import-Adapter, Normalisierer — jedes Teil austauschbar |
| **Offline-fähig** | Cook Mode + gespeicherte Rezepte im Browser offline nutzbar |

## Beziehung zu MorphCook

| Aspekt | LifeHub Recipes | MorphCook |
|---|---|---|
| Rolle | Backend + Management-System | Mobile App (Consumption) |
| Plattform | Web (NestJS + Next.js) | iOS + Android (Flutter) |
| Storage | PostgreSQL | Hive (lokal) |
| Import | HTML-Parsing (Chefkoch etc.) | JSON-Import von LifeHub |
| Matching | Server-seitig (API) | App-seitig (Pure Function) |
| Cook Mode | Web-UI (PWA) | Native UI |
| Offline | Service Worker + IndexedDB | Vollständig offline-native |

## Beziehung zum LifeHub-Gesamtsystem
- Recipes-Domain ist ein Bounded Context im LifeHub DDD-Modell
- Nutzt `shared/auth`, `shared/permissions`, `shared/audit`, `shared/events`
- Verknüpft mit `shopping`-Domain (Einkaufslisten-Generierung)
- Verknüpft mit `media`-Domain (Rezept-Bilder)
- Nutzt `public.tags` für Tagging

> **Stand:** Juli 2026  
> **Referenz:** `recipes_lifehub_architecture.md` für die vollständige technische Architektur