# curl transcript — Verdant mock API

Recorded 2026-08-28T19:51:21Z against `node server.mjs` on 127.0.0.1:4800. Each block: the command, then `HTTP <status>` and the body as returned. Boot line: `verdant api on http://127.0.0.1:4800 · today=2026-07-15 · 6 plants, 12 tasks, 12 readings · fixtures validated against pack/contracts`.

## 1. Scenario constants (demo-notice text, fictional today)

```
$ curl -s http://127.0.0.1:4800/api/scenario
{
  "scenario": "verdant",
  "today": "2026-07-15",
  "fictionalNotice": "Verdant is a fictional product, invented for this demonstration. No real company, users, or data are involved."
}
HTTP 200
```

## 2. My plants — GET /api/plants

```
$ curl -s http://127.0.0.1:4800/api/plants
[
  {
    "id": "plant-01",
    "name": "Monstera",
    "species": "Monstera deliciosa",
    "location": "living room",
    "acquired": "2025-03-14",
    "wateringIntervalDays": 7,
    "lastWatered": "2026-07-08",
    "lastFertilized": "2026-06-20",
    "health": "thriving",
    "notes": "New leaf unfurling near the moss pole.",
    "status": "due"
  },
  {
    "id": "plant-02",
    "name": "Snake plant",
    "species": "Dracaena trifasciata",
    "location": "bedroom",
    "acquired": "2024-11-02",
    "wateringIntervalDays": 14,
    "lastWatered": "2026-07-06",
    "lastFertilized": "2026-05-30",
    "health": "stable",
    "notes": "Tolerates the dim corner; water sparingly.",
    "status": "ok"
  },
  {
    "id": "plant-03",
    "name": "Fiddle-leaf fig",
    "species": "Ficus lyrata",
    "location": "living room",
    "acquired": "2025-12-02",
    "wateringIntervalDays": 7,
    "lastWatered": "2026-07-05",
    "lastFertilized": "2026-06-12",
    "health": "struggling",
    "notes": "Dropped two leaves after the move away from the window.",
    "status": "overdue"
  },
  {
    "id": "plant-04",
    "name": "Pothos",
    "species": "Epipremnum aureum",
    "location": "kitchen",
    "acquired": "2025-08-21",
    "wateringIntervalDays": 5,
    "lastWatered": "2026-07-11",
    "lastFertilized": "2026-06-28",
    "health": "thriving",
    "notes": "Trailing over the shelf edge; trim in August.",
    "status": "ok"
  },
  {
    "id": "plant-05",
    "name": "Peace lily",
    "species": "Spathiphyllum wallisii",
    "location": "office",
    "acquired": "2026-01-09",
    "wateringIntervalDays": 4,
    "lastWatered": "2026-07-10",
    "lastFertilized": "2026-06-15",
    "health": "struggling",
    "notes": "Wilts fast when dry; brown tips from tap water.",
    "status": "overdue"
  },
  {
    "id": "plant-06",
    "name": "Rubber plant",
    "species": "Ficus elastica",
    "location": "hallway",
    "acquired": "2025-05-30",
    "wateringIntervalDays": 10,
    "lastWatered": "2026-07-09",
    "lastFertilized": "2026-06-01",
    "health": "stable",
    "notes": "Root-bound; a bigger pot is on the list.",
    "status": "ok"
  }
]
HTTP 200
```

## 3. Plant detail — GET /api/plants/plant-03 (the pack's sample record)

```
$ curl -s http://127.0.0.1:4800/api/plants/plant-03
{
  "id": "plant-03",
  "name": "Fiddle-leaf fig",
  "species": "Ficus lyrata",
  "location": "living room",
  "acquired": "2025-12-02",
  "wateringIntervalDays": 7,
  "lastWatered": "2026-07-05",
  "lastFertilized": "2026-06-12",
  "health": "struggling",
  "notes": "Dropped two leaves after the move away from the window.",
  "status": "overdue"
}
HTTP 200
```

## 4. Unknown plant — 404

