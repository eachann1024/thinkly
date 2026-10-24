const task = await taskSpace(57);
const page = task.page("p1");
console.log(await page.snapshot());
