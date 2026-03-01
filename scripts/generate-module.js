#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// Функция для замены плейсхолдеров в содержимом
function replacePlaceholders(content, name, pascalName, camelName) {
  return content
    .replace(/{{name}}/g, name)
    .replace(/{{pascalCase name}}/g, pascalName)
    .replace(/{{camelCase name}}/g, camelName);
}

// Конвертация имени в PascalCase
function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

// Конвертация в camelCase
function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1).replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

async function main() {
  const name = await askQuestion('Имя модуля (например: books): ');
  if (!name) {
    console.error('❌ Имя модуля не может быть пустым');
    process.exit(1);
  }

  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);

  const templateDir = path.join(__dirname, '..', 'templates', 'module');
  const targetDir = path.join(__dirname, '..', 'src', 'modules', name);

  // Проверяем, существует ли уже модуль
  try {
    await fs.access(targetDir);
    console.error(`❌ Модуль ${name} уже существует`);
    process.exit(1);
  } catch {
    // Ок, не существует
  }

  // Создаём целевую папку
  await fs.mkdir(targetDir, { recursive: true });

  // Читаем все файлы из шаблона
  const templateFiles = await fs.readdir(templateDir);

  for (const file of templateFiles) {
    if (!file.endsWith('.hbs')) continue;

    const templatePath = path.join(templateDir, file);
    const content = await fs.readFile(templatePath, 'utf-8');

    // Заменяем плейсхолдеры
    const newContent = replacePlaceholders(content, name, pascalName, camelName);

    // Формируем имя целевого файла (убираем .hbs и заменяем {{name}})
    let targetFileName = file.replace('.hbs', '').replace(/{{name}}/g, name);
    targetFileName = targetFileName.replace(/{{pascalCase name}}/g, pascalName);
    targetFileName = targetFileName.replace(/{{camelCase name}}/g, camelName);

    const targetPath = path.join(targetDir, targetFileName);
    await fs.writeFile(targetPath, newContent);
    console.log(`✅ Создан ${targetFileName}`);
  }

  console.log(`\n🎉 Модуль ${name} успешно создан в src/modules/${name}`);
  rl.close();
}

main().catch((err) => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});