```
$ curl -s http://127.0.0.1:4800/api/plants/plant-99
{
  "error": {
    "code": "not_found",
    "message": "no plant plant-99"
  }
}
HTTP 404
```

## 5. A plant's tasks — GET /api/plants/plant-03/tasks

```
$ curl -s http://127.0.0.1:4800/api/plants/plant-03/tasks
[
  {
    "id": "task-03",
    "plantId": "plant-03",
    "plantName": "Fiddle-leaf fig",
    "type": "water",
    "due": "2026-07-12",
    "done": false,
    "status": "overdue"
  },
  {
    "id": "task-04",
    "plantId": "plant-03",
    "plantName": "Fiddle-leaf fig",
    "type": "inspect",
    "due": "2026-07-15",
    "done": false,
    "status": "due"
  },
  {
    "id": "task-11",
    "plantId": "plant-03",
    "plantName": "Fiddle-leaf fig",
    "type": "water",
    "due": "2026-07-05",
    "done": true,
    "status": "ok"
  }
]
HTTP 200
```

## 6. A plant's readings — GET /api/plants/plant-03/readings (stat-tile pair)

```
$ curl -s http://127.0.0.1:4800/api/plants/plant-03/readings
[
  {
    "id": "read-03",
    "plantId": "plant-03",
    "kind": "moisture",
    "value": 22,
    "unit": "%",
    "label": "Moisture"
  },
  {
    "id": "read-04",
    "plantId": "plant-03",
    "kind": "light",
    "value": 310,
    "unit": "lx",
    "label": "Light"
  }
]
HTTP 200
```

## 7. Open tasks — GET /api/tasks?done=false

```
$ curl -s http://127.0.0.1:4800/api/tasks\?done=false
[
  {
    "id": "task-03",
    "plantId": "plant-03",
    "plantName": "Fiddle-leaf fig",
    "type": "water",
    "due": "2026-07-12",
    "done": false,
    "status": "overdue"
  },
  {
    "id": "task-06",
    "plantId": "plant-05",
    "plantName": "Peace lily",
    "type": "water",
    "due": "2026-07-14",
    "done": false,
    "status": "overdue"
  },
  {
    "id": "task-01",
    "plantId": "plant-01",
    "plantName": "Monstera",
    "type": "water",
    "due": "2026-07-15",
    "done": false,
    "status": "due"
  },
  {
    "id": "task-04",
    "plantId": "plant-03",
    "plantName": "Fiddle-leaf fig",
    "type": "inspect",
    "due": "2026-07-15",
    "done": false,
    "status": "due"
  },
  {
    "id": "task-07",
    "plantId": "plant-05",
    "plantName": "Peace lily",
    "type": "fertilise",
    "due": "2026-07-15",
    "done": false,
    "status": "due"
  },
  {
    "id": "task-05",
    "plantId": "plant-04",
    "plantName": "Pothos",
    "type": "water",
    "due": "2026-07-16",
    "done": false,
    "status": "ok"
  },
  {
    "id": "task-09",
    "plantId": "plant-06",
    "plantName": "Rubber plant",
    "type": "water",
    "due": "2026-07-19",
    "done": false,
    "status": "ok"
  },
  {
    "id": "task-02",
    "plantId": "plant-02",
    "plantName": "Snake plant",
    "type": "water",
    "due": "2026-07-20",
    "done": false,
    "status": "ok"
  },
  {
    "id": "task-08",
    "plantId": "plant-06",
    "plantName": "Rubber plant",
    "type": "repot",
    "due": "2026-07-25",
    "done": false,
    "status": "ok"
  },
  {
    "id": "task-12",
    "plantId": "plant-01",
    "plantName": "Monstera",
    "type": "fertilise",
    "due": "2026-08-10",
    "done": false,
    "status": "ok"
  }
]
HTTP 200
```

## 8. One task — GET /api/tasks/task-03 (the pack's sample record)

