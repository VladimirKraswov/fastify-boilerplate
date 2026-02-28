export default function (plop) {
  plop.setGenerator('module', {
    description: 'Создать новый модуль',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Имя модуля (например: products)'
      }
    ],
    actions: [
      {
        type: 'addMany',
        destination: 'src/modules/{{name}}',
        templateFiles: 'plop-templates/module/*.hbs',
        base: 'plop-templates/module',
        data: { name: '{{name}}' }
      }
    ]
  });
}
