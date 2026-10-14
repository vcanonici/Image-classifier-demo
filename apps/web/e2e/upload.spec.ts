import { expect, test } from "@playwright/test";

test("carrega duas imagens coloridas e usa os píxeis, não o nome, para classificar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Carregar imagens" })).toBeVisible();

  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas não disponível");
    }
    context.fillStyle = "#FDE68A";
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = "#5B21B6";
    context.lineWidth = 14;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(64, 20);
    context.lineTo(64, 108);
    context.stroke();
    return canvas.toDataURL("image/png").split(",")[1];
  });

  const buffer = Buffer.from(png, "base64");
  await page.getByLabel("Carregar imagens de dígitos").setInputFiles([
    { name: "digito_1.png", mimeType: "image/png", buffer },
    { name: "digito_9.png", mimeType: "image/png", buffer },
  ]);

  await expect(page.getByText(/2 imagem\(ns\) classificadas/)).toBeVisible();
  const results = page.locator(".upload-result");
  await expect(results).toHaveCount(2);
  const first = await results.nth(0).locator(".upload-prediction strong").textContent();
  const second = await results.nth(1).locator(".upload-prediction strong").textContent();
  expect(first).toMatch(/^[0-9]$/);
  expect(second).toBe(first);

  await results.nth(1).click();
  await expect(results.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Imagem carregada: digito_9.png")).toBeVisible();
  await expect(page.getByRole("img", { name: "Diagrama das ativações da rede neural" })).toBeVisible();
});

test("rejeita ficheiros que não são imagens", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Carregar imagens de dígitos").setInputFiles({
    name: "texto.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("nao e uma imagem"),
  });
  await expect(page.getByRole("alert")).toContainText("Formato não suportado");
});