```
$ curl -s http://127.0.0.1:4800/api/tasks/task-03
{
  "id": "task-03",
  "plantId": "plant-03",
  "plantName": "Fiddle-leaf fig",
  "type": "water",
  "due": "2026-07-12",
  "done": false,
  "status": "overdue"
}
HTTP 200
```

## 9. Readings filtered — GET /api/readings?kind=moisture

```
$ curl -s http://127.0.0.1:4800/api/readings\?kind=moisture
[
  {
    "id": "read-01",
    "plantId": "plant-01",
    "kind": "moisture",
    "value": 41,
    "unit": "%",
    "label": "Moisture"
  },
  {
    "id": "read-03",
    "plantId": "plant-03",
    "kind": "moisture",
    "value": 22,
    "unit": "%",
    "label": "Moisture"
  },
  {
    "id": "read-05",
    "plantId": "plant-02",
    "kind": "moisture",
    "value": 18,
    "unit": "%",
    "label": "Moisture"
  },
  {
    "id": "read-07",
    "plantId": "plant-04",
    "kind": "moisture",
    "value": 47,
    "unit": "%",
    "label": "Moisture"
  },
  {
    "id": "read-09",
    "plantId": "plant-05",
    "kind": "moisture",
    "value": 29,
    "unit": "%",
    "label": "Moisture"
  },
  {
    "id": "read-11",
    "plantId": "plant-06",
    "kind": "moisture",
    "value": 38,
    "unit": "%",
    "label": "Moisture"
  }
]
HTTP 200
```

## 10. Today screen — GET /api/today

```
$ curl -s http://127.0.0.1:4800/api/today
{
  "today": "2026-07-15",
  "featuredPlantId": "plant-03",
  "featuredPlant": {
    "id": "plant-03",
    "name": "Fiddle-leaf fig",
    "species": "Ficus lyrata",
    "location": "living room",
    "acquired": "2025-12-02",
    "wateringIntervalDays": 7,
    "lastWatered": "2026-07-05",
    "lastFertilized": "2026-06-12",
    "health": "struggling",
    "notes": "Dropped two leaves after the move away from the window.",
    "status": "overdue"
  },
  "readings": [
    {
      "id": "read-03",
      "plantId": "plant-03",
      "kind": "moisture",
      "value": 22,
      "unit": "%",
      "label": "Moisture"
    },
    {
      "id": "read-04",
      "plantId": "plant-03",
      "kind": "light",
      "value": 310,
      "unit": "lx",
      "label": "Light"
    }
  ],
  "tasks": [
    {
      "id": "task-03",
      "plantId": "plant-03",
      "plantName": "Fiddle-leaf fig",
      "type": "water",
      "due": "2026-07-12",
      "done": false,
      "status": "overdue"
    },
    {
      "id": "task-06",
      "plantId": "plant-05",
      "plantName": "Peace lily",
      "type": "water",
      "due": "2026-07-14",
      "done": false,
      "status": "overdue"
    },
    {
      "id": "task-01",
      "plantId": "plant-01",
      "plantName": "Monstera",
      "type": "water",
      "due": "2026-07-15",
      "done": false,
      "status": "due"
    },
    {
      "id": "task-04",
      "plantId": "plant-03",
      "plantName": "Fiddle-leaf fig",
      "type": "inspect",
      "due": "2026-07-15",
      "done": false,
      "status": "due"
    },
    {
      "id": "task-07",
      "plantId": "plant-05",
      "plantName": "Peace lily",
      "type": "fertilise",
      "due": "2026-07-15",
      "done": false,
      "status": "due"
    },
    {
      "id": "task-05",
      "plantId": "plant-04",
      "plantName": "Pothos",
      "type": "water",
      "due": "2026-07-16",
      "done": false,
      "status": "ok"
    },
    {
      "id": "task-09",
      "plantId": "plant-06",
      "plantName": "Rubber plant",
      "type": "water",
      "due": "2026-07-19",
      "done": false,
      "status": "ok"
    },
    {
      "id": "task-02",
      "plantId": "plant-02",
      "plantName": "Snake plant",
      "type": "water",
      "due": "2026-07-20",
      "done": false,
      "status": "ok"
    }
  ]
}
HTTP 200
```

