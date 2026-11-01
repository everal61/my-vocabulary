# My Vocabulary

Личный словарь английских слов и офлайн-тренажёр переводов.

## Локальный запуск

```bash
npm install
npm run dev
```

Открой адрес, который Vite покажет в терминале (обычно http://localhost:5173).

## Сборка

```bash
npm run build
```

## Публикация

Проект настроен для GitHub Pages в репозитории `everal61/my-vocabulary`. Workflow находится в `.github/workflows/deploy.yml`.

В GitHub открой Settings → Pages и выбери **GitHub Actions** в разделе Build and deployment. После push в ветку `main` публикация запустится автоматически.

## Данные

Слова и рекорд хранятся локально в IndexedDB браузера. Регулярно экспортируй JSON через кнопку со стрелкой вниз в словаре.
