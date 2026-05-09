# SEO Description Generator

Тестовое задание для позиции AI-разработчик / LLM-инженер: NestJS endpoint вызывает Flowise Prediction API и стримит результат генерации SEO-описания товара.

## Что реализовано

- `POST /api/generate-seo`
- входные поля: `product_name`, `category`, `keywords`
- вызов Flowise `POST /api/v1/prediction/:id`
- streaming mode через `streaming: true`
- runtime variables через `overrideConfig.vars`
- NDJSON-стрим наружу: `token`, затем финальный `result`
- обработка ошибок: таймаут, пустой ответ LLM, невалидный JSON/schema mismatch
- локальная валидация входа и финального JSON

Актуальные детали Flowise API сверены с документацией:

- Prediction API: https://docs.flowiseai.com/using-flowise/prediction
- Streaming: https://docs.flowiseai.com/using-flowise/streaming
- Variables: https://docs.flowiseai.com/using-flowise/variables

## Быстрый запуск

```bash
cp .env.example .env
npm install
npm run start:dev
```

`.env`:

```bash
PORT=3000
FLOWISE_BASE_URL=http://localhost:3001
FLOWISE_CHATFLOW_ID=your-chatflow-id
FLOWISE_API_KEY=
FLOWISE_TIMEOUT_MS=30000
```

Пример запроса:

```bash
curl -N -X POST http://localhost:3000/api/generate-seo \
  -H "content-type: application/json" \
  -d '{
    "product_name": "Кофемолка Burr Pro",
    "category": "Кофе и аксессуары",
    "keywords": ["кофемолка", "жерновая кофемолка", "для эспрессо"]
  }'
```

Пример стрима:

```jsonl
{"type":"token","data":"{\"title\":\"..."}
{"type":"token","data":"...\"}"}
{"type":"result","data":{"title":"...","meta_description":"...","h1":"...","description":"...","bullets":["..."]}}
```

Ошибки также приходят в стриме:

```jsonl
{"type":"error","data":{"code":"INVALID_LLM_JSON","message":"LLM response is not valid JSON"}}
```

## Flowise chatflow

В папке `flowise/` лежат:

- `prompt-template.md` — готовый prompt template с переменными `{{$vars.product_name}}`, `{{$vars.category}}`, `{{$vars.keywords}}`
- `structured-output-schema.json` — JSON schema для Structured Output Parser
- `chatflow-blueprint.json` — читаемый blueprint flow, чтобы быстро собрать/проверить схему

Схема в Flowise:

```text
Chat Input -> Prompt Template -> Chat Model -> LLM Chain -> Structured Output Parser -> Chat Output
```

В настройках чатфлоу нужно включить override для variables, иначе `overrideConfig.vars` будет игнорироваться Flowise по соображениям безопасности.

## Почему такие параметры

- `temperature: 0.3`: SEO-тексту нужна вариативность, но JSON-форма и мета-описание должны быть стабильными. Более высокая температура чаще ломает формат.
- Structured Output Parser: формат `{ title, meta_description, h1, description, bullets }` является контрактом API, поэтому лучше заставлять модель следовать схеме на уровне Flowise и дополнительно валидировать в NestJS.
- Без чанкинга/RAG: задача не использует внешнюю базу знаний или длинные документы. Вход помещается в один prompt, поэтому чанкинг добавил бы лишнюю сложность и риск потери контекста.
- `meta_description` ограничен 50-180 символами локально: это практичный SEO-диапазон, а не только свободная рекомендация модели.
- `keywords` ограничены 12 значениями: защищает prompt от перегруза и prompt injection через чрезмерно длинный список.

## Edge cases

- Flowise недоступен или вернул non-2xx: `FLOWISE_REQUEST_FAILED`
- запрос дольше `FLOWISE_TIMEOUT_MS`: `FLOWISE_TIMEOUT`
- LLM вернула пустой ответ: `EMPTY_LLM_RESPONSE`
- LLM вернула текст не в JSON: `INVALID_LLM_JSON`
- JSON есть, но не соответствует контракту: `INVALID_LLM_JSON`
- `keywords` можно передать массивом или строкой через запятую

## Тесты

```bash
npm test
```

Тесты покрывают парсинг валидного JSON, fenced JSON, пустой ответ, битый JSON и mismatch схемы.