## 11. Log care, malformed body — 400

```
$ curl -s -X POST -H content-type:\ application/json -d \{\"taskIds\":\[\]\} http://127.0.0.1:4800/api/care-log
{
  "error": {
    "code": "bad_request",
    "message": "body must be { taskIds: string[] } with at least one id"
  }
}
HTTP 400
```

## 12. Log care, wrong media type — 415

```
$ curl -s -X POST -d taskIds=task-03 http://127.0.0.1:4800/api/care-log
{
  "error": {
    "code": "unsupported_media_type",
    "message": "send application/json"
  }
}
HTTP 415
```

## 13. Log care, unknown id — 422, batch rejected

```
$ curl -s -X POST -H content-type:\ application/json -d \{\"taskIds\":\[\"task-03\",\"task-77\"\]\} http://127.0.0.1:4800/api/care-log
{
  "error": {
    "code": "unprocessable",
    "message": "batch rejected; nothing was logged",
    "problems": [
      {
        "id": "task-77",
        "reason": "unknown task"
      }
    ]
  }
}
HTTP 422
```

## 14. Log care — POST /api/care-log (water plant-03, fertilise plant-05)

```
$ curl -s -X POST -H content-type:\ application/json -d \{\"taskIds\":\[\"task-03\",\"task-07\"\]\} http://127.0.0.1:4800/api/care-log
{
  "loggedAt": "2026-07-15",
  "logged": [
    {
      "id": "task-03",
      "plantId": "plant-03",
      "plantName": "Fiddle-leaf fig",
      "type": "water",
      "due": "2026-07-12",
      "done": true,
      "status": "ok"
    },
    {
      "id": "task-07",
      "plantId": "plant-05",
      "plantName": "Peace lily",
      "type": "fertilise",
      "due": "2026-07-15",
      "done": true,
      "status": "ok"
    }
  ],
  "created": [
    {
      "id": "task-13",
      "plantId": "plant-03",
      "plantName": "Fiddle-leaf fig",
      "type": "water",
      "due": "2026-07-22",
      "done": false,
      "status": "ok"
    }
  ],
  "plants": [
    {
      "id": "plant-03",
      "name": "Fiddle-leaf fig",
      "species": "Ficus lyrata",
      "location": "living room",
      "acquired": "2025-12-02",
      "wateringIntervalDays": 7,
      "lastWatered": "2026-07-15",
      "lastFertilized": "2026-06-12",
      "health": "struggling",
      "notes": "Dropped two leaves after the move away from the window.",
      "status": "due"
    },
    {
      "id": "plant-05",
      "name": "Peace lily",
      "species": "Spathiphyllum wallisii",
      "location": "office",
      "acquired": "2026-01-09",
      "wateringIntervalDays": 4,
      "lastWatered": "2026-07-10",
      "lastFertilized": "2026-07-15",
      "health": "struggling",
      "notes": "Wilts fast when dry; brown tips from tap water.",
      "status": "overdue"
    }
  ]
}
HTTP 200
```

## 15. Plant after logging — lastWatered moved, status recomputed

```
$ curl -s http://127.0.0.1:4800/api/plants/plant-03
{
  "id": "plant-03",
  "name": "Fiddle-leaf fig",
  "species": "Ficus lyrata",
  "location": "living room",
  "acquired": "2025-12-02",
  "wateringIntervalDays": 7,
  "lastWatered": "2026-07-15",
  "lastFertilized": "2026-06-12",
  "health": "struggling",
  "notes": "Dropped two leaves after the move away from the window.",
  "status": "due"
}
HTTP 200
```

## 16. Today after logging — featured plant changes, new water task scheduled

