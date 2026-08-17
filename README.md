# TRIZ Visual Analysis App

TRIZ Visual Analysis App is a mobile-first tool for turning real-world product or engineering problems into structured TRIZ analysis maps.

The product focuses on a simple workflow:

```text
Problem -> System Model -> Contradiction -> TRIZ Principle -> Solution Hypothesis -> Visual Map
```

## Product Goals

- Capture product, engineering, or innovation problems as analysis cases.
- Guide users through TRIZ concepts with clear templates.
- Generate visual theory maps that explain the reasoning path.
- Keep the UI clean, lightweight, and easy to understand.

## MVP Scope

- Create and save TRIZ analysis cases.
- Edit problem description, goal, constraints, and system context.
- Model technical and physical contradictions.
- Browse and select TRIZ inventive principles.
- Generate a basic analysis graph.
- Export a Markdown analysis report.

## Documentation

- [Product Requirements](docs/TRIZ_VISUAL_ANALYSIS_APP_PRD.md)
- [Roadmap](docs/ROADMAP.md)

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## V2 Status

V2 implements a local TRIZ contradiction analysis workspace:

- Chinese mobile-first interface
- Create, edit, delete, and search analysis cases
- Local browser storage
- Analysis progress stages
- Technical and physical contradiction modeling
- Improving/worsening parameter selection
- Rule-based inventive principle recommendations
- Problem-to-solution visual analysis map

## Version Notes

V1 started as a local TRIZ case inbox.

V2 turns the inbox into a usable analysis workflow:

- capture the case,
- identify the contradiction,
- select inventive principles,
- draft a solution hypothesis,
- review the theory map.
