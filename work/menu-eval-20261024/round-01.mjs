const task = await taskSpace("thinkly-menu-browser-eval-20261024");
const page = task.page("p1");
await page.goto("http://localhost:6037");
console.log({spaceId: task.spaceId, name: task.name, url: await page.url(), title: await page.title()});
console.log(await page.snapshot());
