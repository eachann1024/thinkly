const task = await taskSpace(57);
const page = task.page("p1");
await page.click("@2");
await page.click("@9");
await page.waitForTimeout(700);
console.log(await page.snapshot());
