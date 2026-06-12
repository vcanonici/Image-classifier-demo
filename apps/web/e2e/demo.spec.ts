import { expect, test } from "@playwright/test";

test("loads the demo and responds to drawing", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Rede neural MNIST em tempo real" }),
  ).toBeVisible();
  const canvas = page.getByLabel("Área para desenhar um dígito de zero a nove");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("Drawing canvas is not visible");
  }
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.8, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText(/% de confiança/)).toBeVisible();
  await expect(page.getByRole("img", { name: "Diagrama das ativações da rede neural" })).toBeVisible();
});