```
$ curl -s http://127.0.0.1:4800/api/today
{
  "today": "2026-07-15",
  "featuredPlantId": "plant-05",
  "featuredPlant": {
    "id": "plant-05",
    "name": "Peace lily",
    "species": "Spathiphyllum wallisii",
    "location": "office",
    "acquired": "2026-01-09",
    "wateringIntervalDays": 4,
    "lastWatered": "2026-07-10",
    "lastFertilized": "2026-07-15",
    "health": "struggling",
    "notes": "Wilts fast when dry; brown tips from tap water.",
    "status": "overdue"
  },
  "readings": [
    {
      "id": "read-09",
      "plantId": "plant-05",
      "kind": "moisture",
      "value": 29,
      "unit": "%",
      "label": "Moisture"
    },
    {
      "id": "read-10",
      "plantId": "plant-05",
      "kind": "light",
      "value": 260,
      "unit": "lx",
      "label": "Light"
    }
  ],
  "tasks": [
    {
      "id": "task-06",
      "plantId": "plant-05",
      "plantName": "Peace lily",
      "type": "water",
      "due": "2026-07-14",
      "done": false,
      "status": "overdue"
    },
    {
      "id": "task-01",
      "plantId": "plant-01",
      "plantName": "Monstera",
      "type": "water",
      "due": "2026-07-15",
      "done": false,
      "status": "due"
    },
    {
      "id": "task-04",
      "plantId": "plant-03",
      "plantName": "Fiddle-leaf fig",
      "type": "inspect",
      "due": "2026-07-15",
      "done": false,
      "status": "due"
    },
    {
      "id": "task-05",
      "plantId": "plant-04",
      "plantName": "Pothos",
      "type": "water",
      "due": "2026-07-16",
      "done": false,
      "status": "ok"
    },
    {
      "id": "task-09",
      "plantId": "plant-06",
      "plantName": "Rubber plant",
      "type": "water",
      "due": "2026-07-19",
      "done": false,
      "status": "ok"
    },
    {
      "id": "task-02",
      "plantId": "plant-02",
      "plantName": "Snake plant",
      "type": "water",
      "due": "2026-07-20",
      "done": false,
      "status": "ok"
    },
    {
      "id": "task-13",
      "plantId": "plant-03",
      "plantName": "Fiddle-leaf fig",
      "type": "water",
      "due": "2026-07-22",
      "done": false,
      "status": "ok"
    }
  ]
}
HTTP 200
```

## 17. Log the same task again — 422 already done

```
$ curl -s -X POST -H content-type:\ application/json -d \{\"taskIds\":\[\"task-03\"\]\} http://127.0.0.1:4800/api/care-log
{
  "error": {
    "code": "unprocessable",
    "message": "batch rejected; nothing was logged",
    "problems": [
      {
        "id": "task-03",
        "reason": "already done"
      }
    ]
  }
}
HTTP 422
```

## 18. Wrong method on a read route — 405

```
$ curl -s -X DELETE http://127.0.0.1:4800/api/plants
{
  "error": {
    "code": "method_not_allowed",
    "message": "GET only"
  }
}
HTTP 405
```

## 19. Static demo page — GET /

```
$ curl -s -D - -o /dev/null http://127.0.0.1:4800/
HTTP/1.1 200 OK
content-type: text/html; charset=utf-8
cache-control: no-store
Date: Fri, 28 Aug 2026 19:51:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

```

## 20. Pack asset served for the page — GET /pack/wc/vd-plant-card.mjs

```
$ curl -s -D - -o /dev/null http://127.0.0.1:4800/pack/wc/vd-plant-card.mjs
HTTP/1.1 200 OK
content-type: text/javascript; charset=utf-8
cache-control: no-store
Date: Fri, 28 Aug 2026 19:51:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

```

## 21. CORS preflight — OPTIONS /api/care-log

```
$ curl -s -D - -o /dev/null -X OPTIONS http://127.0.0.1:4800/api/care-log
HTTP/1.1 204 No Content
access-control-allow-origin: *
access-control-allow-methods: GET, POST, OPTIONS
access-control-allow-headers: content-type
Date: Fri, 28 Aug 2026 19:51:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5

```

