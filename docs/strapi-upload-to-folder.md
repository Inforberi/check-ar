# Загрузка AR-моделей сразу в папку Media Library (Strapi)

Эндпоинт: **POST** `/api/upload-models/upload-to-folder`.  
Если получаешь **405 Method Not Allowed** — в Strapi маршрут должен быть именно **method: 'POST'** и **path: '/upload-to-folder'** (см. ниже).

## 1. Структура в проекте Strapi (strapi-ms)

### `src/api/upload-models/routes/upload-models.js`

```js
'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/upload-to-folder',
      handler: 'upload-models.uploadToFolder',
    },
  ],
};
```

**Важно:** метод обязательно **POST**; путь **/upload-to-folder** (без префикса `upload-models` — Strapi сам добавит `/api/upload-models`). Итоговый URL: `POST /api/upload-models/upload-to-folder`.

### `src/api/upload-models/controllers/upload-models.js`

```js
'use strict';

module.exports = {
  async uploadToFolder(ctx) {
    const { files } = ctx.request;
    if (!files?.android?.[0] || !files?.ios?.[0]) {
      return ctx.badRequest('Need multipart fields: android (file), ios (file), folderId (string)');
    }
    const folderId = Number(ctx.request.body?.folderId);
    if (Number.isNaN(folderId) || folderId <= 0) {
      return ctx.badRequest('folderId must be a positive number');
    }

    const uploadService = strapi.plugin('upload').service('upload');

    const uploadOne = async (file) => {
      const uploaded = await uploadService.upload({
        data: {},
        files: file,
      });
      const fileEntity = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      const id = fileEntity?.id;
      if (typeof id !== 'number') {
        throw new Error('Upload response missing file id');
      }
      await strapi.entityService.update('plugin::upload.file', id, {
        data: { folder: folderId },
      });
      return id;
    };

    const androidId = await uploadOne(files.android[0]);
    const iosId = await uploadOne(files.ios[0]);

    ctx.body = { androidId, iosId };
  },
};
```

## 2. Проверка в Strapi

- В `upload-models.js` в `routes` у элемента с path `'/upload-to-folder'` должно быть **method: 'POST'** (не GET).
- После правок перезапусти Strapi.

## 3. Env в Next.js

```env
STRAPI_UPLOAD_FOLDER_ID=577
```
