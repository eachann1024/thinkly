const task = await taskSpace(57);
const page = task.page("p1");
await page.click('loc=role:button[name="卷卷"]');
await page.click('text="就选它"');
await page.waitForTimeout(900);
console.log(await page.snapshot());
